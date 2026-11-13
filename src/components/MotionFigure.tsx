/**
 * MotionFigure —— 关键帧驱动的动作演示人偶（SVG，无外部资源）。
 *
 * 用正向运动学把 PoseAngles 算成关节坐标，再画成骨架。
 * 和 openGym 那种逐帧位图不同，这里是矢量 + 实时插值：
 * 分辨率无损、帧率跟屏幕、能随时调速度，也不依赖任何授权素材。
 */

import { useEffect, useRef, useState } from 'react';
import { getMotion, samplePose, type PoseAngles } from '../data/motions';

export interface MotionFigureProps {
  /** 动作 id */
  exerciseId: string;
  /** 画布边长（px），默认 240 */
  size?: number;
  /** 播放速度倍率，默认 1 */
  speed?: number;
  /** 是否播放，默认 true */
  playing?: boolean;
  /** 线条颜色 */
  stroke?: string;
  /** 高亮色（关节、当前发力段） */
  accent?: string;
  className?: string;
}

/** 骨段长度（相对单位，总身高约 100） */
const BONE = {
  neck: 8,
  torso: 34,
  upperArm: 20,
  foreArm: 19,
  thigh: 26,
  shin: 25,
};

interface Pt {
  x: number;
  y: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * 由角度算出侧视骨架各关节坐标。
 *
 * 约定：x 向右、y 向下；角度单位为「度」，顺时针为正。
 * 所有肢体角都相对躯干轴推导，保证无论怎么旋转 root 都连在一起。
 */
function dir(deg: number, len: number): Pt {
  const r = rad(deg);
  return { x: Math.cos(r) * len, y: Math.sin(r) * len };
}

function add(p: Pt, v: Pt): Pt {
  return { x: p.x + v.x, y: p.y + v.y };
}

function solve(pose: PoseAngles): Record<string, Pt> {
  const hip: Pt = { x: 0, y: 0 };

  // 躯干：基础朝上（-90°），前倾使角度增大，root 整体旋转
  const torsoDir = -90 + pose.root + pose.torso;
  const shoulder = add(hip, dir(torsoDir, BONE.torso));
  const neck = add(shoulder, dir(torsoDir, BONE.neck));
  const head = add(neck, dir(torsoDir, 9));

  // 上臂：0° = 贴着躯干（指向脚），肩屈向"身体前侧"扫。
  // 仰卧（root ≥ 45）时前侧在屏幕上是上方，旋转方向要反过来，否则手臂会扎进凳子。
  const frontSign = Math.abs(pose.root) >= 45 ? -1 : 1;
  const upperDir = torsoDir + 180 - pose.shoulder * frontSign;
  const elbow = add(shoulder, dir(upperDir, BONE.upperArm));

  // 前臂：肘屈把前臂折回身体前侧
  const foreDir = upperDir - pose.elbow * frontSign;
  const wrist = add(elbow, dir(foreDir, BONE.foreArm));

  // 大腿：同样从「躯干反向」起算，髋屈使其向前抬起
  const thighDir = torsoDir + 180 - pose.hip;
  const knee = add(hip, dir(thighDir, BONE.thigh));

  // 小腿：膝屈使其向后折
  const shinDir = thighDir + pose.knee;
  const ankle = add(knee, dir(shinDir, BONE.shin));

  // 脚：相对小腿近似垂直
  const toe = add(ankle, dir(shinDir - 90 + pose.ankle, 10));

  return { hip, shoulder, neck, head, elbow, wrist, knee, ankle, toe };
}

export function MotionFigure({
  exerciseId,
  size = 240,
  speed = 1,
  playing = true,
  stroke = 'currentColor',
  accent = '#A9D93F',
  className,
}: MotionFigureProps): JSX.Element | null {
  const motion = getMotion(exerciseId);
  const [pose, setPose] = useState<PoseAngles | null>(motion ? samplePose(motion, 0) : null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!motion) {
      setPose(null);
      return undefined;
    }
    if (!playing) {
      return undefined;
    }
    startRef.current = 0;
    const tick = (now: number): void => {
      if (!startRef.current) {
        startRef.current = now;
      }
      const elapsed = ((now - startRef.current) / 1000) * speed;
      const t = (elapsed % motion.duration) / motion.duration;
      setPose(samplePose(motion, t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [motion, playing, speed]);

  if (!motion || !pose) {
    return null;
  }

  const pts = solve(pose);

  // 等比缩放：把整个人装进画布（总高约 102 单位）
  const scale = (size * 0.78) / 102;

  // 锚定脚底：脚永远站在同一条地面线上，
  // 腿一折叠，骨盆自然下沉——不用再手算 drop。
  const footY = Math.max(pts.ankle.y, pts.toe.y);
  const groundY = size * 0.88;
  const shiftY = groundY - footY * scale;
  const shiftX = size / 2;
  const px = (v: number, off: number): string => (v * scale + off).toFixed(1);

  const line = (a: Pt, b: Pt): JSX.Element => (
    <line
      x1={px(a.x, shiftX)}
      y1={px(a.y, shiftY)}
      x2={px(b.x, shiftX)}
      y2={px(b.y, shiftY)}
      stroke={stroke}
      strokeWidth={4.6}
      strokeLinecap="round"
    />
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`${exerciseId} 动作演示`}
    >
      {/* 地面参考线 */}
      <line
        x1={size * 0.16}
        y1={groundY}
        x2={size * 0.84}
        y2={groundY}
        stroke="currentColor"
        strokeOpacity={0.14}
        strokeWidth={1.5}
        strokeDasharray="4 5"
      />

      {/* 骨架 */}
      <g opacity={0.95}>
        {line(pts.hip, pts.shoulder)}
        {line(pts.shoulder, pts.neck)}
        {line(pts.shoulder, pts.elbow)}
        {line(pts.elbow, pts.wrist)}
        {line(pts.hip, pts.knee)}
        {line(pts.knee, pts.ankle)}
        {line(pts.ankle, pts.toe)}
      </g>

      {/* 头 */}
      <circle
        cx={px(pts.head.x, shiftX)}
        cy={px(pts.head.y, shiftY)}
        r={8.5 * Math.min(1.35, scale)}
        fill="none"
        stroke={stroke}
        strokeWidth={4.2}
      />

      {/* 关键关节 */}
      {[pts.shoulder, pts.elbow, pts.hip, pts.knee, pts.ankle].map((p, i) => (
        <circle
          key={i}
          cx={px(p.x, shiftX)}
          cy={px(p.y, shiftY)}
          r={3.6}
          fill={accent}
        />
      ))}

      {/* 骨盆点用更醒目的色 */}
      <circle cx={px(0, shiftX)} cy={px(0, shiftY)} r={4.4} fill={accent} opacity={0.9} />
      <title>{`${exerciseId} · 矢量关键帧演示（${motion.duration.toFixed(1)}s 循环）`}</title>
    </svg>
  );
}

export default MotionFigure;