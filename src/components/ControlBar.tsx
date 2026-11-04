/**
 * ControlBar —— 训练控制条（暂停/继续、结束、语音开关、重播）。
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

export function ControlBar({
  running,
  speechEnabled,
  onToggleRun,
  onStop,
  onToggleSpeech,
  onReplay,
}: ControlBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button type="button" className="btn-primary" onClick={onToggleRun}>
        {running ? <Pause size={18} /> : <Play size={18} />}
        <span>{running ? '暂停' : '继续'}</span>
      </button>

      <button type="button" className="btn-ghost" onClick={onReplay}>
        <RotateCcw size={18} />
        <span>重播提示</span>
      </button>

      <button type="button" className="btn-ghost" onClick={onToggleSpeech}>
        {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        <span>{speechEnabled ? '语音开' : '语音关'}</span>
      </button>

      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger/60 bg-danger/10 px-5 py-3 font-semibold text-red-200 transition-colors hover:bg-danger/20"
        onClick={onStop}
      >
        <Square size={18} />
        <span>结束训练</span>
      </button>
    </div>
  );
}

export default ControlBar;
