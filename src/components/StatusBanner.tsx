/**
 * StatusBanner —— 异常态提示条（未检测到人 / 摄像头错误 / 模型加载中）。
 *
 * v4：参考稿里"正在识别动作"是一枚白胶囊 + 青柠点，压在画面正中。
 * 沿用这个做法：白实心胶囊负责可读性，状态只由左侧那个点的颜色表达，
 * 整块彩色底会立刻把画面拉廉价。
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

  const dot =
    kind === 'error'
      ? 'bg-danger'
      : kind === 'warn'
        ? 'bg-warn'
        : kind === 'loading'
          ? 'bg-aqua-deep'
          : 'bg-lime-deep';

  const icon =
    kind === 'loading' ? (
      <Loader2 size={13} className="animate-spin text-[#4A6365]" />
    ) : kind === 'error' ? (
      <AlertCircle size={13} className="text-danger" />
    ) : kind === 'warn' ? (
      <UserX size={13} className="text-warn" />
    ) : null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center px-4 pb-4 sm:items-center sm:px-6 sm:pb-0">
      <div className="glass-light flex max-w-full items-center gap-2 rounded-full px-4 py-2 shadow-[0_18px_44px_-26px_rgba(0,0,0,.9)]">
        {kind === 'loading' ? icon : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
        {kind === 'loading' ? null : icon}
        <span className="text-[12px] font-medium leading-relaxed text-ink-800">{message}</span>
      </div>
    </div>
  );
}

export default StatusBanner;
