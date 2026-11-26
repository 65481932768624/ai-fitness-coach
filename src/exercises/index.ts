/**
 * 动作注册表 —— 扩展性核心。
 *
 * v7：新增「批量动作库」通道。练练健身 71 段录屏 + 教学手册合并后的动作，
 * 以声明式条目存放在 library.ts，经 buildExercise() 生成 ExerciseConfig，
 * 与手写的 5 个旗舰动作（深蹲/俯卧撑/平板/下拉/卧推）并存注册。
 *
 * 新增手写动作仍然只需三步：
 * 1. 新建 `src/exercises/<id>.ts`，导出 ExerciseConfig 对象；
 * 2. 在下方 EXERCISE_REGISTRY 加一行；
 * 3. 完成 —— 无需改动任何引擎代码。
 */

import type { ExerciseConfig, ExerciseId } from '../types/exercise';
import type { LibraryEntry } from './library-types';
import { plankConfig } from './plank';
import { pulldownConfig } from './pulldown';
import { benchPressConfig } from './benchpress';
import { pushupConfig } from './pushup';
import { squatConfig } from './squat';
import { LIBRARY } from './library.generated';
import { LIBRARY2 } from './library2.generated';
export type { LibraryEntry } from './library-types';

/** 动作注册表：id → 配置（手写旗舰动作优先） */
export const EXERCISE_REGISTRY: Record<ExerciseId, ExerciseConfig> = {
  squat: squatConfig,
  pushup: pushupConfig,
  plank: plankConfig,
  pulldown: pulldownConfig,
  benchpress: benchPressConfig,
};

/** 生成动作 id：标题转拼音式 ASCII，冲突时带编号 */
function toId(entry: LibraryEntry): string {
  return entry.id;
}

/** 库条目转完整配置 */
export function buildExercise(entry: LibraryEntry): ExerciseConfig {
  return {
    id: toId(entry),
    name: entry.name,
    nameEn: entry.nameEn,
    bodyPart: entry.bodyPart,
    difficulty: entry.difficulty,
    supported: entry.supported,
    icon: entry.family,
    description: entry.description,
    tips: entry.tips,
    guidance: {
      muscles: entry.muscles,
      equipment: entry.equipment,
      steps: entry.steps,
      keyPoints: entry.keyPoints,
      mistakes: entry.mistakes,
      setupCues: entry.setupCues,
      coachingCues: entry.coachingCues,
      source: { video: entry.sourceVideo, number: entry.sourceNumber },
    },
    family: entry.family,
    mode: entry.mode,
    rules: entry.rules,
    repCounter: entry.repCounter ?? null,
    hold: entry.hold,
    scoring: entry.scoring ?? { baseScore: 100, errorPenalty: 12, warnPenalty: 6, minScore: 0 },
  };
}

// 注册第一批库动作（跳过与手写动作重复的 id）
for (const entry of LIBRARY) {
  if (entry.id in EXERCISE_REGISTRY) {
    continue;
  }
  EXERCISE_REGISTRY[entry.id] = buildExercise(entry);
}

// 注册第二批（腿臀肩臂核心）；同 id 时覆盖第一批，
// 因为手册版内容更完整（含五步拆解、关键要点与常见错误）
for (const entry of LIBRARY2) {
  EXERCISE_REGISTRY[entry.id] = buildExercise(entry);
}

/** 按顺序导出的动作列表（供首页 / 选择页遍历渲染） */
export const EXERCISE_LIST: ExerciseConfig[] = Object.values(EXERCISE_REGISTRY);

/**
 * 按 id 获取动作配置。
 * @param id 动作 id
 * @returns 配置对象；未知 id 返回 null
 */
export function getExercise(id: string): ExerciseConfig | null {
  return (id in EXERCISE_REGISTRY) ? EXERCISE_REGISTRY[id as ExerciseId] : null;
}

/**
 * 判断是否支持的动作用户端 id。
 */
export function isExerciseId(id: string): id is ExerciseId {
  return id in EXERCISE_REGISTRY;
}

/** 库条目导出（测试与文档用） */
export { LIBRARY };
