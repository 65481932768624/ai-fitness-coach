/**
 * MediaPipe BlazePose 33 个关键点索引常量。
 *
 * 索引由 MediaPipe 官方固定，全项目统一引用，禁止硬编码数字。
 */

import type { JointTriple } from '../types/exercise';

/** 33 关键点索引常量 */
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/** 常用三点组合（跨动作复用），顶点为三点中间者 */
export const TRIPLES: Record<string, JointTriple> = {
  LEFT_KNEE: { a: LM.LEFT_HIP, b: LM.LEFT_KNEE, c: LM.LEFT_ANKLE },
  RIGHT_KNEE: { a: LM.RIGHT_HIP, b: LM.RIGHT_KNEE, c: LM.RIGHT_ANKLE },
  LEFT_HIP: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
  RIGHT_HIP: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_KNEE },
  LEFT_ELBOW: { a: LM.LEFT_SHOULDER, b: LM.LEFT_ELBOW, c: LM.LEFT_WRIST },
  RIGHT_ELBOW: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_ELBOW, c: LM.RIGHT_WRIST },
  LEFT_TORSO: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
  RIGHT_TORSO: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_KNEE },
  LEFT_BODY_LINE: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
  RIGHT_BODY_LINE: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_ANKLE },
};

/** 骨架连线（用于 Canvas 绘制），成对的关键点索引 */
export const SKELETON_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // 面部
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  // 肩 / 颈
  [11, 12],
  // 左臂
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // 右臂
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // 躯干
  [11, 23], [12, 24], [23, 24],
  // 左腿
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // 右腿
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];
