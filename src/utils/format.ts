/**
 * 时间 / 分数格式化工具。
 */

/**
 * 将毫秒格式化为 `mm:ss`（可含小时则 `h:mm:ss`）。
 * @param ms 毫秒
 * @returns 形如 `02:35` 的字符串；非法输入返回 `00:00`
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * 将 0-1 的比例格式化为百分比整数字符串。
 * @param ratio 0-1 比例
 * @returns 形如 `86%`
 */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) {
    return '0%';
  }
  const clamped = Math.min(1, Math.max(0, ratio));
  return `${Math.round(clamped * 100)}%`;
}

/**
 * 分数取整并按范围约束。
 * @param score 原始分数
 * @param min 下限，默认 0
 * @param max 上限，默认 100
 */
export function clampScore(score: number, min = 0, max = 100): number {
  if (!Number.isFinite(score)) {
    return min;
  }
  return Math.round(Math.min(max, Math.max(min, score)));
}

/**
 * 数值区间约束。
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * 将 ISO 时间串格式化为本地可读时间。
 * @param iso ISO 8601 字符串
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * 生成简易唯一 id（优先使用 crypto.randomUUID）。
 */
export function generateId(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `id-${Date.now().toString(36)}-${rand}`;
}
