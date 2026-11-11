/**
 * ScoreRing —— 环形分数可视化（纯 SVG）。
 *
 * v4：参考稿的分数是"青柠大数字 + 极细轨道"，所以环只留 4px 弧，
 * 轨道压在 white/10 上，弧用青柠渐变（低分段才偏红）。
 * onDark 决定文字与轨道色，深色卡上是默认用法。
 */

import { clampScore } from '../utils/format';

export interface ScoreRingProps {
  /** 分数 0-100 */
  score: number;
  /** 直径（px），默认 160 */
  size?: number;
  /** 环粗（px），默认 4 */
  strokeWidth?: number;
  /** 中心说明文字 */
  label?: string;
  /** 是否放在深色底上 */
  onDark?: boolean;
}

/** 分数段 → 渐变色 */
function palette(score: number): [string, string] {
  if (score >= 85) {
    return ['#E4FA9E', '#C9F26B'];
  }
  if (score >= 70) {
    return ['#DCF7A0', '#A9D93F'];
  }
  if (score >= 50) {
    return ['#EFD79A', '#C79A3E'];
  }
  return ['#E8A9A2', '#C4574B'];
}

export function ScoreRing({
  score,
  size = 168,
  strokeWidth = 4,
  label = '综合评分',
  onDark = true,
}: ScoreRingProps): JSX.Element {
  const safeScore = clampScore(score, 0, 100);
  const radius = (size - strokeWidth) / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeScore / 100);
  const [from, to] = palette(safeScore);
  const gradientId = `score-ring-${size}`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} ${safeScore} 分`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={onDark ? 'rgba(255,255,255,.12)' : '#ECF0EB'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className={`num text-[2.9rem] font-semibold leading-none tracking-[-.04em] ${
            onDark ? 'text-lime' : 'text-ink-900'
          }`}
        >
          {safeScore}
        </span>
        <span
          className={`mt-2.5 text-[9.5px] uppercase tracking-[.2em] ${
            onDark ? 'text-white/40' : 'text-ink-400'
          }`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default ScoreRing;
