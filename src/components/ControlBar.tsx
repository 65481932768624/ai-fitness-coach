/**
 * ControlBar —— 训练控制条（暂停/继续、重播、语音开关、结束）。
 *
 * v4：参考稿的控制条是一整块深色玻璃，主操作用青柠实心胶囊，
 * 其余是深色圆形按钮。这里保留同样的层级：一个能点的，三个能看的。
 */

import { Play, Pause, Square, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export interface ControlBarProps {
  /** 是否运行中 */
  running: boolean;
  /** 语音是否启用 */
  speechEnabled: boolean;
  /** 暂停 / 继续 */
  onToggleRun: () => void;
  /** 结束训练 */
  onStop: () => void;
  /** 切换语音 */
  onToggleSpeech: () => void;
  /** 重播上一条提示 */
  onReplay: () => void;
}

const MINI =
  'flex flex-col items-center gap-1.5 rounded-2xl border border-white/[.08] bg-white/[.05] py-2.5 text-[10px] text-white/55 transition duration-200 hover:border-white/20 hover:bg-white/[.10] hover:text-white';

export function ControlBar({
  running,
  speechEnabled,
  onToggleRun,
  onStop,
  onToggleSpeech,
  onReplay,
}: ControlBarProps): JSX.Element {
  return (
    <div className="rounded-panel border border-white/[.08] bg-deep p-3">
      <button
        type="button"
        onClick={onToggleRun}
        className="btn-lime w-full py-2.5 text-[13.5px]"
      >
        {running ? <Pause size={15} strokeWidth={2.4} /> : <Play size={15} strokeWidth={2.4} />}
        <span>{running ? '暂停' : '继续'}</span>
      </button>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <button type="button" className={MINI} onClick={onReplay}>
          <RotateCcw size={14} strokeWidth={2} />
          重播
        </button>

        <button type="button" className={MINI} onClick={onToggleSpeech}>
          {speechEnabled ? (
            <Volume2 size={14} strokeWidth={2} />
          ) : (
            <VolumeX size={14} strokeWidth={2} />
          )}
          {speechEnabled ? '语音开' : '语音关'}
        </button>

        <button
          type="button"
          onClick={onStop}
          className={`${MINI} border-danger/25 bg-danger/[.08] text-danger/80 hover:border-danger/40 hover:bg-danger/[.16] hover:text-danger`}
        >
          <Square size={13} strokeWidth={2.4} />
          结束
        </button>
      </div>
    </div>
  );
}

export default ControlBar;
