/**
 * 摄像头朝向判定与镜像决策（纯函数，无 React / 无 DOM 依赖）。
 *
 * 单独成文件的原因：这是纯逻辑，可以在 node 里直接单测，
 * 不需要真摄像头。以前这段判断直接写在 hook 里且结论恒为「镜像」，
 * 后置摄像头画面左右颠倒也没人发现。
 */

/** 摄像头朝向：user=前置，environment=后置，unknown=无法判定 */
export type CameraFacing = 'user' | 'environment' | 'unknown';

/**
 * 判定摄像头朝向。
 *
 * 优先读 track.getSettings().facingMode；桌面外接摄像头通常不报这个字段，
 * 此时退回设备 label 的关键词匹配，都判定不了返回 unknown。
 *
 * @param mode getSettings().facingMode 的原始值
 * @param label 视频轨的 label（通常含设备名）
 */
export function resolveFacing(mode: string | undefined, label: string | undefined): CameraFacing {
  if (mode === 'user' || mode === 'environment') {
    return mode;
  }
  const text = (label ?? '').toLowerCase();
  const looksRear = /(back|rear|environment|后置)/.test(text);
  const looksFront = /(front|user|前置|facetime)/.test(text);
  // 同时命中时不可靠（例如 "Front Back Camera" 这类奇怪命名），判为 unknown
  if (looksRear && !looksFront) {
    return 'environment';
  }
  if (looksFront && !looksRear) {
    return 'user';
  }
  return 'unknown';
}

/**
 * 该朝向是否需要水平镜像。
 *
 * 后置摄像头不镜像（否则画面左右颠倒）；前置与未知朝向默认镜像，
 * 与「照镜子」的习惯一致。未知朝向倾向镜像，因为绝大多数使用场景是笔记本/手机前置。
 *
 * @param facing 朝向
 */
export function isMirroredFacing(facing: CameraFacing): boolean {
  return facing !== 'environment';
}
