/**
 * PoseDetector —— 封装 MediaPipe PoseLandmarker。
 *
 * 职责：
 * - 初始化 WASM FilesetResolver 与 PoseLandmarker 实例
 * - 逐帧对 HTMLVideoElement 做推理，返回结构化 PoseResult
 * - 管理模型路径（本地优先，CDN 兜底由调用方决定）
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_WASM_ROOT } from '../constants/config';
import type { Landmark, PoseResult } from '../types/pose';
import { createEmptyPoseResult } from '../types/pose';

export class PoseDetector {
  private landmarker: PoseLandmarker | null = null;
  private lastTimestampMs = -1;
  private initialized = false;

  /**
   * 初始化检测器（加载 WASM + 模型）。
   * @param modelPath 模型文件地址（本地 `/models/...` 或 CDN https 地址）
   * @param numPoses 同时检测的人体数量，默认 1
   */
  async init(modelPath: string, numPoses = 1): Promise<void> {
    if (this.initialized) {
      return;
    }
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });
    this.initialized = true;
  }

  /** 是否已就绪 */
  isReady(): boolean {
    return this.initialized && this.landmarker !== null;
  }

  /**
   * 对一帧视频做姿态识别。
   * @param video 视频元素（需 readyState >= 2）
   * @param timestampMs 时间戳（ms，必须单调递增）
   * @returns PoseResult；异常时返回 detected=false 的空结果
   */
  detect(video: HTMLVideoElement, timestampMs: number): PoseResult {
    if (!this.landmarker || video.readyState < 2) {
      return createEmptyPoseResult(timestampMs);
    }

    // MediaPipe 要求时间戳严格递增
    let ts = timestampMs;
    if (ts <= this.lastTimestampMs) {
      ts = this.lastTimestampMs + 1;
    }
    this.lastTimestampMs = ts;

    try {
      const result = this.landmarker.detectForVideo(video, ts);
      const raw = result.landmarks;
      if (!raw || raw.length === 0 || raw[0].length === 0) {
        return createEmptyPoseResult(timestampMs);
      }

      const landmarks: Landmark[] = raw[0].map((lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z ?? 0,
        // MediaPipe NormalizedLandmark 仅提供 visibility；缺失时退回 0
        visibility: lm.visibility ?? 0,
      }));

      return {
        landmarks,
        timestampMs,
        detected: landmarks.length >= 33,
      };
    } catch (error) {
      console.warn('[PoseDetector] 推理失败，跳过本帧', error);
      return createEmptyPoseResult(timestampMs);
    }
  }

  /** 释放资源 */
  close(): void {
    try {
      this.landmarker?.close();
    } catch (error) {
      console.warn('[PoseDetector] 关闭失败', error);
    }
    this.landmarker = null;
    this.initialized = false;
    this.lastTimestampMs = -1;
  }
}
