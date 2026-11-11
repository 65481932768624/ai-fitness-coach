/**
 * 平板支撑（Plank）动作配置。
 *
 * mode: 'hold'，无计数状态机，改为每 500ms 采样姿势达标率 + 计时。
 * 角度阈值为经验初值（详见架构文档 §8.3），建议侧面拍摄。
 */

import { LM } from '../constants/landmarks';
import type { ExerciseConfig } from '../types/exercise';

export const plankConfig: ExerciseConfig = {
  id: 'plank',
  name: '平板支撑',
  nameEn: 'Plank',
  bodyPart: 'core',
  difficulty: 2,
  supported: true,
  icon: 'plank',
  description: '强化核心稳定，塑造腹部线条。',
  tips: ['侧面拍摄', '肘在肩正下方', '收紧核心'],

  mode: 'hold',

  rules: [
    {
      id: 'body-line',
      label: '身体成直线',
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
      targetRange: [160, 180],
      messageLow: '腰背挺直，收紧核心',
      messageHigh: '臀部别抬高，身体放平',
      severity: 'error',
      weight: 50,
    },
    {
      id: 'hip-height',
      label: '髋部高度',
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
      targetRange: [165, 185],
      messageLow: '臀部太高了，往下放一点',
      messageHigh: '腰别塌，提起髋部',
      severity: 'error',
      weight: 30,
    },
    {
      id: 'neck-align',
      label: '头颈中立',
      triple: { a: LM.NOSE, b: LM.LEFT_SHOULDER, c: LM.LEFT_HIP },
      targetRange: [150, 180],
      messageLow: '头别低垂，看向地面',
      messageHigh: '脖子放松，不要抬太高',
      severity: 'warn',
      weight: 20,
    },
  ],

  repCounter: null,

  hold: {
    sampleIntervalMs: 500,
    passRateWarnThreshold: 0.7,
  },

  scoring: {
    baseScore: 100,
    errorPenalty: 12,
    warnPenalty: 6,
    minScore: 0,
  },
};

export default plankConfig;
