/**
 * localStorage 封装：统一 key 前缀、版本号与 JSON 序列化，并做异常降级。
 *
 * 降级分两层：
 * 1. 异常不外抛 —— 隐私模式 / 配额写满时整站不能崩；
 * 2. 失败要能被看见 —— 通过 subscribeStorageError 通知订阅方（页面顶部提示条），
 *    否则用户以为记录存上了，实际静默丢失。
 */

/** 存储失败事件 */
export interface StorageFailure {
  /** 出错的 key */
  key: string;
  /** 失败原因 */
  reason: string;
  /** 面向用户的说明 */
  message: string;
  /** 发生时间戳（Date.now()） */
  timestamp: number;
}

type StorageErrorListener = (failure: StorageFailure) => void;

/** 订阅者集合 */
const listeners = new Set<StorageErrorListener>();

/** 同一 key 的提示节流：避免每帧写失败就弹一次 */
const lastNotifiedAt = new Map<string, number>();
const NOTIFY_THROTTLE_MS = 5000;

/**
 * 订阅存储失败事件。
 * @param listener 回调
 * @returns 取消订阅函数
 */
export function subscribeStorageError(listener: StorageErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 广播一次失败（带节流） */
function emitFailure(key: string, error: unknown): void {
  const now = Date.now();
  const last = lastNotifiedAt.get(key) ?? 0;
  if (now - last < NOTIFY_THROTTLE_MS) {
    return;
  }
  lastNotifiedAt.set(key, now);

  const isQuota =
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

  const failure: StorageFailure = {
    key,
    reason: error instanceof Error ? error.name : 'unknown',
    message: isQuota
      ? '浏览器存储空间已满，本次记录未能保存。清理旧记录或换用普通窗口后可恢复。'
      : '当前浏览器禁止本地存储（常见于隐私/无痕模式），本次记录不会保留。',
    timestamp: now,
  };

  for (const listener of listeners) {
    try {
      listener(failure);
    } catch (listenerError) {
      console.warn('[storage] 订阅回调抛错', listenerError);
    }
  }
}

/**
 * 安全读取并反序列化 localStorage 值。
 * @param key 存储键
 * @param fallback 解析失败或不存在时返回的默认值
 */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] 读取 ${key} 失败，使用默认值`, error);
    return fallback;
  }
}

/**
 * 序列化并写入 localStorage。失败时会广播一次 StorageFailure。
 * @param key 存储键
 * @param value 待写入的值
 * @returns 是否写入成功
 */
export function writeJSON<T>(key: string, value: T): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      emitFailure(key, new Error('localStorage unavailable'));
      return false;
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] 写入 ${key} 失败`, error);
    emitFailure(key, error);
    return false;
  }
}

/**
 * 删除指定 key。失败时同样广播。
 */
export function removeKey(key: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] 删除 ${key} 失败`, error);
    emitFailure(key, error);
  }
}
