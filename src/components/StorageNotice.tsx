/**
 * StorageNotice —— 本地存储失败提示条。
 *
 * localStorage 在隐私模式或配额写满时会静默失败，用户以为记录存上了，
 * 实际什么都没留下。这里把 storage.ts 广播的失败事件变成页面顶部一条可关闭的提示。
 *
 * 位置在 Layout 的顶栏下方，粘性定位，不遮挡内容。
 */

import { AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscribeStorageError, type StorageFailure } from '../utils/storage';

export interface StorageNoticeProps {
  /** 自动消失时长（ms），传 0 表示不自动消失，默认 8000 */
  autoHideMs?: number;
}

export function StorageNotice({ autoHideMs = 8000 }: StorageNoticeProps): JSX.Element | null {
  const [failure, setFailure] = useState<StorageFailure | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeStorageError((next) => {
      setFailure(next);
    });
    return unsubscribe;
  }, []);

  // 自动隐藏
  useEffect(() => {
    if (!failure || autoHideMs <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setFailure(null), autoHideMs);
    return () => window.clearTimeout(timer);
  }, [failure, autoHideMs]);

  if (!failure) {
    return null;
  }

  return (
    <div className="sticky top-[64px] z-30 mx-auto w-full max-w-[1180px] px-4 pt-3 sm:px-8">
      <div className="flex items-start gap-2.5 rounded-card border border-warn/35 bg-warn/[.08] px-4 py-3 shadow-soft">
        <AlertCircle size={14} className="mt-[2px] shrink-0 text-warn" strokeWidth={2.2} />
        <p className="flex-1 text-[12px] leading-relaxed text-ink-700">{failure.message}</p>
        <button
          type="button"
          aria-label="关闭提示"
          className="shrink-0 text-ink-400 transition-colors hover:text-ink-900"
          onClick={() => setFailure(null)}
        >
          <X size={13} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

export default StorageNotice;
