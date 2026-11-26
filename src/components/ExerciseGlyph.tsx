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
  benchpress: (
    <>
      <path d="M3.4 4h17.2" />
      <circle cx="6.2" cy="10.2" r="1.8" fill="currentColor" stroke="none" />
      <path d="M8 11 16.4 12.8" />
      <path d="M8.4 10.8 7.6 5" />
      <path d="M10.4 11.2 11.4 5" />
      <path d="M4 16.8h16" />
      <path d="M16.4 12.8 19 16.8" />
    </>
  ),
  pulldown: (
    <>
      <path d="M3.2 4.2h17.6" />
      <circle cx="12" cy="8.6" r="1.9" fill="currentColor" stroke="none" />
      <path d="M5.8 4.6 9.8 9.6" />
      <path d="M18.2 4.6 14.2 9.6" />
      <path d="M12 10.6v4" />
      <path d="M12 14.6 8.8 17.4V20.2" />
      <path d="M12 14.6 15.2 17.4V20.2" />
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
  // ---- 家族图标（库动作共用）----
  press: (
    <>
      <path d="M4 7h16" />
      <circle cx="12" cy="11" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12 12.7v4.6" />
      <path d="M12 17.3 8.8 20" />
      <path d="m12 17.3 3.2 2.7" />
    </>
  ),
  fly: (
    <>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M10.5 10.8 5.4 7.2" />
      <path d="M13.5 10.8 18.6 7.2" />
      <path d="M5.4 7.2c-1.8 2.4-1.8 5.6 0 8" />
      <path d="M18.6 7.2c1.8 2.4 1.8 5.6 0 8" />
    </>
  ),
  dip: (
    <>
      <path d="M4.4 6.2v13.6" />
      <path d="M19.6 6.2v13.6" />
      <path d="M4.4 6.2h4" />
      <path d="M19.6 6.2h-4" />
      <circle cx="12" cy="8.4" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 10.4 8.9 14.8" />
      <path d="m12 10.4 3.1 4.4" />
    </>
  ),
  row: (
    <>
      <path d="M3 5.5h18" />
      <path d="M7.5 5.5v9.5" />
      <path d="M16.5 5.5v9.5" />
      <circle cx="12" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 13 10.8 17.6" />
      <path d="m12 13 1.2 4.6" />
    </>
  ),
  'straight-arm': (
    <>
      <path d="M3 4.6h18" />
      <path d="M12 4.6v3" />
      <path d="M12 7.6 7 12.6" />
      <path d="M12 7.6 17 12.6" />
      <path d="M7 12.6 5 19" />
      <path d="M17 12.6 19 19" />
    </>
  ),
  deadlift: (
    <>
      <path d="M4 9h16" />
      <circle cx="4" cy="10.8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="20" cy="10.8" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 9v4" />
      <circle cx="12" cy="6.6" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12 13 9.4 18.6" />
      <path d="m12 13 2.6 5.6" />
    </>
  ),
  // ---- v8 新增家族 ----
  hinge: (
    <>
      <circle cx="15.6" cy="6.4" r="1.8" fill="currentColor" stroke="none" />
      <path d="M14.4 8 9.6 11.4" />
      <path d="M9.6 11.4 9.4 15" />
      <path d="M9.4 15 7.4 19.6" />
      <path d="M9.4 15 11.6 19.6" />
      <path d="M4 19.6h16" strokeDasharray="1.5 2.4" opacity="0.4" />
    </>
  ),
  lunge: (
    <>
      <circle cx="12" cy="4.6" r="1.8" fill="currentColor" stroke="none" />
      <path d="M12 6.5v5" />
      <path d="M12 11.5 7.6 14.4" />
      <path d="M7.6 14.4 6 19.4" />
      <path d="M12 11.5 16.4 14.4" />
      <path d="M16.4 14.4 18.4 19.4" />
    </>
  ),
  bridge: (
    <>
      <circle cx="5.4" cy="12.6" r="1.7" fill="currentColor" stroke="none" />
      <path d="M7 13 12 10" />
      <path d="M12 10 16.6 13.4" />
      <path d="M16.6 13.4 18.4 18.6" />
      <path d="M7 13 6 18.6" />
      <path d="M4 19h17" strokeDasharray="1.5 2.4" opacity="0.4" />
    </>
  ),
  curl: (
    <>
      <circle cx="8" cy="5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M8.6 6.6 10.6 12" />
      <path d="M10.6 12 15.4 9.4" />
      <path d="M15.4 9.4 17.6 11.4" />
    </>
  ),
  triceps: (
    <>
      <circle cx="7.4" cy="6" r="1.7" fill="currentColor" stroke="none" />
      <path d="M8 7.6 10.4 12.6" />
      <path d="M10.4 12.6 15 15.6" />
      <path d="M15 15.6 17.4 13" />
    </>
  ),
  raise: (
    <>
      <circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M12 6.8v5" />
      <path d="M12 8.6 6.4 8.2" />
      <path d="M12 8.6 17.6 8.2" />
      <path d="M12 11.8 9 19" />
      <path d="M12 11.8 15 19" />
    </>
  ),
  calf: (
    <>
      <path d="M6 19.6h9" />
      <path d="M12 5v9" />
      <path d="M12 14 10.6 19.6" />
      <path d="M12 14 13.8 19.6" />
      <path d="M9 19.6 6.4 17.6" />
      <circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  crunch: (
    <>
      <circle cx="6.6" cy="9.4" r="1.7" fill="currentColor" stroke="none" />
      <path d="M8.2 10.2 13.4 12.6" />
      <path d="M13.4 12.6 16.6 9.4" />
      <path d="M16.6 9.4 19.4 12.2" />
      <path d="M4 19h16" strokeDasharray="1.5 2.4" opacity="0.4" />
    </>
  ),
  cardio: (
    <>
      <circle cx="10" cy="5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M10 6.8 12 11" />
      <path d="M12 11 6.6 14.6" />
      <path d="M12 11 16 14.4" />
      <path d="M6.6 14.6 5.4 19.6" />
      <path d="M16 14.4 18.2 19.6" />
      <path d="M2 20.2h20" strokeDasharray="1.5 2.4" opacity="0.4" />
    </>
  ),
  leg: (
    <>
      <circle cx="9" cy="5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M9 6.8 10.4 12" />
      <path d="M10.4 12 15.6 13.4" />
      <path d="M15.6 13.4 16.4 18.6" />
      <path d="M4 19h17" strokeDasharray="1.5 2.4" opacity="0.4" />
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
  back: { bg: 'bg-[#EEECF6]', text: 'text-[#4C4370]', dot: 'bg-[#8E7CC3]' },
  glutes: { bg: 'bg-[#F7EBEF]', text: 'text-[#7A3E52]', dot: 'bg-[#C97B96]' },
  shoulders: { bg: 'bg-[#E9F1F5]', text: 'text-[#2F5666]', dot: 'bg-[#6FA8BE]' },
  arms: { bg: 'bg-[#F2EFE8]', text: 'text-[#6B5B33]', dot: 'bg-[#C2A45E]' },
  calves: { bg: 'bg-[#EDF2EE]', text: 'text-[#3D5E45]', dot: 'bg-[#7FA98A]' },
  forearms: { bg: 'bg-[#F0EEF3]', text: 'text-[#544A63]', dot: 'bg-[#9A8CB0]' },
  cardio: { bg: 'bg-[#FBEEEA]', text: 'text-[#8A4433]', dot: 'bg-[#D2705A]' },
};

export default ExerciseGlyph;