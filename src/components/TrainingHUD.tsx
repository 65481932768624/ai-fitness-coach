/**
 * TrainingHUD —— 训练实时数据叠加层（左上动作/计数，右上评分/计时）。
 *
 * v4：回到深色玻璃浮层（参考稿的做法），在深色画面上比白玻璃更透气；
 * 数字用青柠，标签压到 9.5px 的大字距小写意——数据要让位给画面，不要喊。
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

const PANEL = 'glass-dark rounded-2xl shadow-[0_10px_30px_-22px_rgba(0,0,0,.9)]';
const LABEL = 'text-[9px] uppercase tracking-[.18em] text-white/45';

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
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-2 sm:left-4 sm:top-4">
        <div className={`${PANEL} hidden px-3.5 py-2 sm:block`}>
          <div className={LABEL}>{exerciseName}</div>
          <div className="mt-0.5 text-[12.5px] font-medium text-white/90">{phase || '准备中'}</div>
        </div>

        {!isHold && (
          <div className={`${PANEL} flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2`}>
            <Flame size={13} className="text-lime" strokeWidth={2} />
            <span className="num text-[24px] font-semibold leading-none text-lime sm:text-[28px]">
              {repCount}
            </span>
            <span className="pb-0.5 text-[10px] text-white/50">次</span>
          </div>
        )}
      </div>

      {/* 右上：评分 / 计时 */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-4 sm:top-4">
        <div className={`${PANEL} px-3 py-1.5 text-right sm:px-3.5 sm:py-2`}>
          <div className={LABEL}>评分</div>
          <div className="num mt-0.5 text-[24px] font-semibold leading-none text-lime sm:text-[28px]">
            {currentScore}
          </div>
        </div>

        <div className={`${PANEL} flex items-center gap-1.5 px-3 py-1.5`}>
          <Timer size={11} className="text-white/50" strokeWidth={2} />
          <span className="num text-[11.5px] text-white/80">
            {isHold ? formatDuration(holdElapsedMs ?? 0) : formatDuration(elapsedMs)}
          </span>
        </div>

        {isHold && (
          <div className={`${PANEL} px-3 py-1.5 text-[11px] text-white/55`}>
            达标率 <span className="num font-medium text-lime">{formatPercent(passRate ?? 0)}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default TrainingHUD;
