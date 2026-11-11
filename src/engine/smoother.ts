/**
 * LandmarkSmoother —— 关键点指数平滑滤波。
 *
 * 每个关键点的 x/y/z/visibility 独立做指数平滑，抑制骨架抖动。
 * 公式：smoothed = alpha * current + (1 - alpha) * prev
 * alpha 越小越平滑但越滞后；默认 0.4（见 constants/config.ts）。
 */

import { SMOOTH_ALPHA } from '../constants/config';
import type { Landmark } from '../types/pose';

export class LandmarkSmoother {
  private alpha: number;
  private prev: Landmark[] | null = null;

  /**
   * @param alpha 平滑系数，默认 SMOOTH_ALPHA
   */
  constructor(alpha: number = SMOOTH_ALPHA) {
    this.alpha = alpha;
  }

  /**
   * 对一帧关键点做平滑。
   * @param input 原始关键点数组
   * @returns 平滑后的关键点数组（新数组，不修改入参）
   */
  smooth(input: Landmark[]): Landmark[] {
    if (input.length === 0) {
      return input;
    }

    // 首次或长度变化时重置基线
    if (!this.prev || this.prev.length !== input.length) {
      this.prev = input.map((lm) => ({ ...lm }));
      return this.prev.map((lm) => ({ ...lm }));
    }

    const alpha = this.alpha;
    const smoothed: Landmark[] = input.map((cur, i) => {
      const prev = this.prev as Landmark[];
      const p = prev[i];
      return {
        x: alpha * cur.x + (1 - alpha) * p.x,
        y: alpha * cur.y + (1 - alpha) * p.y,
        z: alpha * cur.z + (1 - alpha) * p.z,
        visibility: alpha * cur.visibility + (1 - alpha) * p.visibility,
      };
    });

    this.prev = smoothed.map((lm) => ({ ...lm }));
    return smoothed;
  }

  /** 重置滤波器状态（切换视频源 / 重新开始时调用） */
  reset(): void {
    this.prev = null;
  }

  /** 设置平滑系数 */
  setAlpha(alpha: number): void {
    this.alpha = Math.min(1, Math.max(0.05, alpha));
  }
}
