/**
 * 集成测试：验证引擎各组件串起来后的端到端数据流。
 *
 * 不依赖 MediaPipe 与 DOM（PoseDetector / CanvasRenderer 需浏览器环境，
 * 这里以「纯逻辑链路」方式复现 PoseEngine.processRepFrame 的核心流程），
 * 验证：平滑 → 门控 → 计数 → 规则 → 计分 → 汇总 的协作正确性。
 */

import { LandmarkSmoother } from '../src/engine/smoother';
import { ConfidenceGate } from '../src/engine/confidenceGate';
import { RepCounter } from '../src/engine/repCounter';
import { RuleEngine } from '../src/engine/ruleEngine';
import { ScoringEngine } from '../src/engine/scoringEngine';
import { squatConfig } from '../src/exercises/squat';
import { calcJointAngle } from '../src/engine/angleCalculator';
import { PASS_SCORE } from '../src/constants/config';
import type { Landmark } from '../src/types/pose';
import type { RuleViolation } from '../src/types/training';

interface TestResult { name: string; pass: boolean; detail: string; }
const results: TestResult[] = [];
let suiteName = '';

function suite(n: string): void { suiteName = n; }
function test(name: string, fn: () => void): void {
  try { fn(); results.push({ name: `${suiteName} > ${name}`, pass: true, detail: 'ok' }); }
  catch (e) { results.push({ name: `${suiteName} > ${name}`, pass: false, detail: e instanceof Error ? e.message : String(e) }); }
}
function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }
function assertEqual<T>(a: T, e: T, m: string): void {
  if (a !== e) throw new Error(`${m} (expected=${String(e)}, actual=${String(a)})`);
}

const ASPECT = 16 / 9;
function px(x: number, y: number, v = 1): Landmark { return { x: x / ASPECT, y, z: 0, visibility: v }; }

/** 由膝角构造 33 点姿态 */
function poseForKneeAngle(angleDeg: number, kneeVisibility = 1): Landmark[] {
  const hip = px(0, 0);
  const knee = px(0, 1, kneeVisibility);
  const rad = (angleDeg * Math.PI) / 180;
  const ankle = px(Math.sin(rad), 1 - Math.cos(rad));
  const arr: Landmark[] = [];
  for (let i = 0; i < 33; i += 1) arr.push(px(0.5, 0.5));
  arr[23] = hip; arr[25] = knee; arr[27] = ankle;
  return arr;
}

suite('T2.6 引擎端到端集成');

test('完整深蹲 → 计数 1 + 评分在 [0,100] + 汇总正确', () => {
  const smoother = new LandmarkSmoother(1); // alpha=1 关闭平滑，保证角度精确
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  const re = new RuleEngine(squatConfig, gate);
  const sc = new ScoringEngine(squatConfig.scoring);

  const repRecords: Array<{ score: number; pass: boolean }> = [];
  let currentRepViolations: RuleViolation[] = [];
  let lastRepEnd = 0;
  let t = 0;

  const feed = (angle: number, isBottom = false): void => {
    t += 200;
    const lms = smoother.smooth(poseForKneeAngle(angle));
    const state = rc.update(lms, t);
    // 底部帧用 bottom 阶段评估规则
    const phase = isBottom ? 'bottom' : state.phase;
    const violations = re.evaluate(lms, phase, t);
    for (const v of violations) {
      if (!currentRepViolations.some((x) => x.ruleId === v.ruleId)) currentRepViolations.push(v);
    }
    if (state.repJustCompleted) {
      const score = sc.scoreRep(currentRepViolations);
      repRecords.push({ score, pass: score >= PASS_SCORE });
      currentRepViolations = [];
      lastRepEnd = t;
    }
  };

  // 一次标准深蹲：站立→下蹲→底部→起身→站立
  feed(180);
  feed(140);
  feed(85, true);
  feed(140);
  feed(180);

  assertEqual(rc.getCount(), 1, '应计 1 次');
  assertEqual(repRecords.length, 1, '应记录 1 个 rep');
  assert(repRecords[0].score >= 0 && repRecords[0].score <= 100, '评分应在 0-100');
  assertEqual(repRecords[0].pass, repRecords[0].score >= PASS_SCORE, 'pass 标志与分数线一致');
  assert(lastRepEnd > 0, '应记录 rep 结束时间');
});

test('下蹲深度不足（未达 bottom 区间）→ 不计数（防抖正确）', () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);

  // 底部只到 130°：落在 descending[100,160] 区间，从未进入 bottom[0,100]
  // → 状态机应拒绝计数（未经过 requiredIntermediatePhase）
  let t = 0;
  const seq = [180, 150, 130, 150, 180];
  for (const angle of seq) {
    t += 200;
    rc.update(smoother.smooth(poseForKneeAngle(angle)), t);
  }
  assertEqual(rc.getCount(), 0, '未达 bottom 区间不应计数（防抖）');
});

test('到达 bottom 且膝角过深(50°) → 计数 + 触发违规扣分', () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  const re = new RuleEngine(squatConfig, gate);
  const sc = new ScoringEngine(squatConfig.scoring);

  // 底部到 50°：在 bottom[0,100] 内（计数成功），且 < knee-depth 下限 70 → 触发违规
  let t = 0;
  let violationsAtBottom: RuleViolation[] = [];
  let currentRepViolations: RuleViolation[] = [];
  let score = 100;
  const seq: Array<[number, boolean]> = [[180, false], [150, false], [50, true], [150, false], [180, false]];
  for (const [angle, bottom] of seq) {
    t += 200;
    const lms = smoother.smooth(poseForKneeAngle(angle));
    const st = rc.update(lms, t);
    const v = re.evaluate(lms, bottom ? 'bottom' : st.phase, t);
    if (bottom) violationsAtBottom = v;
    for (const x of v) {
      if (!currentRepViolations.some((y) => y.ruleId === x.ruleId)) currentRepViolations.push(x);
    }
    if (st.repJustCompleted) {
      score = sc.scoreRep(currentRepViolations);
      currentRepViolations = [];
    }
  }
  assertEqual(rc.getCount(), 1, '到达 bottom 区间应计数 1');
  assert(violationsAtBottom.some((v) => v.ruleId === 'knee-depth'), '膝角 50° 应触发 knee-depth');
  const kd = violationsAtBottom.find((v) => v.ruleId === 'knee-depth')!;
  assertEqual(kd.message, '蹲得太低了，注意膝盖', '应给出「蹲太低」文案');
  assert(score < 100, `违规应扣分 (score=${score})`);
});

test('低可见度整段 → 门控跳过，不计数不违规', () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  const re = new RuleEngine(squatConfig, gate);

  let t = 0;
  let anyViolation = false;
  for (const angle of [180, 140, 85, 140, 180]) {
    t += 200;
    // 膝点可见度 0.2（低于 0.5 阈值）
    const lms = smoother.smooth(poseForKneeAngle(angle, 0.2));
    rc.update(lms, t);
    if (re.evaluate(lms, 'bottom', t).length > 0) anyViolation = true;
  }
  assertEqual(anyViolation, false, '低可见度不应产生违规');
  assertEqual(rc.getCount(), 0, '低可见度不应计数');
});

test('平滑器有效抑制抖动（输出介于前后帧之间）', () => {
  const smoother = new LandmarkSmoother(0.4);
  const flat: Landmark[] = [];
  for (let i = 0; i < 33; i += 1) flat.push(px(0.5, 0.5));
  smoother.smooth(flat); // 建立基线
  const jumped: Landmark[] = [];
  for (let i = 0; i < 33; i += 1) jumped.push(px(0.9, 0.9));
  const out = smoother.smooth(jumped);
  // alpha=0.4：输出 = 0.4*0.9 + 0.6*0.5 = 0.66（归一化 x/y 前）
  assert(out[5].y > 0.5 && out[5].y < 0.9, `平滑输出应介于 0.5~0.9，实得 ${out[5].y}`);
});

test('角度计算闭环：由姿态反算角度≈目标值', () => {
  for (const target of [90, 120, 160, 45]) {
    const lms = poseForKneeAngle(target);
    const got = calcJointAngle(lms, { a: 23, b: 25, c: 27 });
    assert(Math.abs(got - target) <= 2, `目标 ${target}°，实得 ${got}°`);
  }
});

/* 输出 */
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log('\n========== 集成测试结果 ==========');
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
  if (!r.pass) console.log(`      └─ ${r.detail}`);
}
console.log(`集成总计: ${results.length} | 通过: ${passed} | 失败: ${failed}`);
console.log('=================================\n');
if (failed > 0) process.exitCode = 1;
