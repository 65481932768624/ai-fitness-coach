/**
 * 动作配置类型定义 —— 本项目「动作配置化」扩展性的核心。
 *
 * 引擎层（ruleEngine / repCounter / scoringEngine）只读取这些配置，
 * 不硬编码任何动作参数。新增动作 = 新增一个 ExerciseConfig 对象 + 注册表加一行。
 */

import type { LandmarkIndex } from './pose';

/** 支持的动作 ID 由注册表推导，新增动作无需再改这里的联合类型 */
export type ExerciseId = string;

/** 动作来源录屏，便于回溯配置依据 */
export interface ExerciseSource {
  /** 文件名 */
  video: string;
  /** 原始编号 */
  number: number;
}

/** 动作教学资料（来自手册；不是实时判定规则） */
export interface ExerciseGuidance {
  /** 目标肌群 */
  muscles: string;
  /** 所需器材 */
  equipment: string;
  /** 起始位 / 发力 / 顶点 / 返回 / 呼吸 */
  steps: Array<{ title: string; detail: string }>;
  /** 关键要点 */
  keyPoints: string[];
  /** 常见错误 */
  mistakes: string[];
  /** 器材摆放、座椅、把手、握距等准备提示 */
  setupCues: string[];
  /** 沉肩、挺胸、核心、呼吸等周期性要领提示 */
  coachingCues: string[];
  /** 来源录屏 */
  source: ExerciseSource;
}

/** 目标部位（v8 起覆盖全身） */
export type BodyPart =
  | 'legs'
  | 'glutes'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'calves'
  | 'forearms'
  | 'cardio';

/** 规则度量方式 */
export type RuleMetric =
  /** 三点夹角（默认） */
  | 'angle'
  /** 两点连线与竖直方向夹角，用于躯干前倾/后仰 */
  | 'vAngle'
  /** 两点水平距离百分比，用于膝内扣、双膝间距 */
  | 'hDist';

/** 配置驱动计数器关节点选择 */
export type CounterSide = 'left' | 'right' | 'alternate';

/** 肘屈伸动作的阶段角度（度），完整行程由配置给出 */
export interface ExerciseMotionProfile {
  /** 主计数阶段；一般肘角较大 */
  primary: [number, number];
  /** 过渡阶段 */
  middle: [number, number];
  /** 完成一次必须经过的阶段；一般肘角较小 */
  target: [number, number];
  /** 阶段显示名 */
  labels?: [string, string, string];
  /** 计数使用哪一侧 */
  side?: CounterSide;
  /** 最短计数间隔 */
  minRepIntervalMs?: number;
}

/** 器械/推/拉/夹等动作族的共享初始配置 */
export type ExerciseFamily =
  | 'press'
  | 'fly'
  | 'pushup'
  | 'dip'
  | 'pulldown'
  | 'row'
  | 'straight-arm'
  | 'deadlift'
  // v8 新增
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'leg-ext'
  | 'leg-curl'
  | 'leg-press'
  | 'abduction'
  | 'adduction'
  | 'kickback'
  | 'bridge'
  | 'back-ext'
  | 'shoulder-press'
  | 'lateral-raise'
  | 'front-raise'
  | 'rear-delt'
  | 'upright-row'
  | 'curl'
  | 'pullup-curl'
  | 'triceps'
  | 'crunch'
  | 'calf'
  | 'wrist'
  | 'cardio';

/** 三点组合：以 b 为顶点计算 a-b-c 夹角 */
export interface JointTriple {
  /** 端点 A 的关键点索引 */
  a: LandmarkIndex;
  /** 顶点 B 的关键点索引 */
  b: LandmarkIndex;
  /** 端点 C 的关键点索引 */
  c: LandmarkIndex;
}

/** 状态机阶段名（字符串标识，各动作自定义） */
export type ExercisePhase = string;

/** 单条关节规则 */
export interface JointRule {
  /** 规则唯一 id，如 'knee-depth' */
  id: string;
  /** 规则中文名，如 '下蹲深度' */
  label: string;
  /** 参与计算的三点 */
  triple: JointTriple;
  /** 标准夹角区间 [下限, 上限]（度，闭区间） */
  targetRange: [number, number];
  /** 角度低于下限时的提示文案 */
  messageLow: string;
  /** 角度高于上限时的提示文案 */
  messageHigh: string;
  /** 严重度：error 抢播且重扣分；warn 普通提示 */
  severity: 'error' | 'warn';
  /** 单次动作中该规则最多触发提示次数（默认 1） */
  maxViolationsPerRep?: number;
  /** 评分权重，总和建议 100 */
  weight: number;
  /**
   * 度量方式，默认 angle。
   * vAngle 用 triple 的 a、b 两点算与竖直方向夹角；
   * hDist 用 triple 的 a、b 两点算水平距离（百分比）。
   */
  metric?: RuleMetric;
  /** 仅在这些状态下生效；省略表示所有状态生效 */
  activePhases?: ExercisePhase[];
}

/** 阶段判定条件 */
export interface PhaseCondition {
  /** 用于判定的三点 */
  triple: JointTriple;
  /** 要求角度落在该区间内 */
  range: [number, number];
}

/** 单个计数阶段的定义 */
export interface RepPhaseDefinition {
  /** 阶段名 */
  phase: ExercisePhase;
  /** 进入该阶段的角度条件 */
  condition: PhaseCondition;
  /** 阶段中文显示名 */
  label: string;
}

/** 计数状态机配置 */
export interface RepCounterConfig {
  /** 阶段定义列表 */
  phases: RepPhaseDefinition[];
  /** 完成一个 rep 的收尾阶段（回到该阶段即计数 +1） */
  completePhase: ExercisePhase;
  /** 完成一个 rep 必须经过的中间阶段（防抖动误计数） */
  requiredIntermediatePhase: ExercisePhase;
  /** 最小完成间隔（ms），防抖，默认 800 */
  minRepIntervalMs?: number;
}

/** 静态保持动作配置（如平板支撑） */
export interface HoldConfig {
  /** 姿势达标率采样间隔（ms），默认 500 */
  sampleIntervalMs: number;
  /** 达标率低于该值视为当前姿势不达标并触发提示，如 0.7 */
  passRateWarnThreshold: number;
}

/** 评分配置 */
export interface ScoringConfig {
  /** 基础分，默认 100 */
  baseScore: number;
  /** severity==='error' 的扣分，默认 12（仅固定扣分模式使用） */
  errorPenalty: number;
  /** severity==='warn' 的扣分，默认 6（仅固定扣分模式使用） */
  warnPenalty: number;
  /** 分数下限，默认 0 */
  minScore: number;
  /**
   * 加权模式下 error 的严重度系数，默认 0.5。
   * 单条 error 最多扣 (该规则权重/总权重) × baseScore × 此系数。
   */
  errorSeverityScale?: number;
  /** 加权模式下 warn 的严重度系数，默认 0.25 */
  warnSeverityScale?: number;
}

/** 🔓 一个动作的完整配置 —— 新增动作只需提供此对象 */
export interface ExerciseConfig {
  /** 动作 id */
  id: ExerciseId;
  /** 中文名 */
  name: string;
  /** 英文名 */
  nameEn: string;
  /** 目标部位 */
  bodyPart: BodyPart;
  /** 难度 1-3 */
  difficulty: 1 | 2 | 3;
  /** 是否已支持（false 在选择页显示「即将支持」） */
  supported: boolean;
  /** 图标名（lucide 图标名映射键） */
  icon: string;
  /** 一句话说明 */
  description: string;
  /** 开始前注意事项 */
  tips: string[];
  /** 完整教学与语音提示资料 */
  guidance?: ExerciseGuidance;
  /** 动作族，便于复用演示与判定模板 */
  family?: ExerciseFamily;
  /** 肘屈伸计数的角度模板；省略时使用 repCounter */
  motion?: ExerciseMotionProfile;

  /** 计数模式：reps = 计次；hold = 静态保持；cardio = 只计时 */
  mode: 'reps' | 'hold' | 'cardio';

  /** 关节规则列表 */
  rules: JointRule[];
  /** 计数状态机配置（hold 类为 null；使用 motion 时可自动生成） */
  repCounter?: RepCounterConfig | null;
  /** 静态动作配置（hold 类必填） */
  hold?: HoldConfig;
  /** 评分配置 */
  scoring: ScoringConfig;
}

/** 计数状态机对外输出状态 */
export interface RepCounterState {
  /** 当前阶段 */
  phase: ExercisePhase;
  /** 当前阶段中文名 */
  phaseLabel: string;
  /** 已完成的 rep 数 */
  repCount: number;
  /** 本帧是否刚完成一个 rep */
  repJustCompleted: boolean;
}
