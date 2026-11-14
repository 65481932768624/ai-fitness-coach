/**
 * useSpeech —— 语音能力检测与偏好设置（开关 / 音量 / 语速）。
 *
 * 偏好持久化到 localStorage，训练开始时由 LiveTrainingPage 应用到引擎。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_SPEECH_KEY } from '../constants/config';
import { FeedbackManager } from '../engine';
import { readJSON, writeJSON } from '../utils/storage';

export interface SpeechSettings {
  /** 是否启用语音 */
  enabled: boolean;
  /** 音量 0-1 */
  volume: number;
  /** 语速 0.5-2 */
  rate: number;
}

const DEFAULT_SETTINGS: SpeechSettings = {
  enabled: true,
  volume: 1,
  rate: 1.05,
};

/**
 * 两份设置是否等价。
 *
 * 用来跳过「挂载即写」：初始值本来就是从 localStorage 读出来的，
 * 再写回去没有任何信息增量，但在隐私模式或配额写满时会让
 * StorageNotice 在用户还没做任何操作时就弹出来。
 */
export function isSameSettings(a: SpeechSettings, b: SpeechSettings): boolean {
  return a.enabled === b.enabled && a.volume === b.volume && a.rate === b.rate;
}

export interface UseSpeechResult {
  /** 浏览器是否支持语音合成 */
  supported: boolean;
  /** 当前设置 */
  settings: SpeechSettings;
  /** 切换开关 */
  toggleEnabled: () => void;
  /** 设置音量 */
  setVolume: (v: number) => void;
  /** 设置语速 */
  setRate: (v: number) => void;
  /** 立即朗读一段文本（用于预览） */
  preview: (text: string) => void;
}

export function useSpeech(): UseSpeechResult {
  const [supported] = useState<boolean>(() => FeedbackManager.isSupported());
  const [settings, setSettings] = useState<SpeechSettings>(() =>
    readJSON<SpeechSettings>(STORAGE_SPEECH_KEY, DEFAULT_SETTINGS),
  );

  // 上一次真正落盘的值。首次渲染时与当前值相同，因此不会触发写入。
  const persistedRef = useRef<SpeechSettings>(settings);

  // 仅在用户改动过设置后写回，避免挂载时就写一次
  useEffect(() => {
    if (isSameSettings(persistedRef.current, settings)) {
      return;
    }
    if (writeJSON(STORAGE_SPEECH_KEY, settings)) {
      persistedRef.current = settings;
    }
    // 写入失败时不更新 persistedRef，下次改动会重试；提示条由 StorageNotice 负责
  }, [settings]);

  const toggleEnabled = useCallback((): void => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setVolume = useCallback((v: number): void => {
    setSettings((prev) => ({ ...prev, volume: Math.min(1, Math.max(0, v)) }));
  }, []);

  const setRate = useCallback((r: number): void => {
    setSettings((prev) => ({ ...prev, rate: Math.min(2, Math.max(0.5, r)) }));
  }, []);

  const preview = useCallback(
    (text: string): void => {
      if (!supported || !settings.enabled) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.volume = settings.volume;
        utterance.rate = settings.rate;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[useSpeech] 预览失败', err);
      }
    },
    [supported, settings.enabled, settings.volume, settings.rate],
  );

  return { supported, settings, toggleEnabled, setVolume, setRate, preview };
}
