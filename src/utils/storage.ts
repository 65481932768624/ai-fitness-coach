/**
 * localStorage 封装：统一 key 前缀、版本号与 JSON 序列化，并做异常降级。
 */

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
 * 序列化并写入 localStorage。
 * @param key 存储键
 * @param value 待写入的值
 * @returns 是否写入成功
 */
export function writeJSON<T>(key: string, value: T): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[storage] 写入 ${key} 失败`, error);
    return false;
  }
}

/**
 * 删除指定 key。
 */
export function removeKey(key: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] 删除 ${key} 失败`, error);
  }
}
