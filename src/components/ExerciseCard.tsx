/**
 * ExerciseCard —— 动作卡片（动作库 / 首页共用）。
 *
 * v4：白卡、圆角 20、几乎看不见的投影。层级靠"图标块 → 标题 → 说明 → 发丝线 → 标签"
 * 这条固定顺序拉开；难度收进右上角三根短横线（参考稿里的 "— — —"），
 * 悬停时右下角浮出一枚深色圆箭头，是浅色体系里"可点击"最轻的表达。
 */

import { ArrowUpRight, Lock } from 'lucide-react';
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
      className={`group relative flex w-full flex-col rounded-card border p-5 text-left transition duration-300 ${
        disabled
          ? 'cursor-not-allowed border-line-soft bg-paper-soft opacity-60'
          : 'border-line bg-paper-pure hover:-translate-y-[3px] hover:border-ink-200 hover:shadow-lift'
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-[46px] w-[46px] items-center justify-center rounded-[14px] ${tone.bg} ${tone.text}`}
        >
          <ExerciseGlyph id={exercise.id} size={26} />
        </span>

        {disabled ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-ink-300">
            <Lock size={9} />
            即将支持
          </span>
        ) : (
          <span className="mt-1.5 flex items-center gap-1" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-[3px] w-[11px] rounded-full ${
                  n <= exercise.difficulty ? 'bg-ink-400' : 'bg-line'
                }`}
              />
            ))}
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[16.5px] font-semibold tracking-tight text-ink-900">
            {exercise.name}
          </h3>
          <span className="text-[9px] font-medium uppercase tracking-[.16em] text-ink-400">
            {exercise.nameEn}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-[1.75] text-ink-500">
          {exercise.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-3.5">
        <div className="flex items-center gap-2 text-[11px] text-ink-500">
          <span className={`h-1 w-1 rounded-full ${tone.dot}`} />
          {BODY_PART_LABEL[exercise.bodyPart]}
          <span className="text-ink-200">/</span>
          {MODE_LABEL[exercise.mode]}
        </div>

        {!disabled && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-deep text-lime opacity-0 transition-all duration-300 group-hover:opacity-100">
            <ArrowUpRight size={12} strokeWidth={2.4} />
          </span>
        )}
      </div>
    </button>
  );
}

export default ExerciseCard;
