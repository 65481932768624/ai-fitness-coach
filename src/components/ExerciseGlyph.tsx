/**
 * ExerciseGlyph —— 动作专属线性图标（自绘 SVG，统一 24 网格 / 2px 描边）。
 *
 * 为什么不用通用图标：三个动作的形态差异本身就是最重要的识别信息，
 * 复用同一个图标会让动作卡片看起来一模一样。这里为每个动作画了侧视剪影。
 */

import type { ExerciseId } from '../types/exercise';

export interface ExerciseGlyphProps {
  /** 动作 id */
  id: ExerciseId | string;
  /** 尺寸（px） */
  size?: number;
  /** 额外的 class */
  className?: string;
}

/** 每个动作的路径（24 网格，stroke 2，圆头圆角） */
const PATHS: Record<string, JSX.Element> = {
  squat: (
    <>
      <circle cx="15" cy="4.4" r="2.1" fill="currentColor" stroke="none" />
      <path d="M14.8 6.5 12.4 11.8" />
      <path d="M12.4 11.8 7.6 14.6" />
      <path d="M7.6 14.6 8.2 19.8" />
      <path d="M8.2 19.8h3.4" />
      <path d="M14 8.2 17.8 8.2 19.2 6.4" />
      <circle cx="12.4" cy="11.8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="7.6" cy="14.6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.2" cy="19.8" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  pushup: (
    <>
      <circle cx="4.8" cy="10" r="2.1" fill="currentColor" stroke="none" />
      <path d="M6.8 10.8 15.8 12.4" />
      <path d="M15.8 12.4 19.2 13.8 21.2 19.4" />
      <path d="M8.8 11.2 9.5 15.2 9.8 19.4" />
      <circle cx="15.8" cy="12.4" r="1.15" fill="currentColor" stroke="none" />
      <path d="M3 19.4h18" strokeDasharray="1.5 2.4" opacity="0.4" />
    </>
  ),
  plank: (
    <>
      <circle cx="4.6" cy="10.2" r="2.1" fill="currentColor" stroke="none" />
      <path d="M6.6 10.9 20.2 11.6" />
      <path d="M8.2 11.1v8.3" />
      <path d="M20.2 11.6 21.8 19.4" />
      <path d="M3 19.4h18" strokeDasharray="1.5 2.4" opacity="0.4" />
    </>
  ),
};

/** 兜底图标（未注册的动作） */
const FALLBACK = (
  <>
    <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
    <path d="M12 7.5v6" />
    <path d="M12 13.5 9 19" />
    <path d="m12 13.5 3 5.5" />
    <path d="M8 9.5h8" />
  </>
);

export function ExerciseGlyph({ id, size = 24, className }: ExerciseGlyphProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[id] ?? FALLBACK}
    </svg>
  );
}

/**
 * 部位配色（图标底 / 前景 / 圆点）。
 *
 * v4：白卡上的图标块走"极浅灰绿底 + 深墨绿线"，只有圆点带一点色相，
 * 这样三张卡并排时不会变成三种颜色在抢戏——强调色留给青柠，别分给它。
 */
export const BODY_TONE: Record<string, { bg: string; text: string; dot: string }> = {
  legs: { bg: 'bg-[#EFF3E6]', text: 'text-[#58712C]', dot: 'bg-[#A9D93F]' },
  chest: { bg: 'bg-[#E9EFEE]', text: 'text-[#2C5450]', dot: 'bg-[#5FA79A]' },
  core: { bg: 'bg-[#F2EEE6]', text: 'text-[#7A6338]', dot: 'bg-[#C4A46B]' },
};

export default ExerciseGlyph;