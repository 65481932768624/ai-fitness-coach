/**
 * CameraView —— 视频 + 骨架 canvas 叠加容器。
 *
 * v4：参考稿里视频框是一块"通电的深色玻璃"——深墨绿底 + 边缘一圈青绿辉光。
 * 做法：外层一条极淡的青绿光晕（blur），内层 1px 青绿描边 + 顶部内高光，
 * 画面本身仍是纯深色承载，所以白色玻璃 HUD 在上面始终读得清。
 */

import type { RefObject } from 'react';
import { SkeletonCanvas } from './SkeletonCanvas';

export interface CameraViewProps {
  /** video ref */
  videoRef: RefObject<HTMLVideoElement>;
  /** canvas ref */
  canvasRef: RefObject<HTMLCanvasElement>;
  /** 画布渲染分辨率宽（px），默认 1280 */
  renderWidth?: number;
  /** 画布渲染分辨率高（px），默认 720 */
  renderHeight?: number;
  /** 叠加层内容（HUD / 状态提示） */
  overlay?: React.ReactNode;
}

export function CameraView({
  videoRef,
  canvasRef,
  renderWidth = 1280,
  renderHeight = 720,
  overlay,
}: CameraViewProps): JSX.Element {
  return (
    <div className="relative">
      {/* 边缘辉光 */}
      <div className="pointer-events-none absolute -inset-px rounded-panel bg-aqua/25 blur-[16px]" />

      <div className="relative aspect-video w-full overflow-hidden rounded-panel border border-aqua/35 bg-deep-800 shadow-frame">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
          autoPlay
        />
        <div style={{ transform: 'scaleX(-1)' }} className="absolute inset-0">
          <SkeletonCanvas canvasRef={canvasRef} width={renderWidth} height={renderHeight} />
        </div>

        {/* 顶部内高光：让边框看起来是"通电"的 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-aqua/[.14] to-transparent" />
        <div className="pointer-events-none absolute inset-0 rounded-panel ring-1 ring-inset ring-white/[.06]" />

        {overlay}
      </div>
    </div>
  );
}

export default CameraView;
