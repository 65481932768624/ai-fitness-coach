/**
 * ExerciseCard —— 动作卡片（动作库/首页共用）。
 *
 * v2：每个动作有专属线性图标 + 部位配色，难度用点阵而不是星号，
 * 底部一行给"部位 · 模式"，悬停才出现"开始"。
 */

import { ChevronRight, Lock } from 'lucide-react';
import type { ExerciseConfig } from '../types/exercise';
import { BODY_TONE, ExerciseGlyph } from './ExerciseGlyph';

export interface ExerciseCardProps {
  /** 动作配置 */
  exercise: ExerciseConfig;
  /** 点击回调 */
  onSelect: (exercise: ExerciseConfig) => void;
}

/** 部位中文名 */
const BODY_PART_LABEL: Record<ExerciseConfig['bodyPart'], string> = {
  legs: '下肢',
  chest: '上肢 / 胸',
  core: '核心',
};

/** 模式中文名 */
const MODE_LABEL: Record<ExerciseConfig['mode'], string> = {
  reps: '计次',
  hold: '静态保持',
};

export function ExerciseCard({ exercise, onSelect }: ExerciseCardProps): JSX.Element {
  const disabled = !exercise.supported;
  const tone = BODY_TONE[exercise.bodyPart] ?? BODY_TONE.legs;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(exercise)}
      aria-label={`${exercise.name}，${BODY_PART_LABEL[exercise.bodyPart]}，难度 ${exercise.difficulty}`}
      className={`group relative flex w-full flex-col gap-4 rounded-3xl border p-5 text-left transition duration-300 ${
        disabled
          ? 'cursor-not-allowed border-white/[0.05] bg-white/[0.015] opacity-55'
          : 'border-white/[0.07] bg-base-800/50 hover:-translate-y-1 hover:border-accent/25 hover:bg-base-800/80 hover:shadow-glow'
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone.bg} ${tone.text}`}
        >
          <ExerciseGlyph id={exercise.id} size={34} />
        </span>

        {disabled ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/35">
            <Lock size={10} />
            即将支持
          </span>
        ) : (
          <span className="flex items-center gap-1" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-[3px] w-3 rounded-full ${
                  n <= exercise.difficulty ? 'bg-accent/75' : 'bg-white/10'
                }`}
              />
            ))}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-[17px] font-semibold tracking-tight text-white">{exercise.name}</h3>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">
            {exercise.nameEn}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-white/45">
          {exercise.description}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {BODY_PART_LABEL[exercise.bodyPart]}
          <span className="text-white/15">/</span>
          {MODE_LABEL[exercise.mode]}
        </div>

        {!disabled && (
          <span className="flex items-center gap-0.5 text-[13px] font-medium text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            开始
            <ChevronRight size={15} />
          </span>
        )}
      </div>
    </button>
  );
}

export default ExerciseCard;