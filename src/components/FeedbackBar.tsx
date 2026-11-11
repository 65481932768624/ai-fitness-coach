/**
 * FeedbackBar —— 视频下方当前提示文字条。
 *
 * v4：白底细胶囊 + 一个状态点。提示是"系统在安静地播报"，
 * 所以除了那个点，颜色不参与表达——错误用文字与点的颜色区分就够了。
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
      <div className="flex items-center justify-center gap-2 rounded-full border border-line bg-paper-pure px-5 py-2.5 text-[12.5px] text-ink-500">
        <ThumbsUp size={13} className="text-lime-deep" strokeWidth={2} />
        <span>{idleText}</span>
      </div>
    );
  }

  const Icon = isError ? AlertTriangle : Info;

  return (
    <div
      key={message}
      className={`flex animate-slide-up items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-[12.5px] font-medium ${
        isError
          ? 'border-danger/25 bg-danger/[.05] text-danger'
          : 'border-line bg-paper-pure text-ink-800'
      }`}
    >
      <Icon
        size={13}
        strokeWidth={2.2}
        className={isError ? 'text-danger' : 'text-warn'}
      />
      <span>{message}</span>
    </div>
  );
}

export default FeedbackBar;
