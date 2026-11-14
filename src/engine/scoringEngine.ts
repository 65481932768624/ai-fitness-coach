/**
 * ScoringEngine —— 评分引擎（配置驱动）。
 *
 * - reps 模式：scoreRep(violations) 从 baseScore 扣分，钳制到 [minScore, baseScore]。
 * - hold 模式：scoreHold(passRate) = baseScore * passRate。
 *
 * reps 扣分有两种模式：
 *
 * 1. **加权模式**（传入 rules 时启用，线上走这条）
 *    每条规则的扣分按它自己的 weight 占总权重的比例分配，
 *    再乘严重度系数。语义是「越重要的规则，错了扣得越多」：
 *
 *        penalty = (weight / totalWeight) × baseScore × severityScale
 *
 *    severityScale 默认 error=0.5、warn=0.25，这个取值让
 *    「深蹲 4 条规则全中」≈ 扣 36 分，与历史固定扣分（12+12+6+6=36）
 *    的总量级一致 —— 换算法不改变分数分布，只改变分配方式。
 *
 * 2. **固定模式**（未传 rules，保持向后兼容）
 *    每条 error 扣 errorPenalty、每条 warn 扣 warnPenalty。旧调用方与单测依赖此行为。
 */

import type { JointRule, ScoringConfig } from '../types/exercise';
import type { RuleViolation } from '../types/training';

/** 加权模式下 error 的默认严重度系数 */
const DEFAULT_ERROR_SCALE = 0.5;

/** 加权模式下 warn 的默认严重度系数 */
const DEFAULT_WARN_SCALE = 0.25;

export class ScoringEngine {
  private config: ScoringConfig;

  /** ruleId → 权重；为空表示走固定扣分模式 */
  private ruleWeights: Map<string, number> | null = null;

  /** 权重总和（归一化用） */
  private totalWeight = 0;

  /**
   * @param config 评分配置
   * @param rules 动作的规则列表；传入则启用加权扣分，省略则用固定扣分
   */
  constructor(config: ScoringConfig, rules?: JointRule[]) {
    this.config = config;
    if (rules && rules.length > 0) {
      const weights = new Map<string, number>();
      let total = 0;
      for (const rule of rules) {
        // 权重非正则视为 0，不让脏配置把总分算成 NaN
        const weight = Number.isFinite(rule.weight) && rule.weight > 0 ? rule.weight : 0;
        weights.set(rule.id, weight);
        total += weight;
      }
      if (total > 0) {
        this.ruleWeights = weights;
        this.totalWeight = total;
      }
    }
  }

  /**
   * 计算单次计次动作的得分。
   * @param violations 该次动作累计违规（去重后建议每规则一次）
   * @returns 0-100 的得分
   */
  scoreRep(violations: RuleViolation[]): number {
    let score = this.config.baseScore;
    for (const v of violations) {
      score -= this.penaltyFor(v);
    }
    return this.clamp(score);
  }

  /**
   * 单条违规的扣分值。
   *
   * 加权模式下先按 ruleId 查权重；查不到（例如调用方临时构造的违规）
   * 退回该动作的平均权重，避免权重缺失被当成 0 扣分。
   */
  private penaltyFor(v: RuleViolation): number {
    const isError = v.severity === 'error';

    if (!this.ruleWeights) {
      return isError ? this.config.errorPenalty : this.config.warnPenalty;
    }

    const weight = this.ruleWeights.get(v.ruleId) ?? this.totalWeight / this.ruleWeights.size;
    const scale = isError
      ? (this.config.errorSeverityScale ?? DEFAULT_ERROR_SCALE)
      : (this.config.warnSeverityScale ?? DEFAULT_WARN_SCALE);

    return (weight / this.totalWeight) * this.config.baseScore * scale;
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

  /** 是否启用了权重扣分 */
  isWeighted(): boolean {
    return this.ruleWeights !== null;
  }

  /** 获取配置 */
  getConfig(): ScoringConfig {
    return this.config;
  }
}
