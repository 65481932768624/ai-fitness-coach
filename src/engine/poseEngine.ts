/**
 * PoseEngine —— 主循环编排器（纯 TS，零 React 依赖）。
 *
 * 用 requestAnimationFrame 自跑，串联：
 * PoseDetector → LandmarkSmoother → ConfidenceGate → RepCounter / RuleEngine
 * → ScoringEngine → FeedbackManager → CanvasRenderer
 *
 * 主循环内任何环节异常都会被捕获并降级为「跳过本帧」，绝不抛出未捕获异常。
 */

import { PASS_SCORE, TARGET_FRAME_INTERVAL_MS } from '../constants/config';
import type { ExerciseConfig, RepCounterState } from '../types/exercise';
import type { Landmark } from '../types/pose';
import type {
  FrameSnapshot,
  FrameSnapshotCallback,
  HoldSample,
  RepRecord,
  RuleViolation,
  SessionSummary,
} from '../types/training';
import { generateId } from '../utils/format';
import { setVideoAspectRatio } from './angleCalculator';
import { CanvasRenderer } from './canvasRenderer';
import { ConfidenceGate } from './confidenceGate';
import { FeedbackManager } from './feedbackManager';
import { PoseDetector } from './poseDetector';
import { RepCounter } from './repCounter';
import { RuleEngine } from './ruleEngine';
import { ScoringEngine } from './scoringEngine';
import { LandmarkSmoother } from './smoother';

/** 引擎运行状态 */
type EngineStatus = 'idle' | 'running' | 'paused' | 'stopped';

export class PoseEngine {
  private detector: PoseDetector;
  private smoother: LandmarkSmoother;
  private gate: ConfidenceGate;
  private ruleEngine: RuleEngine | null = null;
  private repCounter: RepCounter | null = null;
  private scoring: ScoringEngine | null = null;
  private feedback: FeedbackManager;
  private renderer: CanvasRenderer;

  private config: ExerciseConfig | null = null;
  private video: HTMLVideoElement | null = null;

  private rafId = 0;
  private status: EngineStatus = 'idle';
  private frameCallback: FrameSnapshotCallback | null = null;
  private lastFrameTs = 0;

  // 会话统计
  private startedAtMs = 0;
  private startedAtIso = '';
  private repRecords: RepRecord[] = [];
  private holdSamples: HoldSample[] = [];
  private accumulatedViolations: RuleViolation[] = [];
  private currentRepViolations: RuleViolation[] = [];
  private lastRepEndMs = 0;
  private holdElapsedMs = 0;
  private lastHoldSampleMs = 0;
  private lastSnapshot: FrameSnapshot = PoseEngine.emptySnapshot();
  private stoppedSummary: SessionSummary | null = null;

  // 暂停累计：暂停时间不计入训练时长（否则挂机 10 分钟会污染记录）
  private pausedTotalMs = 0;
  private pausedAtMs = 0;

  constructor() {
    this.detector = new PoseDetector();
    this.smoother = new LandmarkSmoother();
    this.gate = new ConfidenceGate();
    this.feedback = new FeedbackManager();
    this.renderer = new CanvasRenderer();
  }

  /** 空快照工厂 */
  private static emptySnapshot(): FrameSnapshot {
    return {
      detected: false,
      phase: '',
      repCount: 0,
      currentScore: 0,
      lastFeedback: null,
      violations: [],
    };
  }

  /**
   * 初始化引擎。
   * @param video 视频元素
   * @param canvas 叠加 canvas
   * @param config 动作配置
   * @param modelPath 模型路径（本地或 CDN）
   */
  async init(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    config: ExerciseConfig,
    modelPath: string,
  ): Promise<void> {
    this.config = config;
    this.video = video;

    // 更新全局宽高比，保证角度计算准确
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoAspectRatio(video.videoWidth / video.videoHeight);
    }

    this.renderer.attach(canvas);
    this.smoother.reset();
    this.feedback.reset();

    this.ruleEngine = new RuleEngine(config, this.gate);
    this.scoring = new ScoringEngine(config.scoring);
    this.repCounter = config.mode === 'reps' && config.repCounter
      ? new RepCounter(config.repCounter, this.gate)
      : null;

    this.resetSessionStats();
    await this.detector.init(modelPath);
  }

  /** 重置会话统计 */
  private resetSessionStats(): void {
    this.repRecords = [];
    this.holdSamples = [];
    this.accumulatedViolations = [];
    this.currentRepViolations = [];
    this.lastRepEndMs = 0;
    this.holdElapsedMs = 0;
    this.lastHoldSampleMs = 0;
    this.stoppedSummary = null;
    this.lastSnapshot = PoseEngine.emptySnapshot();
    this.repCounter?.reset();
  }

  /**
   * 注册帧回调（供 React Hook 消费）。
   */
  onFrame(cb: FrameSnapshotCallback): void {
    this.frameCallback = cb;
  }

  /** 获取最近一次快照 */
  getSnapshot(): FrameSnapshot {
    return this.lastSnapshot;
  }

  /**
   * 开始主循环并播报入场提示。
   */
  start(): void {
    if (this.status === 'running') {
      return;
    }
    this.startedAtMs = performance.now();
    this.pausedTotalMs = 0;
    this.pausedAtMs = 0;
    this.lastFrameTs = 0;
    this.lastHoldSampleMs = this.startedAtMs;
    this.startedAtIso = new Date().toISOString();
    this.status = 'running';

    // 入场提示
    if (this.config) {
      const intro =
        this.config.mode === 'hold'
          ? `${this.config.name}开始，坚持住`
          : `开始${this.config.name}，注意姿势`;
      this.feedback.forceSpeak(intro, this.startedAtMs);
    }

    this.loop();
  }

  /** 暂停主循环 */
  pause(): void {
    if (this.status !== 'running') {
      return;
    }
    this.status = 'paused';
    this.pausedAtMs = performance.now();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.feedback.speak('已暂停', performance.now());
  }

  /** 恢复主循环 */
  resume(): void {
    if (this.status !== 'paused') {
      return;
    }
    this.status = 'running';
    this.lastFrameTs = 0;
    if (this.pausedAtMs > 0) {
      this.pausedTotalMs += performance.now() - this.pausedAtMs;
      this.pausedAtMs = 0;
    }
    this.feedback.speak('继续加油', performance.now());
    this.loop();
  }

  /**
   * 停止并返回会话汇总（幂等）。
   */
  stop(): SessionSummary {
    if (this.stoppedSummary) {
      return this.stoppedSummary;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.status = 'stopped';
    const summary = this.buildSummary();
    this.stoppedSummary = summary;
    this.feedback.reset();
    return summary;
  }

  /** 释放资源 */
  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.status = 'stopped';
    this.detector.close();
    this.renderer.detach();
    this.feedback.reset();
    this.video = null;
  }

  /** 语音开关透传 */
  setSpeechEnabled(enabled: boolean): void {
    this.feedback.setEnabled(enabled);
  }

  /** 语音音量透传 */
  setSpeechVolume(volume: number): void {
    this.feedback.setVolume(volume);
  }

  /** 重播上一条提示 */
  replayLastFeedback(): boolean {
    return this.feedback.replayLast(performance.now());
  }

  /** 主循环 */
  private loop = (): void => {
    if (this.status !== 'running') {
      return;
    }
    const now = performance.now();

    // 帧率上限控制
    if (now - this.lastFrameTs < TARGET_FRAME_INTERVAL_MS) {
      this.rafId = requestAnimationFrame(this.loop);
      return;
    }
    this.lastFrameTs = now;

    try {
      this.processFrame(now);
    } catch (error) {
      console.warn('[PoseEngine] 帧处理异常，跳过本帧', error);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  /** 处理单帧 */
  private processFrame(now: number): void {
    if (!this.video || !this.config) {
      return;
    }

    const result = this.detector.detect(this.video, now);

    if (!result.detected || !this.gate.isBodyDetected(result.landmarks)) {
      this.renderer.clear();
      this.emitSnapshot({
        ...PoseEngine.emptySnapshot(),
        phase: this.repCounter?.getPhaseLabel() ?? '',
        repCount: this.repCounter?.getCount() ?? 0,
        holdElapsedMs: this.config.mode === 'hold' ? this.holdElapsedMs : undefined,
      });
      return;
    }

    const smoothed = this.smoother.smooth(result.landmarks);

    if (this.config.mode === 'hold') {
      this.processHoldFrame(smoothed, now);
    } else {
      this.processRepFrame(smoothed, now);
    }
  }

  /** reps 模式单帧处理 */
  private processRepFrame(landmarks: Landmark[], now: number): void {
    if (!this.repCounter || !this.ruleEngine || !this.scoring || !this.config) {
      return;
    }

    const state: RepCounterState = this.repCounter.update(landmarks, now);
    const violations = this.ruleEngine.evaluate(landmarks, state.phase, now);

    // 累计本次 rep 的违规（去重：每规则每 rep 只记一次）
    for (const v of violations) {
      if (!this.currentRepViolations.some((x) => x.ruleId === v.ruleId)) {
        this.currentRepViolations.push(v);
      }
    }

    let currentScore = this.lastSnapshot.currentScore;

    // 完成一次 rep
    if (state.repJustCompleted) {
      const score = this.scoring.scoreRep(this.currentRepViolations);
      const durationMs =
        this.lastRepEndMs > 0 ? now - this.lastRepEndMs : now - this.startedAtMs;
      const record: RepRecord = {
        index: state.repCount,
        score,
        pass: score >= PASS_SCORE,
        violations: [...this.currentRepViolations],
        durationMs,
        timestampMs: now,
      };
      this.repRecords.push(record);
      this.accumulatedViolations.push(...this.currentRepViolations);
      this.currentRepViolations = [];
      this.lastRepEndMs = now;
      currentScore = score;
    }

    // 语音反馈
    const spoken = this.feedback.submit(violations, now);

    // 绘制
    this.renderer.render(landmarks, violations, this.config);

    this.emitSnapshot({
      detected: true,
      phase: state.phaseLabel,
      repCount: state.repCount,
      currentScore,
      lastFeedback: spoken ?? this.lastSnapshot.lastFeedback,
      violations,
    });
  }

  /** hold 模式单帧处理 */
  private processHoldFrame(landmarks: Landmark[], now: number): void {
    if (!this.ruleEngine || !this.config) {
      return;
    }
    const hold = this.config.hold;
    const sampleInterval = hold ? hold.sampleIntervalMs : 500;

    // 累计保持时长
    this.holdElapsedMs = now - this.startedAtMs;

    let violations = this.ruleEngine.evaluateAll(landmarks, now);
    let passRate = this.computePassRate();

    if (now - this.lastHoldSampleMs >= sampleInterval) {
      this.lastHoldSampleMs = now;
      const pass = violations.length === 0;
      this.holdSamples.push({ timestampMs: now, pass, violations: [...violations] });
      this.accumulatedViolations.push(...violations);
      passRate = this.computePassRate();
    }

    const spoken = this.feedback.submit(violations, now);
    this.renderer.render(landmarks, violations, this.config);

    this.emitSnapshot({
      detected: true,
      phase: '保持中',
      repCount: 0,
      currentScore: this.scoring ? this.scoring.scoreHold(passRate) : 0,
      holdElapsedMs: this.holdElapsedMs,
      passRate,
      lastFeedback: spoken ?? this.lastSnapshot.lastFeedback,
      violations,
    });
  }

  /** 计算 hold 模式达标率 */
  private computePassRate(): number {
    if (this.holdSamples.length === 0) {
      return 1;
    }
    const passCount = this.holdSamples.filter((s) => s.pass).length;
    return passCount / this.holdSamples.length;
  }

  /** 发出快照（Hook 侧负责节流） */
  private emitSnapshot(snapshot: FrameSnapshot): void {
    this.lastSnapshot = snapshot;
    if (this.frameCallback) {
      try {
        this.frameCallback(snapshot);
      } catch (error) {
        console.warn('[PoseEngine] 帧回调异常', error);
      }
    }
  }

  /** 汇总会话结果 */
  private buildSummary(): SessionSummary {
    const config = this.config;
    const endedAtMs = performance.now();
    const endedAtIso = new Date().toISOString();
    // 暂停中的时段不计入时长：以「进入暂停的时刻」作为有效结束点
    const activeEndMs =
      this.status === 'paused' && this.pausedAtMs > 0 ? this.pausedAtMs : endedAtMs;
    const durationMs = Math.max(0, activeEndMs - this.startedAtMs - this.pausedTotalMs);

    const topIssues = this.buildTopIssues();

    if (!config) {
      return {
        sessionId: generateId(),
        exerciseId: 'squat',
        exerciseName: '未知动作',
        startedAt: this.startedAtIso || endedAtIso,
        endedAt: endedAtIso,
        durationMs,
        mode: 'reps',
        totalReps: 0,
        passReps: 0,
        avgScore: 0,
        topIssues,
      };
    }

    if (config.mode === 'hold') {
      const passRate = this.computePassRate();
      const avgScore = this.scoring ? this.scoring.scoreHold(passRate) : 0;
      return {
        sessionId: generateId(),
        exerciseId: config.id,
        exerciseName: config.name,
        startedAt: this.startedAtIso || endedAtIso,
        endedAt: endedAtIso,
        durationMs,
        mode: 'hold',
        totalReps: 0,
        passReps: 0,
        avgScore,
        holdDurationMs: this.holdElapsedMs,
        passRate,
        topIssues,
      };
    }

    const totalReps = this.repRecords.length;
    const passReps = this.repRecords.filter((r) => r.pass).length;
    const avgScore =
      totalReps > 0
        ? Math.round(this.repRecords.reduce((sum, r) => sum + r.score, 0) / totalReps)
        : 0;

    return {
      sessionId: generateId(),
      exerciseId: config.id,
      exerciseName: config.name,
      startedAt: this.startedAtIso || endedAtIso,
      endedAt: endedAtIso,
      durationMs,
      mode: 'reps',
      totalReps,
      passReps,
      avgScore,
      topIssues,
    };
  }

  /** 统计 Top3 问题 */
  private buildTopIssues(): Array<{ ruleId: string; label: string; count: number }> {
    const counter = new Map<string, { label: string; count: number }>();
    for (const v of this.accumulatedViolations) {
      const entry = counter.get(v.ruleId);
      if (entry) {
        entry.count += 1;
      } else {
        counter.set(v.ruleId, { label: v.label, count: 1 });
      }
    }
    return Array.from(counter.entries())
      .map(([ruleId, info]) => ({ ruleId, label: info.label, count: info.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }
}
