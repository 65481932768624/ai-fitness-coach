/**
 * 姿态数据结构定义。
 *
 * 对应 MediaPipe BlazePose 的 33 个归一化关键点。
 */

/** 单个关键点（MediaPipe NormalizedLandmark 的语义子集） */
export interface Landmark {
  /** 归一化 x 坐标，0-1（相对视频宽度） */
  x: number;
  /** 归一化 y 坐标，0-1（相对视频高度） */
  y: number;
  /** 相对深度，值越小越靠近摄像头 */
  z: number;
  /** 可见度置信度，0-1 */
  visibility: number;
}

/** 一帧姿态识别结果 */
export interface PoseResult {
  /** 长度 33 的关键点数组，顺序固定，见 constants/landmarks.ts */
  landmarks: Landmark[];
  /** 采样时间戳（performance.now()，单位 ms） */
  timestampMs: number;
  /** 本帧是否检测到人体 */
  detected: boolean;
}

/** 平滑后的姿态结果（结构与 PoseResult 相同，语义上为滤波后数据） */
export type SmoothedPoseResult = PoseResult;

/** 关键点索引类型（0-32） */
export type LandmarkIndex = number;

/** 空关键点数组工厂（全部字段为 0，visibility 为 0） */
export function createEmptyLandmarks(): Landmark[] {
  return Array.from({ length: 33 }, (): Landmark => ({ x: 0, y: 0, z: 0, visibility: 0 }));
}

/** 构造一个未检测到的空姿态结果 */
export function createEmptyPoseResult(timestampMs: number): PoseResult {
  return { landmarks: createEmptyLandmarks(), timestampMs, detected: false };
}
