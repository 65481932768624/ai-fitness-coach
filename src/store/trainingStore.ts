/**
 * TrainingStore —— 训练记录持久化（localStorage）。
 *
 * key 带版本号 `fitness_coach.sessions.v1`，读写走 utils/storage.ts。
 * P1 可平滑升级到 IndexedDB。
 */

import { STORAGE_SESSIONS_KEY } from '../constants/config';
import type { SessionSummary } from '../types/training';
import { readJSON, removeKey, writeJSON } from '../utils/storage';

const MAX_SESSIONS = 100;

export class TrainingStore {
  private storageKey: string;

  constructor(storageKey: string = STORAGE_SESSIONS_KEY) {
    this.storageKey = storageKey;
  }

  /**
   * 保存一条训练记录（最新的排在最前）。
   * @param summary 会话汇总
   */
  saveSession(summary: SessionSummary): void {
    const sessions = this.getSessions();
    sessions.unshift(summary);
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    writeJSON(this.storageKey, trimmed);
  }

  /** 读取全部训练记录（按时间倒序） */
  getSessions(): SessionSummary[] {
    return readJSON<SessionSummary[]>(this.storageKey, []);
  }

  /**
   * 按 id 获取单条记录。
   * @param id 会话 id
   */
  getSession(id: string): SessionSummary | null {
    const sessions = this.getSessions();
    return sessions.find((s) => s.sessionId === id) ?? null;
  }

  /** 获取最近一条记录 */
  getLatestSession(): SessionSummary | null {
    const sessions = this.getSessions();
    return sessions.length > 0 ? sessions[0] : null;
  }

  /** 清空全部记录 */
  clear(): void {
    removeKey(this.storageKey);
  }
}

/** 全局单例 */
export const trainingStore = new TrainingStore();
