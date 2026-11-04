/**
 * RepCounter —— 通用计数状态机（配置驱动）。
 *
 * 逻辑：
 * - 每帧根据 RepCounterConfig.phases 中各条件的角度区间确定「最匹配的阶段」；
 * - 记录是否访问过 requiredIntermediatePhase（防抖）；
 * - 当从中间阶段回到 completePhase 且距上次完成超过 minRepIntervalMs 时，repCount += 1。
 *
 * 不硬编码任何动作参数。
 */

import { calcJointAngle } from './angleCalculator';
import { ConfidenceGate } from './confidenceGate';
import type { ExercisePhase, RepCounterConfig, RepCounterState } from '../types/exercise';
import type { Landmark } from '../types/pose';

const DEFAULT_MIN_INTERVAL_MS = 800;

export class RepCounter {
  private config: RepCounterConfig;
  private gate: ConfidenceGate;
  private currentPhase: ExercisePhase;
  private currentPhaseLabel: string;
  private visitedIntermediate: boolean;
  private repCount: number;
  private lastRepTs: number;

  /**
   * @param config 计数状态机配置
   * @param gate 置信度门控实例
   */
  constructor(config: RepCounterConfig, gate: ConfidenceGate) {
    this.config = config;
    this.gate = gate;
    this.currentPhase = config.completePhase;
    this.currentPhaseLabel = this.labelOf(config.completePhase);
    this.visitedIntermediate = false;
    this.repCount = 0;
    this.lastRepTs = -Infinity;
  }

  /**
   * 每帧更新状态机。
   * @param landmarks 平滑后关键点
   * @param timestampMs 时间戳（ms）
   * @returns 计数状态
   */
  update(landmarks: Landmark[], timestampMs: number): RepCounterState {
    const nextPhase = this.detectPhase(landmarks);
    let repJustCompleted = false;

    if (nextPhase !== null) {
      const prevPhase = this.currentPhase;

      // 记录是否经过必需的中间阶段
      if (nextPhase === this.config.requiredIntermediatePhase) {
        this.visitedIntermediate = true;
      }

      // 阶段变化处理
      if (nextPhase !== prevPhase) {
        this.currentPhase = nextPhase;
        this.currentPhaseLabel = this.labelOf(nextPhase);
      }

      // 完成判定：回到 completePhase 且此前经过中间阶段
      if (
        nextPhase === this.config.completePhase &&
        prevPhase !== this.config.completePhase &&
        this.visitedIntermediate
      ) {
        const minInterval = this.config.minRepIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
        if (timestampMs - this.lastRepTs >= minInterval) {
          this.repCount += 1;
          this.lastRepTs = timestampMs;
          repJustCompleted = true;
        }
        this.visitedIntermediate = false;
      }
    }

    return {
      phase: this.currentPhase,
      phaseLabel: this.currentPhaseLabel,
      repCount: this.repCount,
      repJustCompleted,
    };
  }

  /** 根据当前角度匹配阶段（返回阶段名或 null） */
  private detectPhase(landmarks: Landmark[]): ExercisePhase | null {
    // 按 phases 顺序检查，取第一个匹配的阶段
    for (const def of this.config.phases) {
      if (!this.gate.isTripleValid(landmarks, def.condition.triple)) {
        continue;
      }
      const angle = calcJointAngle(landmarks, def.condition.triple);
      const [low, high] = def.condition.range;
      if (angle >= low && angle <= high) {
        return def.phase;
      }
    }
    return null;
  }

  /** 获取阶段中文名 */
  private labelOf(phase: ExercisePhase): string {
    const def = this.config.phases.find((p) => p.phase === phase);
    return def ? def.label : phase;
  }

  /** 重置状态机 */
  reset(): void {
    this.currentPhase = this.config.completePhase;
    this.currentPhaseLabel = this.labelOf(this.config.completePhase);
    this.visitedIntermediate = false;
    this.repCount = 0;
    this.lastRepTs = -Infinity;
  }

  /** 当前计数 */
  getCount(): number {
    return this.repCount;
  }

  /** 当前阶段 */
  getPhase(): ExercisePhase {
    return this.currentPhase;
  }

  /** 当前阶段中文名 */
  getPhaseLabel(): string {
    return this.currentPhaseLabel;
  }
}
