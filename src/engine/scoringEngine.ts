/**
 * ScoringEngine —— 评分引擎（配置驱动）。
 *
 * - reps 模式：scoreRep(violations) 从 baseScore 按严重度扣分，钳制到 [minScore, baseScore]。
 * - hold 模式：scoreHold(passRate) = baseScore * passRate。
 */

import type { ScoringConfig } from '../types/exercise';
import type { RuleViolation } from '../types/training';

export class ScoringEngine {
  private config: ScoringConfig;

  /**
   * @param config 评分配置
   */
  constructor(config: ScoringConfig) {
    this.config = config;
  }

  /**
   * 计算单次计次动作的得分。
   * @param violations 该次动作累计违规（去重后建议每规则一次）
   * @returns 0-100 的得分
   */
  scoreRep(violations: RuleViolation[]): number {
    let score = this.config.baseScore;
    for (const v of violations) {
      if (v.severity === 'error') {
        score -= this.config.errorPenalty;
      } else {
        score -= this.config.warnPenalty;
      }
    }
    return this.clamp(score);
  }

  /**
   * 计算静态动作得分。
   * @param passRate 姿势达标率 0-1
   * @returns 0-100 的得分
   */
  scoreHold(passRate: number): number {
    const ratio = Number.isFinite(passRate) ? Math.min(1, Math.max(0, passRate)) : 0;
    return this.clamp(this.config.baseScore * ratio);
  }

  /** 约束分数到合法区间 */
  private clamp(score: number): number {
    const min = this.config.minScore;
    const max = this.config.baseScore;
    if (!Number.isFinite(score)) {
      return min;
    }
    return Math.round(Math.min(max, Math.max(min, score)));
  }

  /** 获取配置 */
  getConfig(): ScoringConfig {
    return this.config;
  }
}
