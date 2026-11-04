/**
 * PoseIllustration —— 首页主视觉：一个正在下蹲的骨架 + 关键点 + 角度标注。
 *
 * 纯 SVG / 无外部资源，随主题色变化；用来在首屏"演示产品在做什么"，
 * 比堆文字更有说服力。
 */

import { Activity, CheckCircle2 } from 'lucide-react';

export function PoseIllustration(): JSX.Element {
  return (
    <div className="relative aspect-square w-full max-w-[420px] select-none">
      {/* 环境光 */}
      <div className="absolute inset-0 rounded-full bg-accent/10 blur-3xl" />

      {/* 网格底 */}
      <div
        className="absolute inset-0 rounded-[2rem] opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(circle at 50% 45%, black 55%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 45%, black 55%, transparent 78%)',
        }}
      />

      <svg viewBox="0 0 360 360" className="relative h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="bone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <radialGradient id="ground" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(52,211,153,.22)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0)" />
          </radialGradient>
        </defs>

        {/* 地面光影 */}
        <ellipse cx="176" cy="300" rx="118" ry="18" fill="url(#ground)" />

        {/* 骨骼（两腿：后腿淡、前腿亮） */}
        <g stroke="url(#bone)" strokeWidth="7" strokeLinecap="round" fill="none">
          {/* 后腿 */}
          <path d="M178 176 142 214 146 284" opacity="0.35" />
          {/* 躯干 */}
          <path d="M192 108 176 176" />
          {/* 前腿 */}
          <path d="M176 176 122 212 126 286" />
          {/* 脚 */}
          <path d="M126 286 168 286" />
          {/* 手臂 */}
          <path d="M188 124 236 142 268 118" />
          {/* 颈 */}
          <path d="M192 108 196 92" strokeWidth="5" />
        </g>

        {/* 头部 */}
        <circle cx="200" cy="80" r="16" fill="#d9f99d" opacity="0.9" />

        {/* 关键点 */}
        <g fill="#eafff6">
          <circle cx="192" cy="108" r="4.5" />
          <circle cx="176" cy="176" r="4.5" />
          <circle cx="122" cy="212" r="6" />
          <circle cx="126" cy="286" r="4.5" />
          <circle cx="236" cy="142" r="4" />
          <circle cx="268" cy="118" r="4" />
        </g>
        <circle cx="122" cy="212" r="15" fill="none" stroke="#34d399" strokeWidth="2" opacity="0.55" />
        <circle cx="122" cy="212" r="24" fill="none" stroke="#34d399" strokeWidth="1" opacity="0.22" />

        {/* 膝角弧线 */}
        <path
          d="M140.3 199.8 A 22 22 0 0 1 123.2 234"
          fill="none"
          stroke="rgba(52,211,153,.65)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* 浮动标注 */}
      <div className="absolute right-2 top-6 animate-float rounded-2xl border border-white/10 bg-base-950/80 px-3 py-2 text-xs shadow-card backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-white/45">
          <Activity size={12} className="text-accent" />
          膝角
        </div>
        <div className="num mt-0.5 text-lg font-semibold text-white">92°</div>
      </div>

      <div
        className="absolute -left-2 bottom-4 animate-float rounded-2xl border border-white/10 bg-base-950/80 px-3 py-2 text-xs shadow-card backdrop-blur-md"
        style={{ animationDelay: '-2.4s' }}
      >
        <div className="flex items-center gap-1.5 font-medium text-accent-soft">
          <CheckCircle2 size={13} />
          深度达标
        </div>
        <div className="mt-0.5 text-[11px] text-white/40">大腿与地面平行</div>
      </div>

      <div className="absolute bottom-2 right-6 rounded-full border border-white/10 bg-base-950/70 px-2.5 py-1 text-[10px] tracking-wider text-white/40 backdrop-blur">
        33 KEYPOINTS · 实时
      </div>
    </div>
  );
}

export default PoseIllustration;