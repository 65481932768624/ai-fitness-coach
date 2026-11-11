/**
 * 角度计算工具。
 *
 * 说明：MediaPipe 归一化坐标 x/y 分别相对视频宽/高归一化，
 * 若直接计算会因宽高比产生角度偏差，故支持传入 aspectRatio 将 x 还原为像素比例。
 * 全项目统一使用「度」。
 */

import type { JointTriple } from '../types/exercise';
import type { Landmark } from '../types/pose';

/** 二维向量 */
interface Vec2 {
  x: number;
  y: number;
}

/** 视频宽高比（宽/高），默认 16/9。由 PoseEngine 在初始化时按视频实际尺寸更新 */
let videoAspectRatio = 16 / 9;

/**
 * 更新全局宽高比（PoseEngine 在拿到 video 尺寸后调用）。
 */
export function setVideoAspectRatio(ratio: number): void {
  if (Number.isFinite(ratio) && ratio > 0) {
    videoAspectRatio = ratio;
  }
}

/** 将归一化关键点转为等比二维向量（x 乘以宽高比，y 保持） */
function toVec(lm: Landmark): Vec2 {
  return { x: lm.x * videoAspectRatio, y: lm.y };
}

/**
 * 计算三点夹角（顶点为 b），返回角度制 0-180。
 * @param a 端点 A
 * @param b 顶点 B
 * @param c 端点 C
 * @returns 角度（度，四舍五入到整数）；非法输入返回 0
 */
export function calcAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const va = toVec(a);
  const vb = toVec(b);
  const vc = toVec(c);

  const v1: Vec2 = { x: va.x - vb.x, y: va.y - vb.y };
  const v2: Vec2 = { x: vc.x - vb.x, y: vc.y - vb.y };

  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 < 1e-6 || len2 < 1e-6) {
    return 0;
  }

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cos = dot / (len1 * len2);
  const clamped = Math.min(1, Math.max(-1, cos));
  return Math.round((Math.acos(clamped) * 180) / Math.PI);
}

/**
 * 从关键点数组 + 三点索引直接计算角度。
 * @param landmarks 关键点数组
 * @param triple 三点索引组合
 * @returns 角度（度）；索引越界返回 0
 */
export function calcJointAngle(landmarks: Landmark[], triple: JointTriple): number {
  const a = landmarks[triple.a];
  const b = landmarks[triple.b];
  const c = landmarks[triple.c];
  if (!a || !b || !c) {
    return 0;
  }
  return calcAngle(a, b, c);
}

/**
 * 计算两点连线与竖直方向的夹角，返回 0-180。
 * 竖直向下为 0°，用于躯干直立/俯身判定。
 * @param a 起点
 * @param b 终点
 */
export function calcVerticalAngle(a: Landmark, b: Landmark): number {
  const va = toVec(a);
  const vb = toVec(b);
  const dx = vb.x - va.x;
  const dy = vb.y - va.y;
  if (Math.hypot(dx, dy) < 1e-6) {
    return 0;
  }
  // 与竖直方向 (0, 1) 的夹角。atan2 取 dx 与 dy 的比值
  const angle = Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
  return Math.round(angle);
}

/**
 * 计算两点水平距离（归一化 x 差值绝对值）。
 * 用于判断膝盖内扣等横向对齐问题。
 */
export function calcHorizontalDistance(a: Landmark, b: Landmark): number {
  return Math.abs(a.x - b.x);
}
