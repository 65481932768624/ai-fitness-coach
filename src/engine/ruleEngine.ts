/**
 * RuleEngine —— 规则判定引擎（纯配置驱动）。
 *
 * 职责：遍历 ExerciseConfig.rules，对每条规则：
 * 1. ConfidenceGate 校验三点可见度；
 * 2. AngleCalculator 计算实测角度；
 * 3. 判断是否落在 targetRange 之外（并按 activePhases 过滤）；
 * 4. 产出 RuleViolation[]。
 *
 * 引擎不硬编码任何动作参数，全部来自配置。
 */

import { calcJointAngle } from './angleCalculator';
import { ConfidenceGate } from './confidenceGate';
import type { ExerciseConfig, ExercisePhase, JointRule } from '../types/exercise';
import type { Landmark } from '../types/pose';
import type { RuleViolation } from '../types/training';

export class RuleEngine {
  private config: ExerciseConfig;
  private gate: ConfidenceGate;

  /**
   * @param config 动作配置
   * @param gate 置信度门控实例
   */
  constructor(config: ExerciseConfig, gate: ConfidenceGate) {
    this.config = config;
    this.gate = gate;
  }

  /**
   * 评估当前帧所有规则。
   * @param landmarks 平滑后关键点
   * @param phase 当前状态机阶段
   * @param timestampMs 时间戳（ms）
   * @returns 违规列表（可能为空）
   */
  evaluate(landmarks: Landmark[], phase: ExercisePhase, timestampMs: number): RuleViolation[] {
    const violations: RuleViolation[] = [];
    if (landmarks.length < 33) {
      return violations;
    }

    for (const rule of this.config.rules) {
      if (!this.isRuleActive(rule, phase)) {
        continue;
      }
      const violation = this.evaluateRule(rule, landmarks, timestampMs);
      if (violation) {
        violations.push(violation);
      }
    }
    return violations;
  }

  /**
   * 离线评估：用于 hold 模式采样（不关心阶段）。
   */
  evaluateAll(landmarks: Landmark[], timestampMs: number): RuleViolation[] {
    const violations: RuleViolation[] = [];
    if (landmarks.length < 33) {
      return violations;
    }
    for (const rule of this.config.rules) {
      const violation = this.evaluateRule(rule, landmarks, timestampMs);
      if (violation) {
        violations.push(violation);
      }
    }
    return violations;
  }

  /** 判断规则在当前阶段是否生效 */
  private isRuleActive(rule: JointRule, phase: ExercisePhase): boolean {
    if (!rule.activePhases || rule.activePhases.length === 0) {
      return true;
    }
    return rule.activePhases.includes(phase);
  }

  /** 评估单条规则，返回违规或 null */
  private evaluateRule(
    rule: JointRule,
    landmarks: Landmark[],
    timestampMs: number,
  ): RuleViolation | null {
    if (!this.gate.isTripleValid(landmarks, rule.triple)) {
      return null;
    }
    const angle = calcJointAngle(landmarks, rule.triple);
    const [low, high] = rule.targetRange;

    if (angle < low) {
      return {
        ruleId: rule.id,
        label: rule.label,
        severity: rule.severity,
        message: rule.messageLow,
        actualAngle: angle,
        targetRange: rule.targetRange,
        timestampMs,
      };
    }
    if (angle > high) {
      return {
        ruleId: rule.id,
        label: rule.label,
        severity: rule.severity,
        message: rule.messageHigh,
        actualAngle: angle,
        targetRange: rule.targetRange,
        timestampMs,
      };
    }
    return null;
  }

  /** 获取动作配置 */
  getConfig(): ExerciseConfig {
    return this.config;
  }
}
