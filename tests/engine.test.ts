/**
 * 核心引擎单元测试（QA 严过关编写）。
 *
 * 覆盖：
 * - T2.1 角度计算 angleCalculator
 * - T2.2 状态机计数 repCounter（深蹲序列 + 防抖）
 * - T2.3 规则引擎 ruleEngine
 * - T2.4 语音去重 feedbackManager
 * - T2.5 评分引擎 scoringEngine
 * - T3   扩展性（注册表 / 配置驱动）
 *
 * 运行方式：esbuild 打包后由 node 执行，见 tests/run-tests.mjs。
 * 不依赖任何测试框架，自带极简 assert 收集器。
 */

import { calcAngle, calcJointAngle, calcVerticalAngle, calcHorizontalDistance } from '../src/engine/angleCalculator';
import { ConfidenceGate } from '../src/engine/confidenceGate';
import { RepCounter } from '../src/engine/repCounter';
import { RuleEngine } from '../src/engine/ruleEngine';
import { ScoringEngine } from '../src/engine/scoringEngine';
import { FeedbackManager } from '../src/engine/feedbackManager';
import { EXERCISE_REGISTRY, EXERCISE_LIST, getExercise, isExerciseId } from '../src/exercises/index';
import { squatConfig } from '../src/exercises/squat';
import { PAIRS, TRIPLES } from '../src/constants/landmarks';
import { isMirroredFacing, resolveFacing } from '../src/utils/cameraFacing';
import { isSameSettings } from '../src/hooks/useSpeech';
import type { Landmark } from '../src/types/pose';
import type { ExerciseConfig } from '../src/types/exercise';

/* ------------------------------------------------------------------ */
/* 极简测试框架                                                        */
/* ------------------------------------------------------------------ */

interface TestResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];
let currentSuite = '';

function suite(name: string): void {
  currentSuite = name;
}

function test(name: string, fn: () => void): void {
  const full = `${currentSuite} > ${name}`;
  try {
    fn();
    results.push({ name: full, pass: true, detail: 'ok' });
  } catch (err) {
    results.push({
      name: full,
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg} (expected=${String(expected)}, actual=${String(actual)})`);
  }
}

function assertApprox(actual: number, expected: number, tol: number, msg: string): void {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${msg} (expected≈${expected}±${tol}, actual=${actual})`);
  }
}

/* ------------------------------------------------------------------ */
/* 测试数据工厂                                                        */
/* ------------------------------------------------------------------ */

/** 构造一个关键点 */
function lm(x: number, y: number, visibility = 1): Landmark {
  return { x, y, z: 0, visibility };
}

/**
 * 构造 33 个关键点的姿态，全部默认可信；传入索引→点覆盖。
 * 坐标系：x 向右 0-1，y 向下 0-1。
 * 注意：angleCalculator 内部会把 x 乘以 aspectRatio(默认 16/9)，
 * 因此为让「像素空间」为正交，测试中若关心角度需按比例构造。
 */
function makeLandmarks(overrides: Record<number, Landmark> = {}): Landmark[] {
  const arr: Landmark[] = [];
  for (let i = 0; i < 33; i += 1) arr.push(lm(0.5, 0.5, 1));
  for (const k of Object.keys(overrides)) {
    arr[Number(k)] = overrides[Number(k)];
  }
  return arr;
}

/** 生成三点组成的「共线 / 直角 / 锐角」测试点（像素等比坐标） */
function pixel2landmark(px: number, py: number, visibility = 1): Landmark {
  // 反算归一化：x_norm = px / aspectRatio
  const aspect = 16 / 9;
  return lm(px / aspect, py, visibility);
}

/* ================================================================== */
/* T2.1 角度计算                                                       */
/* ================================================================== */

suite('T2.1 角度计算 (angleCalculator)');

test('三点共线 → 180°', () => {
  const a = pixel2landmark(0, 0);
  const b = pixel2landmark(1, 0);
  const c = pixel2landmark(2, 0);
  assertEqual(calcAngle(a, b, c), 180, '共线夹角应为 180°');
});

test('直角 → 90°', () => {
  const a = pixel2landmark(0, 0);
  const b = pixel2landmark(0, 1);
  const c = pixel2landmark(1, 1);
  assertEqual(calcAngle(a, b, c), 90, '直角应为 90°');
});

test('锐角 45°', () => {
  // 顶点在原点，一条边沿 +x，一条边沿 45° 方向 (1,1)
  const b = pixel2landmark(0, 0);
  const a = pixel2landmark(1, 0);
  const c = pixel2landmark(1, 1);
  assertApprox(calcAngle(a, b, c), 45, 1, '45° 夹角');
});

test('钝角 135°', () => {
  const b = pixel2landmark(0, 0);
  const a = pixel2landmark(1, 0);
  const c = pixel2landmark(-1, 1);
  assertApprox(calcAngle(a, b, c), 135, 1, '135° 夹角');
});

test('零长度向量 → 返回 0（不抛异常）', () => {
  const a = pixel2landmark(1, 1);
  const b = pixel2landmark(1, 1); // 与 a 重合
  const c = pixel2landmark(2, 2);
  assertEqual(calcAngle(a, b, c), 0, '退化输入应返回 0');
});

test('calcJointAngle 索引越界 → 返回 0', () => {
  const lms = makeLandmarks();
  const angle = calcJointAngle(lms, { a: 0, b: 99, c: 1 });
  assertEqual(angle, 0, '越界索引应返回 0');
});

test('calcJointAngle 正常取值', () => {
  const lms = makeLandmarks({
    23: pixel2landmark(0, 0),
    25: pixel2landmark(1, 0),
    27: pixel2landmark(2, 0),
  });
  // 故意用 LEFT_HIP/LEFT_KNEE/LEFT_ANKLE 的三点
  const angle = calcJointAngle(lms, TRIPLES.LEFT_KNEE);
  assertEqual(angle, 180, '髋-膝-踝共线应为 180°');
});

test('calcVerticalAngle 垂直向下 → 0°', () => {
  const a = pixel2landmark(0.5, 0);
  const b = pixel2landmark(0.5, 1);
  assertApprox(calcVerticalAngle(a, b), 0, 1, '竖直向下应为 0°');
});

test('calcVerticalAngle 水平 → 90°', () => {
  const a = pixel2landmark(0, 0.5);
  const b = pixel2landmark(1, 0.5);
  assertApprox(calcVerticalAngle(a, b), 90, 1, '水平方向应为 90°');
});

test('calcVerticalAngle 退化点 → 0', () => {
  const a = pixel2landmark(0.5, 0.5);
  const b = pixel2landmark(0.5, 0.5);
  assertEqual(calcVerticalAngle(a, b), 0, '重合点应返回 0');
});

test('calcHorizontalDistance 归一化 x 差值', () => {
  const a = lm(0.2, 0.5);
  const b = lm(0.7, 0.5);
  assertApprox(calcHorizontalDistance(a, b), 0.5, 1e-9, '水平距离');
});

test('角度结果恒在 [0,180] 且为整数', () => {
  const samples: Array<[Landmark, Landmark, Landmark]> = [
    [pixel2landmark(0, 0), pixel2landmark(1, 0), pixel2landmark(0, 1)],
    [pixel2landmark(3, 4), pixel2landmark(0, 0), pixel2landmark(-3, 4)],
    [pixel2landmark(0.1, 0.9), pixel2landmark(0.5, 0.5), pixel2landmark(0.9, 0.1)],
  ];
  for (const [a, b, c] of samples) {
    const angle = calcAngle(a, b, c);
    assert(angle >= 0 && angle <= 180, `角度越界: ${angle}`);
    assertEqual(angle, Math.round(angle), `角度应为整数: ${angle}`);
  }
});

/* ================================================================== */
/* T2.2 状态机计数                                                     */
/* ================================================================== */

suite('T2.2 状态机计数 (repCounter)');

/**
 * 用膝盖角构造 simulateLandmarks：
 * 通过给定「膝角」(髋-膝-踝) 反推踝点位置，使 calcJointAngle 得到该角度。
 * 简化：把髋放在 (x0, y0)，膝放在 (x0, y1)（膝角顶点=膝），
 * 踝绕膝旋转，使两条边夹角 = 目标角度。
 * 因为 x 会被乘 aspect，为得到像素正交结果，用 pixel2landmark。
 */
function kneeLandmarksForAngle(angleDeg: number): Landmark[] {
  const hip = pixel2landmark(0, 0); // 髋
  const knee = pixel2landmark(0, 1); // 膝（顶点）
  // 髋->膝 向量 = (0,-1) 像素；踝方向相对该向量旋转 angleDeg
  const rad = (angleDeg * Math.PI) / 180;
  // 参考向量 (0,-1)，顺时针旋转 rad
  const ax = Math.sin(rad);
  const ay = -Math.cos(rad);
  const ankle = pixel2landmark(0 + ax * 1, 1 + ay * 1);
  return makeLandmarks({
    23: hip,
    25: knee,
    27: ankle,
  });
}

test('深蹲序列 180→160→100→80→100→160→180 计 1 次', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  let t = 0;
  const seq = [180, 160, 100, 80, 100, 160, 180];
  let lastCount = 0;
  for (const angle of seq) {
    t += 40; // 每帧 40ms，全程 < 800ms 内完成，但只在回到 standing 时计数
    const state = rc.update(kneeLandmarksForAngle(angle), t);
    lastCount = state.repCount;
  }
  assertEqual(lastCount, 1, '完整深蹲序列应计数 1');
});

test('只下蹲不入底部 → 不计数（不经过中间阶段）', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  let t = 0;
  // 180 → 140（descending）→ 180，从未进入 bottom(≤100)
  const seq = [180, 140, 180, 140, 180];
  for (const angle of seq) {
    t += 200;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assertEqual(rc.getCount(), 0, '未经过底部阶段不应计数');
});

test('防抖：minRepIntervalMs 内第二次不计数', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  const seq = [180, 80, 180, 80, 180];
  let t = 0;
  for (const angle of seq) {
    t += 100; // 每帧 100ms，5 帧共 500ms < 800ms
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assertEqual(rc.getCount(), 1, '800ms 内不应重复计数');
});

test('防抖：超过间隔后第二次正常计数', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  let t = 0;
  // 第一组
  for (const angle of [180, 80, 180]) {
    t += 100;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  // 间隔 900ms
  t += 900;
  for (const angle of [80, 180]) {
    t += 100;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assertEqual(rc.getCount(), 2, '超过间隔后应计数第 2 次');
});

test('repJustCompleted 标志仅在完成帧为 true', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  let t = 0;
  const flags: boolean[] = [];
  for (const angle of [180, 80, 180, 180]) {
    t += 300;
    flags.push(rc.update(kneeLandmarksForAngle(angle), t).repJustCompleted);
  }
  assertEqual(flags[0], false, '站立帧不应标记完成');
  assertEqual(flags[1], false, '底部帧不应标记完成');
  assertEqual(flags[2], true, '回到站立帧应标记完成');
  assertEqual(flags[3], false, '重复站立帧不应再标记');
});

test('reset() 清零计数与阶段', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  let t = 0;
  for (const angle of [180, 80, 180]) {
    t += 300;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assert(rc.getCount() === 1, '重置前应有 1 次');
  rc.reset();
  assertEqual(rc.getCount(), 0, 'reset 后计数归零');
  assertEqual(rc.getPhase(), 'standing', 'reset 后回到 completePhase');
});

test('阶段标签可读（站立/底部）', () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter!, gate);
  let t = 0;
  rc.update(kneeLandmarksForAngle(180), (t += 10));
  assertEqual(rc.getPhaseLabel(), '站立', '站立阶段标签');
  rc.update(kneeLandmarksForAngle(80), (t += 10));
  assertEqual(rc.getPhaseLabel(), '底部', '底部阶段标签');
});

/* ================================================================== */
/* T2.3 规则引擎                                                       */
/* ================================================================== */

suite('T2.3 规则引擎 (ruleEngine)');

/** 构造一个「膝角为目标值、且其它点默认可信」的姿态 */
function squatPoseWithKneeAngle(angleDeg: number): Landmark[] {
  return kneeLandmarksForAngle(angleDeg);
}

test('阶段过滤：非 bottom 阶段 knee-depth 规则不生效', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  // standing 阶段，膝角 180 会让 knee-depth(<100 高于上限) 触发；但因 activePhases=['bottom'] 应被过滤
  const lms = squatPoseWithKneeAngle(180);
  const vStanding = engine.evaluate(lms, 'standing', 0);
  const hasKneeDepth = vStanding.some((v) => v.ruleId === 'knee-depth');
  assertEqual(hasKneeDepth, false, 'standing 阶段 knee-depth 不应触发');
});

test('bottom 阶段膝角过浅(160°) → 触发 messageHigh 文案', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(160);
  const violations = engine.evaluate(lms, 'bottom', 0);
  const v = violations.find((x) => x.ruleId === 'knee-depth');
  assert(v !== undefined, '膝角 160 > 上限 100 应触发 knee-depth');
  assertEqual(v!.message, '再蹲深一点，大腿到水平', '应给出「蹲太浅」提示');
  assertEqual(v!.severity, 'warn', '严重度应为 warn');
  assertEqual(v!.actualAngle, 160, '实测角度记录');
});

test('bottom 阶段膝角过深(50°) → 触发 messageLow 文案', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(50);
  const violations = engine.evaluate(lms, 'bottom', 0);
  const v = violations.find((x) => x.ruleId === 'knee-depth');
  assert(v !== undefined, '膝角 50 < 下限 70 应触发 knee-depth');
  assertEqual(v!.message, '蹲得太低了，注意膝盖', '应给出「蹲太低」提示');
});

test('bottom 阶段膝角在区间内(85°) → 无 knee-depth 违规', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(85);
  const violations = engine.evaluate(lms, 'bottom', 0);
  const v = violations.find((x) => x.ruleId === 'knee-depth');
  assertEqual(v, undefined, '区间内不应触发 knee-depth');
});

test('置信度门控：关键点 visibility<0.5 → 规则跳过', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(160);
  // 把膝点(25)可见度降到 0.2
  lms[25] = { ...lms[25], visibility: 0.2 };
  const violations = engine.evaluate(lms, 'bottom', 0);
  const v = violations.find((x) => x.ruleId === 'knee-depth');
  assertEqual(v, undefined, '低可见度点应被门控跳过');
});

test('关键点不足 33 → 返回空违规数组', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const violations = engine.evaluate(makeLandmarks().slice(0, 10), 'bottom', 0);
  assertEqual(violations.length, 0, '点数不足应返回空数组');
});

test('evaluateAll 忽略阶段（hold 模式用）', () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(160);
  const violations = engine.evaluateAll(lms, 0);
  const v = violations.find((x) => x.ruleId === 'knee-depth');
  assert(v !== undefined, 'evaluateAll 应忽略 activePhases 生效');
});

test('ConfidenceGate.isBodyDetected 需要 ≥8 个有效点', () => {
  const gate = new ConfidenceGate();
  const few = makeLandmarks();
  for (let i = 0; i < 33; i += 1) few[i] = { ...few[i], visibility: i < 5 ? 0.9 : 0.1 };
  assertEqual(gate.isBodyDetected(few), false, '5 个有效点应判定未检测到人体');
  const many = makeLandmarks();
  for (let i = 0; i < 33; i += 1) many[i] = { ...many[i], visibility: i < 8 ? 0.9 : 0.1 };
  assertEqual(gate.isBodyDetected(many), true, '8 个有效点应判定检测到人体');
});

/* ================================================================== */
/* T2.4 语音去重                                                       */
/* ================================================================== */

suite('T2.4 语音去重 (feedbackManager)');

/** 在 node 环境注入一个假的 speechSynthesis，用于记录播报 */
interface FakeSpeech {
  spoken: string[];
  cancelCount: number;
}
function installFakeSpeech(): FakeSpeech {
  const fake: FakeSpeech = { spoken: [], cancelCount: 0 };
  const g = globalThis as unknown as {
    window?: Record<string, unknown>;
    SpeechSynthesisUtterance?: unknown;
  };
  if (!g.window) g.window = {};
  (g.window as Record<string, unknown>).speechSynthesis = {
    speak(u: { text: string }) {
      fake.spoken.push(u.text);
    },
    cancel() {
      fake.cancelCount += 1;
    },
  };
  g.SpeechSynthesisUtterance = class {
    text: string;
    lang = 'en';
    volume = 1;
    rate = 1;
    constructor(text: string) {
      this.text = text;
    }
  };
  return fake;
}

test('同文案 3s 内不重复播报', () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3000);
  assertEqual(fm.speak('再蹲深一点', 1000), true, '首次应播报');
  assertEqual(fm.speak('再蹲深一点', 2000), false, '1s 后同文案应被去重');
  assertEqual(fm.speak('再蹲深一点', 3999), false, '2999ms 内应去重');
  assertEqual(fm.speak('再蹲深一点', 4000), true, '恰好 3000ms 后应可再播');
});

test('不同文案互不去重', () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3000);
  assertEqual(fm.speak('文案A', 1000), true, 'A 首播');
  assertEqual(fm.speak('文案B', 1100), true, 'B 不同文案应可播');
});

test('submit 按 error 优先于 warn', () => {
  const fake = installFakeSpeech();
  const fm = new FeedbackManager(3000);
  const spoken = fm.submit(
    [
      { ruleId: 'w1', label: 'w', severity: 'warn', message: '警告文案', actualAngle: 1, targetRange: [0, 1], timestampMs: 10 },
      { ruleId: 'e1', label: 'e', severity: 'error', message: '严重文案', actualAngle: 1, targetRange: [0, 1], timestampMs: 20 },
    ],
    1000,
  );
  assertEqual(spoken, '严重文案', 'error 应优先播报');
  assertEqual(fake.spoken[0], '严重文案', '实际播报 error 文案');
});

test('submit 空违规 → 返回 null 不播报', () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3000);
  assertEqual(fm.submit([], 1000), null, '空列表应返回 null');
});

test('禁用后不播报', () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3000);
  fm.setEnabled(false);
  assertEqual(fm.speak('静音', 1000), false, '禁用后应返回 false');
});

test('forceSpeak 忽略去重', () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3000);
  assertEqual(fm.speak('入场', 1000), true, '首播');
  assertEqual(fm.speak('入场', 1100), false, '去重生效');
  assertEqual(fm.forceSpeak('入场', 1200), true, 'forceSpeak 应忽略去重');
});

test('音量/语速钳制到合法区间', () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3000);
  fm.setVolume(5);
  fm.setRate(9);
  // 通过再播报一次不抛异常；内部值需合法。用反射读取私有字段验证。
  const anyFm = fm as unknown as { volume: number; rate: number };
  assertEqual(anyFm.volume, 1, '音量上限 1');
  assertEqual(anyFm.rate, 2, '语速上限 2');
  fm.setVolume(-1);
  fm.setRate(0.1);
  assertEqual(anyFm.volume, 0, '音量下限 0');
  assertEqual(anyFm.rate, 0.5, '语速下限 0.5');
});

/* ================================================================== */
/* T2.5 评分引擎                                                       */
/* ================================================================== */

suite('T2.5 评分引擎 (scoringEngine)');

test('无违规 → 满分', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.scoreRep([]), 100, '无违规应为 100');
});

test('1 个 error 扣 12 分', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  const v = [{ ruleId: 'a', label: 'a', severity: 'error' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  assertEqual(se.scoreRep(v), 88, 'error 扣 12');
});

test('1 个 warn 扣 6 分', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  const v = [{ ruleId: 'a', label: 'a', severity: 'warn' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  assertEqual(se.scoreRep(v), 94, 'warn 扣 6');
});

test('多违规叠加且不低于 minScore', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  const mk = (sev: 'error' | 'warn') => ({ ruleId: 'x', label: 'x', severity: sev, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 });
  const many = [mk('error'), mk('error'), mk('error'), mk('error'), mk('error'), mk('error'), mk('error'), mk('error'), mk('error'), mk('error')];
  assertEqual(se.scoreRep(many), 0, '扣分过多应钳制到 minScore=0');
});

test('scoreHold = baseScore * passRate', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.scoreHold(0.8), 80, '达标率 0.8 → 80 分');
  assertEqual(se.scoreHold(1), 100, '达标率 1 → 100');
  assertEqual(se.scoreHold(0), 0, '达标率 0 → 0');
});

test('scoreHold 非法达标率（NaN/超范围）被钳制', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.scoreHold(NaN), 0, 'NaN → 0');
  assertEqual(se.scoreHold(2), 100, '>1 钳制到 1');
  assertEqual(se.scoreHold(-1), 0, '<0 钳制到 0');
});

/* ------------------------------------------------------------------ */
/* T2.6 权重扣分（传入 rules 时启用）                                  */
/* ------------------------------------------------------------------ */

suite('T2.6 权重扣分 (weighted scoring)');

test('未传 rules 时保持固定扣分（向后兼容）', () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.isWeighted(), false, '不传 rules 应为固定扣分模式');
  const v = [{ ruleId: 'knee-depth', label: 'a', severity: 'warn' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  assertEqual(se.scoreRep(v), 94, '仍按 warnPenalty=6 扣');
});

test('传 rules 时进入加权模式', () => {
  const se = new ScoringEngine(squatConfig.scoring, squatConfig.rules);
  assertEqual(se.isWeighted(), true, '传 rules 应启用加权');
  assertEqual(se.scoreRep([]), 100, '无违规仍是满分');
});

test('权重高的规则扣分多于权重低的规则', () => {
  const se = new ScoringEngine(squatConfig.scoring, squatConfig.rules);
  const mk = (ruleId: string) => [{ ruleId, label: ruleId, severity: 'error' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  // 深蹲权重：knee-depth 30 / hip-angle 25 / torso-lean 25 / knee-valgus 20
  const heavy = se.scoreRep(mk('knee-depth')); // weight 30
  const light = se.scoreRep(mk('knee-valgus')); // weight 20
  assertEqual(heavy < light, true, `权重 30 扣分应多于权重 20（实际 ${heavy} < ${light}）`);
});

test('同权重规则扣分相同', () => {
  const se = new ScoringEngine(squatConfig.scoring, squatConfig.rules);
  const mk = (ruleId: string) => [{ ruleId, label: ruleId, severity: 'error' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  // hip-angle 25 与 torso-lean 25 同权重
  assertEqual(se.scoreRep(mk('hip-angle')), se.scoreRep(mk('torso-lean')), '同权重扣分应一致');
});

test('error 扣分重于 warn（同权重下）', () => {
  const se = new ScoringEngine(squatConfig.scoring, squatConfig.rules);
  const err = [{ ruleId: 'knee-depth', label: 'a', severity: 'error' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  const warn = [{ ruleId: 'knee-depth', label: 'a', severity: 'warn' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  assertEqual(se.scoreRep(err) < se.scoreRep(warn), true, 'error 应比 warn 扣得多');
});

test('深蹲 4 条规则全中：扣分总量与历史固定算法同量级', () => {
  const se = new ScoringEngine(squatConfig.scoring, squatConfig.rules);
  const all = squatConfig.rules.map((r) => ({
    ruleId: r.id,
    label: r.label,
    severity: r.severity,
    message: '',
    actualAngle: 0,
    targetRange: [0, 1] as [number, number],
    timestampMs: 0,
  }));
  const score = se.scoreRep(all);
  // 历史固定算法：error 12×2 + warn 6×2 = 36 → 64 分。加权后应贴近这个量级（±8）
  assertEqual(Math.abs(score - 64) <= 8, true, `全违规得分为 ${score}，应接近历史 64 分（±8）`);
});

test('未知 ruleId 退回平均权重，不被当成 0 扣分', () => {
  const se = new ScoringEngine(squatConfig.scoring, squatConfig.rules);
  const v = [{ ruleId: 'not-in-config', label: 'x', severity: 'error' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  assertEqual(se.scoreRep(v) < 100, true, '未知规则仍应扣分');
});

test('权重全为 0 的脏配置退回固定扣分', () => {
  const zeroRules = squatConfig.rules.map((r) => ({ ...r, weight: 0 }));
  const se = new ScoringEngine(squatConfig.scoring, zeroRules);
  assertEqual(se.isWeighted(), false, '总权重为 0 应退回固定模式');
  const v = [{ ruleId: 'knee-depth', label: 'a', severity: 'warn' as const, message: '', actualAngle: 0, targetRange: [0, 1] as [number, number], timestampMs: 0 }];
  assertEqual(se.scoreRep(v), 94, '应回到 warnPenalty=6');
});

/* ------------------------------------------------------------------ */
/* T2.7 摄像头朝向与镜像（纯函数）                                     */
/* ------------------------------------------------------------------ */

suite('T2.7 摄像头朝向与镜像 (cameraFacing)');

test('getSettings 报 environment → 后置且不镜像', () => {
  assertEqual(resolveFacing('environment', undefined), 'environment', '应判定为后置');
  assertEqual(isMirroredFacing('environment'), false, '后置不应镜像');
});

test('getSettings 报 user → 前置且镜像', () => {
  assertEqual(resolveFacing('user', undefined), 'user', '应判定为前置');
  assertEqual(isMirroredFacing('user'), true, '前置应镜像');
});

test('facingMode 缺失时按 label 关键词判定后置', () => {
  assertEqual(resolveFacing(undefined, 'HD Back Camera'), 'environment', 'Back → 后置');
  assertEqual(resolveFacing(undefined, '后置摄像头'), 'environment', '中文后置 → 后置');
  assertEqual(isMirroredFacing(resolveFacing(undefined, 'Rear Camera')), false, 'Rear 不镜像');
});

test('facingMode 缺失时按 label 关键词判定前置', () => {
  assertEqual(resolveFacing(undefined, 'FaceTime HD Camera'), 'user', 'FaceTime → 前置');
  assertEqual(resolveFacing(undefined, '前置摄像头'), 'user', '中文前置 → 前置');
  assertEqual(isMirroredFacing(resolveFacing(undefined, 'Front Camera')), true, '前置镜像');
});

test('无法判定时返回 unknown 但默认镜像（笔记本前置居多）', () => {
  assertEqual(resolveFacing(undefined, 'USB2.0 UVC PC Camera'), 'unknown', '普通外接摄像头 → unknown');
  assertEqual(resolveFacing(undefined, undefined), 'unknown', '无信息 → unknown');
  assertEqual(isMirroredFacing('unknown'), true, 'unknown 默认镜像');
});

test('label 同时含前后置关键词时判为 unknown，避免误判', () => {
  assertEqual(resolveFacing(undefined, 'Front Back Dual Camera'), 'unknown', '冲突关键词 → unknown');
});

/* ------------------------------------------------------------------ */
/* T2.8 语音设置写盘判定（挂载不写）                                   */
/* ------------------------------------------------------------------ */

suite('T2.8 语音设置写盘判定 (isSameSettings)');

test('相同设置判定为等价（挂载时应跳过写入）', () => {
  const a = { enabled: true, volume: 1, rate: 1.05 };
  assertEqual(isSameSettings(a, { ...a }), true, '同值对象应等价');
});

test('任一字段变化都判定为不等价（需要写入）', () => {
  const base = { enabled: true, volume: 1, rate: 1.05 };
  assertEqual(isSameSettings(base, { ...base, enabled: false }), false, 'enabled 变化');
  assertEqual(isSameSettings(base, { ...base, volume: 0.5 }), false, 'volume 变化');
  assertEqual(isSameSettings(base, { ...base, rate: 1.5 }), false, 'rate 变化');
});

test('浮点音量差异也能识别', () => {
  assertEqual(
    isSameSettings({ enabled: true, volume: 0.7, rate: 1 }, { enabled: true, volume: 0.69, rate: 1 }),
    false,
    '0.7 与 0.69 不应等价',
  );
});

/* ================================================================== */
/* T3 扩展性验证                                                       */
/* ================================================================== */

suite('T3 扩展性验证');

test('注册表含手写 5 动作 + 71 库动作', () => {
  const ids = Object.keys(EXERCISE_REGISTRY);
  // 手写旗舰动作全部在位
  for (const core of ['squat', 'pushup', 'plank', 'pulldown', 'benchpress']) {
    assertEqual(ids.includes(core), true, `注册表应含 ${core}`);
  }
  // 总数 = 5 手写 + 71 库（去掉 deadlift 标记不可用仍在注册表）− 与 benchpress-v7 重复项
  assertEqual(EXERCISE_LIST.length >= 70, true, `动作列表应有 70+ 项，实际 ${EXERCISE_LIST.length}`);
});

test('库动作与手写动作不重复注册', () => {
  const ids = Object.keys(EXERCISE_REGISTRY);
  const unique = new Set(ids);
  assertEqual(unique.size, ids.length, 'id 不应重复');
});

test('库动作都有教学资料（guidance）与规则', () => {
  const lib = EXERCISE_LIST.filter((e) => e.guidance);
  assertEqual(lib.length >= 70, true, `带 guidance 的动作应 ≥70，实际 ${lib.length}`);
  for (const e of lib.slice(0, 8)) {
    assertEqual(e.guidance.coachingCues.length > 0, true, `${e.name} 应有周期要领`);
    assertEqual(e.guidance.setupCues.length > 0, true, `${e.name} 应有器材准备提示`);
    assertEqual(e.rules.length > 0, true, `${e.name} 应有判定规则`);
    assertEqual(!!e.repCounter || e.mode === 'hold', true, `${e.name} 应有计数配置`);
  }
});

test('getExercise 按 id 返回配置，未知 id 返回 null', () => {
  assertEqual(getExercise('squat')?.id, 'squat', '应返回深蹲配置');
  assertEqual(getExercise('pec-deck')?.name, '蝴蝶机夹胸', '库动作按 id 可取');
  assertEqual(getExercise('unknown'), null, '未知 id 应返回 null');
});

test('isExerciseId 类型守卫正确', () => {
  assertEqual(isExerciseId('plank'), true, 'plank 是合法 id');
  assertEqual(isExerciseId('deadlift'), true, 'deadlift 现为库内动作（暂不可用但仍注册）');
  assertEqual(isExerciseId('not-a-move'), false, '未注册 id 返回 false');
});

test('模拟新增动作：仅靠配置即可被注册表识别（不改引擎代码）', () => {
  // 构造一个「弓步蹲」配置，验证其结构可被通用类型接受
  const lunge: ExerciseConfig = {
    id: 'squat' as ExerciseConfig['id'], // 复用 id 类型
    name: '弓步蹲',
    nameEn: 'Lunge',
    bodyPart: 'legs',
    difficulty: 2,
    supported: true,
    icon: 'lunge',
    description: '测试用',
    tips: ['侧面拍摄'],
    mode: 'reps',
    rules: [
      {
        id: 'knee-depth',
        label: '前膝角度',
        triple: TRIPLES.LEFT_KNEE,
        targetRange: [80, 110],
        messageLow: '蹲太深',
        messageHigh: '再蹲深',
        severity: 'warn',
        weight: 100,
      },
    ],
    repCounter: {
      phases: [
        { phase: 'stand', label: '站立', condition: { triple: TRIPLES.LEFT_KNEE, range: [160, 180] } },
        { phase: 'down', label: '下蹲', condition: { triple: TRIPLES.LEFT_KNEE, range: [0, 110] } },
      ],
      completePhase: 'stand',
      requiredIntermediatePhase: 'down',
      minRepIntervalMs: 700,
    },
    scoring: { baseScore: 100, errorPenalty: 12, warnPenalty: 6, minScore: 0 },
  };

  // 用同一套引擎跑该新动作 —— 证明引擎零硬编码
  const gate = new ConfidenceGate();
  const rc = new RepCounter(lunge.repCounter!, gate);
  const re = new RuleEngine(lunge, gate);
  let t = 0;
  let count = 0;
  for (const angle of [180, 100, 180]) {
    t += 900;
    count = rc.update(kneeLandmarksForAngle(angle), t).repCount;
  }
  assertEqual(count, 1, '新动作配置应能被通用 RepCounter 正确计数');

  const violations = re.evaluate(kneeLandmarksForAngle(50), 'down', t);
  assert(violations.some((v) => v.ruleId === 'knee-depth'), '新动作规则应被通用 RuleEngine 评估');
});

test('所有内置动作配置结构完整（invariant 校验）', () => {
  for (const cfg of EXERCISE_LIST) {
    // cardio 只计时、不做姿态判定，允许没有角度规则
    if (cfg.mode !== 'cardio') {
      assert(cfg.rules.length > 0, `${cfg.id} 必须有规则`);
    }
    assert(cfg.scoring.baseScore > 0, `${cfg.id} baseScore 必须为正`);
    if (cfg.mode === 'reps') {
      assert(cfg.repCounter !== null, `${cfg.id} reps 模式必须有 repCounter`);
      const rc = cfg.repCounter!;
      assert(rc.phases.length >= 2, `${cfg.id} 至少 2 个阶段`);
      assert(
        rc.phases.some((p) => p.phase === rc.completePhase),
        `${cfg.id} completePhase 必须在 phases 中定义`,
      );
      assert(
        rc.phases.some((p) => p.phase === rc.requiredIntermediatePhase),
        `${cfg.id} requiredIntermediatePhase 必须在 phases 中定义`,
      );
    } else if (cfg.mode === 'hold') {
      assert(cfg.hold !== undefined, `${cfg.id} hold 模式必须有 hold 配置`);
    }
  }
});

test('动作库覆盖全身部位', () => {
  const parts = new Set(EXERCISE_LIST.map((e) => e.bodyPart));
  for (const p of ['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core', 'calves', 'forearms', 'cardio']) {
    assert(parts.has(p as never), `部位 ${p} 应有动作`);
  }
});

test('新动作都有入场准备提示与周期要领', () => {
  const v2 = EXERCISE_LIST.filter((e) => {
    const v = e.guidance?.source.video ?? '';
    return v.includes('20261119') || v.includes('20261126');
  });
  assert(v2.length >= 80, `第二批动作应 >=80，实际 ${v2.length}`);
  for (const e of v2.slice(0, 10)) {
    assert((e.guidance?.setupCues.length ?? 0) > 0, `${e.name} 应有器材/握距提示`);
    assert((e.guidance?.coachingCues.length ?? 0) >= 4, `${e.name} 应有周期要领`);
  }
});


/* ------------------------------------------------------------------ */
/* T2.9 规则度量方式（vAngle / hDist）                                 */
/* ------------------------------------------------------------------ */

suite('T2.9 规则度量方式');

function mkLandmarks(points: Record<number, [number, number]>): Landmark[] {
  const arr = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 1 }));
  for (const [idx, [x, y]] of Object.entries(points)) {
    arr[Number(idx)] = { x, y, z: 0, visibility: 1 };
  }
  return arr;
}

test('vAngle：躯干竖直时接近 0 度', () => {
  const lm = mkLandmarks({ 11: [0.5, 0.2], 23: [0.5, 0.6] });
  const rule = {
    id: 't', label: '躯干', triple: PAIRS.LEFT_TORSO_AXIS,
    targetRange: [0, 10] as [number, number], messageLow: '', messageHigh: '',
    severity: 'warn' as const, weight: 10, metric: 'vAngle' as const,
  };
  const gate = new ConfidenceGate();
  const re = new RuleEngine(squatConfig, gate);
  // 直接验证 calcVerticalAngle 口径
  const deg = calcVerticalAngle(lm[11], lm[23]);
  assertEqual(deg, 0, `竖直应为 0 度，实际 ${deg}`);
  assertEqual(rule.metric, 'vAngle', '规则应声明 vAngle');
});

test('vAngle：前倾 45 度能被识别', () => {
  const lm = mkLandmarks({ 11: [0.7, 0.3], 23: [0.5, 0.7] });
  const deg = calcVerticalAngle(lm[11], lm[23]);
  // 竖屏 16:9 默认宽高比下，dx 会被拉伸，实测约 42 度
  assertEqual(deg >= 35 && deg <= 50, true, `前倾应落在 35-50，实际 ${deg}`);
});

test('hDist：水平距离按百分比计算', () => {
  const lm = mkLandmarks({ 25: [0.40, 0.6], 27: [0.45, 0.9] });
  const d = calcHorizontalDistance(lm[25], lm[27]);
  assertEqual(Math.round(d * 100), 5, `0.05 应换算为 5，实际 ${d}`);
});

test('hDist：膝踝对齐时为 0', () => {
  const lm = mkLandmarks({ 25: [0.5, 0.6], 27: [0.5, 0.9] });
  assertEqual(calcHorizontalDistance(lm[25], lm[27]), 0, '对齐时距离应为 0');
});

test('新增三点组合已注册（肩/踝/腕）', () => {
  assertEqual(!!TRIPLES.LEFT_ARM_TORSO, true, '应有三点：大臂相对躯干');
  assertEqual(!!TRIPLES.LEFT_ANKLE, true, '应有三点：踝');
  assertEqual(!!TRIPLES.LEFT_WRIST, true, '应有三点：腕');
});

/* ------------------------------------------------------------------ */
/* 输出结果                                                            */
/* ------------------------------------------------------------------ */
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;

console.log('\n================ 测试结果 ================');
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
  if (!r.pass) console.log(`      └─ ${r.detail}`);
}
console.log('==========================================');
console.log(`总计: ${results.length} | 通过: ${passed} | 失败: ${failed}`);
console.log('==========================================\n');

if (failed > 0) {
  process.exitCode = 1;
}
