/**
 * CameraView —— 视频 + 骨架 canvas 叠加容器。
 *
 * 响应式：容器宽度撑满，内部保持 16:9 比例，video 与 canvas 完全重合。
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
    <div className="relative w-full overflow-hidden rounded-2xl border border-base-700 bg-black shadow-card">
      <div className="relative aspect-video w-full">
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
        {overlay}
      </div>
    </div>
  );
}

export default CameraView;
