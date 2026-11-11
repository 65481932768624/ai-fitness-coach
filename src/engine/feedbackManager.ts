/**
 * FeedbackManager —— 语音播报管理（Web Speech API）。
 *
 * 特性：
 * - 同文案 3s 内去重，避免「复读机」；
 * - error 优先级高于 warn，严重错误抢播；
 * - 可开关 / 调音量 / 调语速；
 * - 支持重播上一条。
 *
 * 使用浏览器原生 `window.speechSynthesis`，零额外依赖。
 */

import { FEEDBACK_MIN_INTERVAL_MS } from '../constants/config';
import type { RuleViolation } from '../types/training';

export class FeedbackManager {
  private minIntervalMs: number;
  private lastSpokenAt: Map<string, number>;
  private enabled: boolean;
  private volume: number;
  private rate: number;
  private lastText: string | null;
  private lang: string;

  /**
   * @param minIntervalMs 同文案去重间隔（ms），默认 FEEDBACK_MIN_INTERVAL_MS
   */
  constructor(minIntervalMs: number = FEEDBACK_MIN_INTERVAL_MS) {
    this.minIntervalMs = minIntervalMs;
    this.lastSpokenAt = new Map<string, number>();
    this.enabled = true;
    this.volume = 1;
    this.rate = 1.05;
    this.lastText = null;
    this.lang = 'zh-CN';
  }

  /** 检测浏览器是否支持语音合成 */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * 提交本帧违规，按优先级选出候选文案并尝试播报。
   * - error 优先于 warn；
   * - 同文案在 minIntervalMs 内跳过；
   * @param violations 本帧违规列表
   * @param timestampMs 时间戳（ms）
   * @returns 实际播报的文案；未播报返回 null
   */
  submit(violations: RuleViolation[], timestampMs: number): string | null {
    if (violations.length === 0) {
      return null;
    }

    // 优先级排序：error 在前，其次按时间
    const sorted = [...violations].sort((a, b) => {
      if (a.severity === b.severity) {
        return a.timestampMs - b.timestampMs;
      }
      return a.severity === 'error' ? -1 : 1;
    });

    for (const v of sorted) {
      if (this.speak(v.message, timestampMs)) {
        return v.message;
      }
    }
    return null;
  }

  /**
   * 直接播报一段文案（带去重）。
   * @param text 文案
   * @param timestampMs 时间戳（ms）
   * @returns 是否实际播报
   */
  speak(text: string, timestampMs: number): boolean {
    if (!text || !this.enabled || !FeedbackManager.isSupported()) {
      return false;
    }

    const last = this.lastSpokenAt.get(text);
    if (last !== undefined && timestampMs - last < this.minIntervalMs) {
      return false;
    }

    try {
      // 避免队列堆积：仅保留最新一条
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.volume = this.volume;
      utterance.rate = this.rate;
      window.speechSynthesis.speak(utterance);

      this.lastSpokenAt.set(text, timestampMs);
      this.lastText = text;
      this.pruneMap(timestampMs);
      return true;
    } catch (error) {
      console.warn('[FeedbackManager] 语音播报失败', error);
      return false;
    }
  }

  /** 强制播报（忽略去重，用于入场提示 / 重播） */
  forceSpeak(text: string, timestampMs: number): boolean {
    this.lastSpokenAt.delete(text);
    return this.speak(text, timestampMs);
  }

  /**
   * 重播上一条文案。
   * @param timestampMs 当前时间戳（ms）
   */
  replayLast(timestampMs: number): boolean {
    if (!this.lastText) {
      return false;
    }
    return this.forceSpeak(this.lastText, timestampMs);
  }

  /** 清空过期去重记录，避免 Map 无限增长 */
  private pruneMap(timestampMs: number): void {
    for (const [key, ts] of this.lastSpokenAt.entries()) {
      if (timestampMs - ts > this.minIntervalMs * 4) {
        this.lastSpokenAt.delete(key);
      }
    }
  }

  /** 语音开关 */
  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value && FeedbackManager.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  /** 是否启用 */
  isEnabled(): boolean {
    return this.enabled;
  }

  /** 设置音量 0-1 */
  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
  }

  /** 设置语速 0.5-2 */
  setRate(value: number): void {
    this.rate = Math.min(2, Math.max(0.5, value));
  }

  /** 重置状态 */
  reset(): void {
    this.lastSpokenAt.clear();
    this.lastText = null;
    if (FeedbackManager.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
