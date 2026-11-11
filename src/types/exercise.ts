/**
 * 动作配置类型定义 —— 本项目「动作配置化」扩展性的核心。
 *
 * 引擎层（ruleEngine / repCounter / scoringEngine）只读取这些配置，
 * 不硬编码任何动作参数。新增动作 = 新增一个 ExerciseConfig 对象 + 注册表加一行。
 */

import type { LandmarkIndex } from './pose';

/** 支持的动作用户端 ID */
export type ExerciseId = 'squat' | 'pushup' | 'plank';

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
  /** severity==='error' 的扣分，默认 12 */
  errorPenalty: number;
  /** severity==='warn' 的扣分，默认 6 */
  warnPenalty: number;
  /** 分数下限，默认 0 */
  minScore: number;
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
  bodyPart: 'legs' | 'chest' | 'core';
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

  /** 计数模式：reps = 计次动作；hold = 静态保持动作 */
  mode: 'reps' | 'hold';

  /** 关节规则列表 */
  rules: JointRule[];
  /** 计数状态机配置（hold 类为 null） */
  repCounter: RepCounterConfig | null;
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
