/**
 * ConfidenceGate —— 置信度门控。
 *
 * 任一规则依赖的关键点 visibility 低于阈值时，跳过该规则判定，
 * 避免掉点导致的误报。
 */

import { BODY_MIN_VISIBLE_LANDMARKS, VISIBILITY_THRESHOLD } from '../constants/config';
import type { JointTriple } from '../types/exercise';
import type { Landmark } from '../types/pose';

export class ConfidenceGate {
  private threshold: number;

  /**
   * @param threshold 可见度阈值，默认 VISIBILITY_THRESHOLD
   */
  constructor(threshold: number = VISIBILITY_THRESHOLD) {
    this.threshold = threshold;
  }

  /**
   * 判断一个三点组合的三个关键点是否都可信。
   * @param landmarks 关键点数组
   * @param triple 三点索引
   */
  isTripleValid(landmarks: Landmark[], triple: JointTriple): boolean {
    const points = [landmarks[triple.a], landmarks[triple.b], landmarks[triple.c]];
    return points.every((p) => p !== undefined && p.visibility >= this.threshold);
  }

  /**
   * 判断整帧是否「检测到人体」：有效关键点数量达到阈值。
   * @param landmarks 关键点数组
   */
  isBodyDetected(landmarks: Landmark[]): boolean {
    if (landmarks.length < BODY_MIN_VISIBLE_LANDMARKS) {
      return false;
    }
    let visibleCount = 0;
    for (const lm of landmarks) {
      if (lm.visibility >= this.threshold) {
        visibleCount += 1;
        if (visibleCount >= BODY_MIN_VISIBLE_LANDMARKS) {
          return true;
        }
      }
    }
    return false;
  }

  /** 设置阈值 */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
}
