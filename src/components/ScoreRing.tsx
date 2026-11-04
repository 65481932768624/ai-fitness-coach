/**
 * ScoreRing —— 环形分数可视化（纯 SVG）。
 *
 * v2：环形渐变 + 端点辉光 + 中心数字，分数段决定色相。
 */

import { clampScore } from '../utils/format';

export interface ScoreRingProps {
  /** 分数 0-100 */
  score: number;
  /** 直径（px），默认 160 */
  size?: number;
  /** 环粗（px），默认 12 */
  strokeWidth?: number;
  /** 中心说明文字 */
  label?: string;
}

/** 分数段 → 渐变色 */
function palette(score: number): [string, string] {
  if (score >= 85) {
    return ['#6EE7B7', '#10B981'];
  }
  if (score >= 70) {
    return ['#86EFAC', '#22C55E'];
  }
  if (score >= 50) {
    return ['#FDE68A', '#F59E0B'];
  }
  return ['#FCA5A5', '#EF4444'];
}

export function ScoreRing({
  score,
  size = 160,
  strokeWidth = 12,
  label = '综合评分',
}: ScoreRingProps): JSX.Element {
  const safeScore = clampScore(score, 0, 100);
  const radius = (size - strokeWidth) / 2;
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
      <div
        className="absolute inset-3 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${to}22, transparent 70%)` }}
      />
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
          stroke="rgba(255,255,255,.06)"
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
          style={{
            transition: 'stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)',
            filter: `drop-shadow(0 0 10px ${to}55)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="num text-[2.6rem] font-semibold leading-none tracking-tight text-white">
          {safeScore}
        </span>
        <span className="mt-2 text-[11px] tracking-wide text-white/40">{label}</span>
      </div>
    </div>
  );
}

export default ScoreRing;