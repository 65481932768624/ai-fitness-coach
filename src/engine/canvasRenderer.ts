/**
 * CanvasRenderer —— 骨架绘制（HTML Canvas 2D）。
 *
 * 绘制内容：
 * - 骨架连线（低可见度点连线淡化）；
 * - 关键点圆点；
 * - 违规相关关节标红（按规则依赖的关键点索引）。
 */

import { SKELETON_CONNECTIONS } from '../constants/landmarks';
import { VISIBILITY_THRESHOLD } from '../constants/config';
import type { ExerciseConfig } from '../types/exercise';
import type { Landmark } from '../types/pose';
import type { RuleViolation } from '../types/training';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;

  /**
   * 绑定 canvas 节点。
   * @param canvas HTMLCanvasElement
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * 绘制一帧。
   * @param landmarks 平滑后关键点
   * @param violations 本帧违规（用于关节标红）
   * @param config 当前动作配置（用于解析违规依赖的关键点）
   */
  render(landmarks: Landmark[], violations: RuleViolation[], config: ExerciseConfig): void {
    if (!this.ctx || !this.canvas) {
      return;
    }
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    if (landmarks.length < 33) {
      return;
    }

    // 收集需要标红的关键点索引
    const highlight = new Set<number>();
    for (const v of violations) {
      const rule = config.rules.find((r) => r.id === v.ruleId);
      if (rule) {
        highlight.add(rule.triple.a);
        highlight.add(rule.triple.b);
        highlight.add(rule.triple.c);
      }
    }

    // 1. 画骨架连线
    // v4：画面是深色承载，所以骨架回归"白线"——但白线在明亮画面（窗户逆光）里会消失，
    // 所以先描一层深墨绿的"影子线"再叠白线，任何背景下都能看清。
    const lineWidth = Math.max(2, width / 320);
    ctx.lineCap = 'round';
    for (const [i, j] of SKELETON_CONNECTIONS) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (!p1 || !p2) {
        continue;
      }
      const visible = p1.visibility >= VISIBILITY_THRESHOLD && p2.visibility >= VISIBILITY_THRESHOLD;
      const x1 = p1.x * width;
      const y1 = p1.y * height;
      const x2 = p2.x * width;
      const y2 = p2.y * height;

      ctx.lineWidth = lineWidth + 2.5;
      ctx.strokeStyle = visible ? 'rgba(5, 14, 16, 0.42)' : 'rgba(5, 14, 16, 0.16)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = visible ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 2. 画关键点：正常态用青柠（品牌的色只落在关节上），违规关节转红
    const radius = Math.max(3, width / 220);
    for (let i = 0; i < landmarks.length; i += 1) {
      const p = landmarks[i];
      if (p.visibility < VISIBILITY_THRESHOLD) {
        continue;
      }
      const isBad = highlight.has(i);
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, isBad ? radius * 1.7 : radius, 0, Math.PI * 2);
      ctx.fillStyle = isBad ? '#F0857C' : '#C9F26B';
      ctx.fill();
      ctx.strokeStyle = isBad ? 'rgba(176, 74, 68, 0.9)' : 'rgba(5, 14, 16, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (isBad) {
        ctx.strokeStyle = 'rgba(240, 133, 124, 0.55)';
        ctx.lineWidth = Math.max(2, width / 260);
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, radius * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /** 清空画布 */
  clear(): void {
    if (!this.ctx || !this.canvas) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** 解绑 */
  detach(): void {
    this.ctx = null;
    this.canvas = null;
  }
}
