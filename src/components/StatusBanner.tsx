/**
 * StatusBanner —— 异常态提示条（未检测到人 / 摄像头错误 / 模型加载中）。
 *
 * 居中悬浮在视频之上，仅在需要时显示。
 */

import { AlertCircle, Loader2, UserX } from 'lucide-react';

export type StatusBannerKind = 'info' | 'warn' | 'error' | 'loading';

export interface StatusBannerProps {
  /** 是否显示 */
  visible: boolean;
  /** 类型 */
  kind: StatusBannerKind;
  /** 提示文案 */
  message: string;
}

export function StatusBanner({ visible, kind, message }: StatusBannerProps): JSX.Element | null {
  if (!visible) {
    return null;
  }

  const toneMap: Record<StatusBannerKind, string> = {
    info: 'border-info/50 bg-info/10 text-sky-200',
    warn: 'border-warn/50 bg-warn/10 text-amber-200',
    error: 'border-danger/50 bg-danger/10 text-red-200',
    loading: 'border-base-600 bg-base-900/80 text-gray-200',
  };

  const icon =
    kind === 'loading' ? (
      <Loader2 size={20} className="animate-spin" />
    ) : kind === 'error' ? (
      <AlertCircle size={20} />
    ) : (
      <UserX size={20} />
    );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className={`flex max-w-[80%] items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium backdrop-blur ${toneMap[kind]}`}
      >
        {icon}
        <span>{message}</span>
      </div>
    </div>
  );
}

export default StatusBanner;
