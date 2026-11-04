/**
 * 训练数据结构定义。
 */

import type { ExerciseId } from './exercise';

/** 一次规则违规记录 */
export interface RuleViolation {
  /** 触发规则 id */
  ruleId: string;
  /** 规则中文名 */
  label: string;
  /** 严重度 */
  severity: 'error' | 'warn';
  /** 提示文案 */
  message: string;
  /** 实测角度 */
  actualAngle: number;
  /** 目标区间 */
  targetRange: [number, number];
  /** 时间戳（performance.now()，ms） */
  timestampMs: number;
}

/** 单次计次动作记录 */
export interface RepRecord {
  /** 第几次（从 1 开始） */
  index: number;
  /** 该次得分 0-100 */
  score: number;
  /** 是否达标（score >= PASS_SCORE） */
  pass: boolean;
  /** 该次触发的违规列表 */
  violations: RuleViolation[];
  /** 该次耗时（ms） */
  durationMs: number;
  /** 完成时间戳（performance.now()，ms） */
  timestampMs: number;
}

/** 静态动作的一次采样 */
export interface HoldSample {
  /** 采样时间戳（performance.now()，ms） */
  timestampMs: number;
  /** 该时刻姿势是否达标 */
  pass: boolean;
  /** 该时刻违规列表 */
  violations: RuleViolation[];
}

/** 一次训练的汇总结果 */
export interface SessionSummary {
  /** 会话唯一 id（uuid） */
  sessionId: string;
  /** 动作 id */
  exerciseId: ExerciseId;
  /** 动作中文名 */
  exerciseName: string;
  /** 开始时间（ISO 8601 UTC） */
  startedAt: string;
  /** 结束时间（ISO 8601 UTC） */
  endedAt: string;
  /** 总时长（ms） */
  durationMs: number;
  /** 模式 */
  mode: 'reps' | 'hold';
  /** reps 模式：总次数 */
  totalReps: number;
  /** reps 模式：达标次数 */
  passReps: number;
  /** 平均分 */
  avgScore: number;
  /** hold 模式：总保持时长（ms） */
  holdDurationMs?: number;
  /** hold 模式：姿势达标率 0-1 */
  passRate?: number;
  /** 主要问题 Top3 */
  topIssues: Array<{ ruleId: string; label: string; count: number }>;
}

/** 引擎每帧对外快照（供 React HUD 消费） */
export interface FrameSnapshot {
  /** 是否检测到人体 */
  detected: boolean;
  /** 当前状态机阶段 */
  phase: string;
  /** 已计数 */
  repCount: number;
  /** 当前 / 最近一次评分 */
  currentScore: number;
  /** hold 模式已保持时长（ms） */
  holdElapsedMs?: number;
  /** hold 模式当前达标率 0-1 */
  passRate?: number;
  /** 当前底部提示文案 */
  lastFeedback: string | null;
  /** 本帧违规（供 HUD 标红） */
  violations: RuleViolation[];
}

/** 主循环帧回调类型 */
export type FrameSnapshotCallback = (snapshot: FrameSnapshot) => void;
