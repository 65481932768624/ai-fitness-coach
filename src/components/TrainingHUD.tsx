/**
 * TrainingHUD —— 训练实时数据叠加层（左上计数 / 右上评分+计时）。
 *
 * 纯展示组件，数据来自 usePoseEngine 的节流快照。
 */

import { Flame, Timer } from 'lucide-react';
import { formatDuration, formatPercent } from '../utils/format';

export interface TrainingHUDProps {
  /** 动作名 */
  exerciseName: string;
  /** 当前阶段中文名 */
  phase: string;
  /** 已计数（reps） */
  repCount: number;
  /** 当前 / 最近评分 */
  currentScore: number;
  /** 已训练时长（ms） */
  elapsedMs: number;
  /** hold 模式已保持时长（ms） */
  holdElapsedMs?: number;
  /** hold 模式达标率 */
  passRate?: number;
  /** 是否 hold 模式 */
  isHold: boolean;
}

export function TrainingHUD({
  exerciseName,
  phase,
  repCount,
  currentScore,
  elapsedMs,
  holdElapsedMs,
  passRate,
  isHold,
}: TrainingHUDProps): JSX.Element {
  return (
    <>
      {/* 左上：动作 / 阶段 / 计数 */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <div className="rounded-xl border border-base-600/70 bg-base-950/70 px-4 py-2.5 backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-gray-400">{exerciseName}</div>
          <div className="mt-0.5 text-sm font-medium text-accent-soft">
            {phase || '准备中'}
          </div>
        </div>
        {!isHold && (
          <div className="flex items-center gap-2 rounded-xl border border-base-600/70 bg-base-950/70 px-4 py-2.5 backdrop-blur">
            <Flame size={18} className="text-accent" />
            <span className="text-3xl font-bold leading-none text-gray-50">{repCount}</span>
            <span className="pb-0.5 text-sm text-gray-400">次</span>
          </div>
        )}
      </div>

      {/* 右上：评分 / 计时 */}
      <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2">
        <div className="rounded-xl border border-base-600/70 bg-base-950/70 px-4 py-2.5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-gray-400">评分</div>
          <div className="text-3xl font-bold leading-none text-gray-50">{currentScore}</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-base-600/70 bg-base-950/70 px-3 py-1.5 text-sm text-gray-200 backdrop-blur">
          <Timer size={14} className="text-info" />
          <span>{isHold ? formatDuration(holdElapsedMs ?? 0) : formatDuration(elapsedMs)}</span>
        </div>
        {isHold && (
          <div className="rounded-xl border border-base-600/70 bg-base-950/70 px-3 py-1.5 text-sm text-gray-200 backdrop-blur">
            达标率 <span className="font-semibold text-accent-soft">{formatPercent(passRate ?? 0)}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default TrainingHUD;
