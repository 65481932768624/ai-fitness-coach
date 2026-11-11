/**
 * SkeletonCanvas —— 叠加在视频上的骨架 canvas。
 *
 * 尺寸与 video 元素保持一致，由父组件通过 props 指定像素尺寸。
 */

import type { RefObject } from 'react';

export interface SkeletonCanvasProps {
  /** canvas ref，由 usePoseEngine 绑定 CanvasRenderer */
  canvasRef: RefObject<HTMLCanvasElement>;
  /** 画布宽（px） */
  width: number;
  /** 画布高（px） */
  height: number;
}

export function SkeletonCanvas({ canvasRef, width, height }: SkeletonCanvasProps): JSX.Element {
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export default SkeletonCanvas;
