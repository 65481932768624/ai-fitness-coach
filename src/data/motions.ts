/**
 * 动作演示的关键帧数据（手写，二维侧视骨骼）。
 *
 * 为什么手写而不是从视频反推：openGym 的演示是 180×180、3–4 fps、44 kbps 的位图序列，
 * 信息量只够"看一眼"，不够反推关节点；而且它的动画是从 Gym visual 商业授权，
 * 反推重做属于衍生作品。手写关键帧没有任何版权尾巴，还能和我们的 33 关键点同源。
 *
 * 角度约定（单位：度，均为"关节相对父骨段"的屈曲量，0 = 伸直）：
 *   torso     躯干前倾（正 = 向前倒）
 *   hip       髋屈（大腿相对躯干向前抬）
 *   knee      膝屈（小腿相对大腿向后折）
 *   shoulder  肩屈（上臂相对躯干向前抬）
 *   elbow     肘屈（前臂相对上臂折回）
 *   ankle     踝屈
 *   drop      骨盆相对站立位置的下沉量（0–1，单位是腿长的比例）
 *   root      整个人体的旋转（0 = 站立，90 = 仰卧）
 */

export interface PoseAngles {
  torso: number;
  hip: number;
  knee: number;
  shoulder: number;
  elbow: number;
  ankle: number;
  drop: number;
  root: number;
}

export interface Keyframe {
  /** 0–1 的归一化时间 */
  t: number;
  pose: PoseAngles;
}

export interface Motion {
  /** 循环时长（秒） */
  duration: number;
  /** 循环起点姿态（也是终点，保证无缝） */
  loop: boolean;
  frames: Keyframe[];
}

const P = (p: Partial<PoseAngles>): PoseAngles => ({
  torso: 0,
  hip: 0,
  knee: 0,
  shoulder: 0,
  elbow: 0,
  ankle: 0,
  drop: 0,
  root: 0,
  ...p,
});

/** 深蹲：站立 → 下蹲 → 底部 → 起身 */
const squat: Motion = {
  duration: 3.2,
  loop: true,
  frames: [
    { t: 0.0, pose: P({ torso: 6, hip: 6, knee: 6, shoulder: 8, elbow: 10 }) },
    { t: 0.28, pose: P({ torso: 14, hip: 50, knee: 62, shoulder: 6, elbow: 66 }) },
    { t: 0.46, pose: P({ torso: 20, hip: 92, knee: 108, shoulder: 4, elbow: 96 }) },
    { t: 0.60, pose: P({ torso: 20, hip: 92, knee: 108, shoulder: 4, elbow: 96 }) },
    { t: 0.80, pose: P({ torso: 14, hip: 50, knee: 62, shoulder: 6, elbow: 66 }) },
    { t: 1.0, pose: P({ torso: 6, hip: 6, knee: 6, shoulder: 8, elbow: 10 }) },
  ],
};

/** 俯卧撑：身体呈一条直线，肘屈伸带动升降 */
const pushup: Motion = {
  duration: 2.8,
  loop: true,
  frames: [
    { t: 0.0, pose: P({ root: 78, torso: 0, hip: 0, knee: 0, shoulder: 62, elbow: 6, drop: 0 }) },
    { t: 0.42, pose: P({ root: 78, torso: 0, hip: 0, knee: 0, shoulder: 46, elbow: 88, drop: 0.12 }) },
    { t: 0.54, pose: P({ root: 78, torso: 0, hip: 0, knee: 0, shoulder: 46, elbow: 88, drop: 0.12 }) },
    { t: 1.0, pose: P({ root: 78, torso: 0, hip: 0, knee: 0, shoulder: 62, elbow: 6, drop: 0 }) },
  ],
};

/** 平板支撑：静态微呼吸，几乎不动 */
const plank: Motion = {
  duration: 4.0,
  loop: true,
  frames: [
    { t: 0.0, pose: P({ root: 82, torso: 0, hip: 0, knee: 0, shoulder: 74, elbow: 82, drop: 0 }) },
    { t: 0.5, pose: P({ root: 82, torso: 0, hip: 0, knee: 0, shoulder: 74, elbow: 82, drop: 0.01 }) },
    { t: 1.0, pose: P({ root: 82, torso: 0, hip: 0, knee: 0, shoulder: 74, elbow: 82, drop: 0 }) },
  ],
};

/** 杠铃卧推：仰卧，手臂从胸前推起 */
const benchpress: Motion = {
  duration: 3.0,
  loop: true,
  frames: [
    { t: 0.0, pose: P({ root: 90, torso: 0, hip: 34, knee: 56, shoulder: 6, elbow: 10 }) },
    { t: 0.45, pose: P({ root: 90, torso: 0, hip: 34, knee: 56, shoulder: 8, elbow: 92 }) },
    { t: 0.57, pose: P({ root: 90, torso: 0, hip: 34, knee: 56, shoulder: 8, elbow: 92 }) },
    { t: 1.0, pose: P({ root: 90, torso: 0, hip: 34, knee: 56, shoulder: 6, elbow: 10 }) },
  ],
};

/** 高位下拉：坐姿，手臂从头顶拉向胸口 */
const pulldown: Motion = {
  duration: 2.6,
  loop: true,
  frames: [
    { t: 0.0, pose: P({ root: 0, torso: 4, hip: 88, knee: 90, shoulder: 168, elbow: 4, drop: 0.33 }) },
    { t: 0.42, pose: P({ root: 0, torso: 8, hip: 88, knee: 90, shoulder: 104, elbow: 58, drop: 0.33 }) },
    { t: 0.54, pose: P({ root: 0, torso: 8, hip: 88, knee: 90, shoulder: 104, elbow: 58, drop: 0.33 }) },
    { t: 1.0, pose: P({ root: 0, torso: 4, hip: 88, knee: 90, shoulder: 168, elbow: 4, drop: 0.33 }) },
  ],
};

export const MOTIONS: Record<string, Motion> = {
  squat,
  pushup,
  plank,
  benchpress,
  pulldown,
};

/** 取动作的循环；未知动作返回 null（由调用方回退到静态图标） */
export function getMotion(id: string): Motion | null {
  return MOTIONS[id] ?? null;
}

/** 缓动：两端慢、中间快，避免机械感 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** 按归一化时间插值出姿态 */
export function samplePose(motion: Motion, t: number): PoseAngles {
  const frames = motion.frames;
  const clamped = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < frames.length - 2 && clamped > frames[i + 1].t) {
    i += 1;
  }
  const a = frames[i];
  const b = frames[i + 1] ?? frames[i];
  const span = b.t - a.t;
  const local = span <= 0 ? 0 : easeInOut((clamped - a.t) / span);
  const out = {} as PoseAngles;
  (Object.keys(a.pose) as Array<keyof PoseAngles>).forEach((k) => {
    out[k] = a.pose[k] + (b.pose[k] - a.pose[k]) * local;
  });
  return out;
}