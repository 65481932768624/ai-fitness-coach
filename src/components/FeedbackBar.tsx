/**
 * FeedbackBar —— 底部当前提示文字条。
 *
 * 有提示时显示文案（error 红色 / warn 黄色），无提示时显示鼓励语。
 */

import { AlertTriangle, Info, ThumbsUp } from 'lucide-react';

export interface FeedbackBarProps {
  /** 当前提示文案 */
  message: string | null;
  /** 是否处于错误级别（error） */
  isError: boolean;
  /** 无提示时的默认鼓励语 */
  idleText?: string;
}

export function FeedbackBar({
  message,
  isError,
  idleText = '保持呼吸，动作稳一点',
}: FeedbackBarProps): JSX.Element {
  if (!message) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-base-700 bg-base-900/80 px-4 py-3 text-sm text-gray-400 backdrop-blur">
        <ThumbsUp size={16} className="text-accent" />
        <span>{idleText}</span>
      </div>
    );
  }

  const Icon = isError ? AlertTriangle : Info;
  const tone = isError
    ? 'border-danger/50 bg-danger/10 text-red-200'
    : 'border-warn/50 bg-warn/10 text-amber-200';

  return (
    <div
      key={message}
      className={`flex animate-slide-up items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-medium backdrop-blur ${tone}`}
    >
      <Icon size={18} />
      <span>{message}</span>
    </div>
  );
}

export default FeedbackBar;
