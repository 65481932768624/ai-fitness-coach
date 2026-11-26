/**
 * library-types —— 批量动作库条目类型与共享规则模板。
 *
 * 类型与 ExerciseConfig 字段一一对应，但规则用「模板 + 区间」声明，
 * 避免每个动作重复抄 triple 定义。
 */

import type {
  BodyPart,
  ExerciseFamily,
  ExerciseMotionProfile,
  HoldConfig,
  JointRule,
  RepCounterConfig,
  ScoringConfig,
} from '../types/exercise';
import { LM, TRIPLES } from '../constants/landmarks';

export interface LibraryEntry {
  id: string;
  name: string;
  nameEn: string;
  bodyPart: BodyPart;
  difficulty: 1 | 2 | 3;
  supported: boolean;
  family: ExerciseFamily;
  description: string;
  tips: string[];
  muscles: string;
  equipment: string;
  steps: Array<{ title: string; detail: string }>;
  keyPoints: string[];
  mistakes: string[];
  setupCues: string[];
  coachingCues: string[];
  sourceVideo: string;
  sourceNumber: number;
  mode: 'reps' | 'hold' | 'cardio';
  rules: JointRule[];
  repCounter?: RepCounterConfig | null;
  hold?: HoldConfig;
  scoring?: ScoringConfig;
  motion?: ExerciseMotionProfile;
}

// ---------- 共享三点组合 ----------

/** 大臂与躯干夹角（顶点=肩） */
const ARM_TORSO = { a: LM.LEFT_HIP, b: LM.LEFT_SHOULDER, c: LM.LEFT_ELBOW };

/** 躯干线（肩-髋-膝），推/拉类塌腰检测 */
const TORSO_LINE = { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE };

// ---------- 规则模板 ----------
// 从 71 段要点归纳的跨动作通用判定（提取报告 §三）。

/** 顶端肘角：接近伸直但不锁死。手册：肘部与身体夹角45°—75°，不锁死 */
export function lockoutRule(range: readonly [number, number] = [145, 172]): JointRule {
  return {
    id: 'lockout',
    label: '顶端微曲',
    triple: TRIPLES.LEFT_ELBOW,
    targetRange: [...range] as [number, number],
    messageLow: '还没推到位，继续推起接近伸直',
    messageHigh: '肘别完全锁死，保留一点微曲护关节',
    severity: 'warn',
    weight: 25,
  };
}

/** 底端肘角：下放深度足够 */
export function bottomRule(
  range: readonly [number, number] = [70, 100],
  lowMsg = '下太深了，肩前侧吃不住',
  highMsg = '没下到位，幅度做完整',
): JointRule {
  return {
    id: 'bottom-depth',
    label: '下放深度',
    triple: TRIPLES.LEFT_ELBOW,
    targetRange: [...range] as [number, number],
    messageLow: lowMsg,
    messageHigh: highMsg,
    severity: 'error',
    weight: 35,
  };
}

/** 大臂夹角：手册通用 45°—75° */
export function armAngleRule(range: readonly [number, number] = [45, 75]): JointRule {
  return {
    id: 'arm-angle',
    label: '大臂夹角',
    triple: ARM_TORSO,
    targetRange: [...range] as [number, number],
    messageLow: '肘夹太紧，稍微打开一点小臂才垂直',
    messageHigh: '大臂外撇太多，收到 45—75 度之间',
    severity: 'error',
    weight: 30,
  };
}

/** 夹胸/飞鸟类：肘角恒定微曲，全程不伸直 */
export function elbowHoldRule(range: readonly [number, number] = [120, 165]): JointRule {
  return {
    id: 'elbow-hold',
    label: '肘部微曲',
    triple: TRIPLES.LEFT_ELBOW,
    targetRange: [...range] as [number, number],
    messageLow: '手臂弯太多，展开一点保持微曲',
    messageHigh: '手臂快伸直了，保持微曲别变成推',
    severity: 'warn',
    weight: 40,
  };
}

/** 俯卧撑/双杠类：躯干一条直线 */
export function bodyLineRule(range: readonly [number, number] = [160, 180]): JointRule {
  return {
    id: 'body-line',
    label: '身体直线',
    triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
    targetRange: [...range] as [number, number],
    messageLow: '塌腰了，收紧核心身体打直',
    messageHigh: '屁股撅起来了，身体打直',
    severity: 'error',
    weight: 30,
  };
}

/** 划船类：俯身角 */
export function torsoLeanRule(range: readonly [number, number] = [40, 70]): JointRule {
  return {
    id: 'torso-lean',
    label: '俯身角度',
    triple: TORSO_LINE,
    targetRange: [...range] as [number, number],
    messageLow: '站太直了，俯身到位背阔才受力',
    messageHigh: '俯身太深，核心吃不消就抬高一点',
    severity: 'warn',
    weight: 25,
  };
}

/** 硬拉类：背部挺直（躯干线接近 180 表示直立，弯腰会显著变小） */
export function flatBackRule(): JointRule {
  return {
    id: 'flat-back',
    label: '背部挺直',
    triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
    targetRange: [150, 180],
    messageLow: '弯腰了，背部挺直，腰突风险',
    messageHigh: '别过度后仰，腰别反弓',
    severity: 'error',
    weight: 40,
  };
}

/** 通用计次状态机：肘角三段 */
export function elbowRepCounter(
  profile: ExerciseMotionProfile,
): RepCounterConfig {
  const labels = profile.labels ?? ['伸直', '移动中', '收紧'];
  return {
    phases: [
      { phase: 'top', label: labels[0], condition: { triple: TRIPLES.LEFT_ELBOW, range: [...profile.primary] as [number, number] } },
      { phase: 'moving', label: labels[1], condition: { triple: TRIPLES.LEFT_ELBOW, range: [...profile.middle] as [number, number] } },
      { phase: 'bottom', label: labels[2], condition: { triple: TRIPLES.LEFT_ELBOW, range: [...profile.target] as [number, number] } },
    ],
    completePhase: 'top',
    requiredIntermediatePhase: 'bottom',
    minRepIntervalMs: profile.minRepIntervalMs ?? 900,
  };
}
