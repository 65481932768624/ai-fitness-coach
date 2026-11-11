/**
 * usePoseEngine —— 桥接 PoseEngine 与 React。
 *
 * 设计要点（对应主理人硬性要求）：
 * - 引擎实例放在 ref，不参与 React 渲染；
 * - 引擎 rAF 自跑，回调快照通过 200ms 节流后才 setState，避免每帧触发渲染；
 * - stop() 时把 SessionSummary 写入 TrainingStore。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CDN_MODEL_PATH, LOCAL_MODEL_PATH, UI_UPDATE_INTERVAL_MS } from '../constants/config';
import { PoseEngine } from '../engine';
import { trainingStore } from '../store/trainingStore';
import type { ExerciseConfig } from '../types/exercise';
import type { FrameSnapshot, SessionSummary } from '../types/training';

export interface UsePoseEngineResult {
  /** 引擎 ref（供 ControlBar 等直接操控语音） */
  engineRef: React.MutableRefObject<PoseEngine | null>;
  /** 节流后的帧快照（供 HUD 渲染） */
  snapshot: FrameSnapshot;
  /** 引擎是否已就绪 */
  isReady: boolean;
  /** 是否运行中 */
  isRunning: boolean;
  /** 初始化错误 */
  error: string | null;
  /** 启动：初始化引擎 + 开始循环 */
  start: (config: ExerciseConfig) => Promise<void>;
  /** 暂停 */
  pause: () => void;
  /** 恢复 */
  resume: () => void;
  /** 停止并返回汇总（写入 store） */
  stop: () => SessionSummary | null;
  /** 重播上一条语音提示 */
  replay: () => void;
}

/** 空快照 */
const EMPTY_SNAPSHOT: FrameSnapshot = {
  detected: false,
  phase: '',
  repCount: 0,
  currentScore: 0,
  lastFeedback: null,
  violations: [],
};

export function usePoseEngine(
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
): UsePoseEngineResult {
  const engineRef = useRef<PoseEngine | null>(null);
  const lastUiUpdateRef = useRef<number>(0);
  const [snapshot, setSnapshot] = useState<FrameSnapshot>(EMPTY_SNAPSHOT);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** 卸载时销毁引擎 */
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  const start = useCallback(
    async (config: ExerciseConfig): Promise<void> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        setError('视频或画布未就绪，请稍后重试');
        return;
      }

      // 复用已有引擎，或新建
      if (!engineRef.current) {
        engineRef.current = new PoseEngine();
      }
      const engine = engineRef.current;

      // 新会话开始：清空上一轮残留的快照与节流计时
      setSnapshot(EMPTY_SNAPSHOT);
      lastUiUpdateRef.current = 0;

      // 节流快照
      engine.onFrame((snap) => {
        const now = performance.now();
        if (now - lastUiUpdateRef.current < UI_UPDATE_INTERVAL_MS) {
          return;
        }
        lastUiUpdateRef.current = now;
        setSnapshot(snap);
      });

      try {
        setError(null);
        await engine.init(video, canvas, config, LOCAL_MODEL_PATH);
        setIsReady(true);
        engine.start();
        setIsRunning(true);
      } catch (initError) {
        console.warn('[usePoseEngine] 本地模型初始化失败，尝试 CDN 兜底', initError);
        try {
          await engine.init(video, canvas, config, CDN_MODEL_PATH);
          setIsReady(true);
          engine.start();
          setIsRunning(true);
        } catch (cdnError) {
          console.error('[usePoseEngine] 引擎初始化失败', cdnError);
          setError('姿态识别模型加载失败，请检查网络或模型文件');
          setIsReady(false);
        }
      }
    },
    [videoRef, canvasRef],
  );

  const pause = useCallback((): void => {
    engineRef.current?.pause();
    setIsRunning(false);
  }, []);

  const resume = useCallback((): void => {
    engineRef.current?.resume();
    setIsRunning(true);
  }, []);

  const stop = useCallback((): SessionSummary | null => {
    const engine = engineRef.current;
    if (!engine) {
      setIsRunning(false);
      return null;
    }
    const summary = engine.stop();
    // 有效训练才入库：误触、秒退、只跑了两三秒的空白会话不再污染记录
    const meaningful =
      summary.durationMs >= 5000 ||
      summary.totalReps > 0 ||
      (summary.holdDurationMs ?? 0) > 3000;
    if (meaningful) {
      trainingStore.saveSession(summary);
    }
    setIsRunning(false);
    setSnapshot(EMPTY_SNAPSHOT);
    return summary;
  }, []);

  const replay = useCallback((): void => {
    engineRef.current?.replayLastFeedback();
  }, []);

  return { engineRef, snapshot, isReady, isRunning, error, start, pause, resume, stop, replay };
}
