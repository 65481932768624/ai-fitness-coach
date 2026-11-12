/**
 * 动作注册表 —— 扩展性核心。
 *
 * 新增动作的标准流程：
 * 1. 新建 `src/exercises/<id>.ts`，导出 ExerciseConfig 对象；
 * 2. 在下方 EXERCISE_REGISTRY 加一行；
 * 3. 完成 —— 无需改动任何引擎代码，首页/选择页自动出现新卡片。
 */

import type { ExerciseConfig, ExerciseId } from '../types/exercise';
import { plankConfig } from './plank';
import { pulldownConfig } from './pulldown';
import { benchPressConfig } from './benchpress';
import { pushupConfig } from './pushup';
import { squatConfig } from './squat';

/** 动作注册表：id → 配置 */
export const EXERCISE_REGISTRY: Record<ExerciseId, ExerciseConfig> = {
  squat: squatConfig,
  pushup: pushupConfig,
  plank: plankConfig,
  pulldown: pulldownConfig,
  benchpress: benchPressConfig,
};

/** 按顺序导出的动作列表（供首页 / 选择页遍历渲染） */
export const EXERCISE_LIST: ExerciseConfig[] = Object.values(EXERCISE_REGISTRY);

/**
 * 按 id 获取动作配置。
 * @param id 动作 id
 * @returns 配置对象；未知 id 返回 null
 */
export function getExercise(id: string): ExerciseConfig | null {
  if (id in EXERCISE_REGISTRY) {
    return EXERCISE_REGISTRY[id as ExerciseId];
  }
  return null;
}

/**
 * 判断是否支持的动作用户端 id。
 */
export function isExerciseId(id: string): id is ExerciseId {
  return id in EXERCISE_REGISTRY;
}
