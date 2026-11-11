/**
 * 俯卧撑（Push-up）动作配置。
 *
 * mode: 'reps'，计数规则：up → bottom → up = 1 次。
 * 角度阈值为经验初值（详见架构文档 §8.2），建议侧面拍摄。
 */

import { LM, TRIPLES } from '../constants/landmarks';
import type { ExerciseConfig } from '../types/exercise';

export const pushupConfig: ExerciseConfig = {
  id: 'pushup',
  name: '俯卧撑',
  nameEn: 'Push-up',
  bodyPart: 'chest',
  difficulty: 2,
  supported: true,
  icon: 'pushup',
  description: '锻炼胸肌、肩部与三头肌。',
  tips: ['侧面拍摄', '身体成一条直线', '手腕在肩正下方'],

  mode: 'reps',

  rules: [
    {
      id: 'elbow-angle',
      label: '肘部屈伸',
      triple: TRIPLES.LEFT_ELBOW,
      targetRange: [70, 100],
      messageLow: '下得太低了，肘部别过深',
      messageHigh: '再往下一点，胸贴近地面',
      severity: 'warn',
      weight: 40,
      activePhases: ['bottom'],
    },
    {
      id: 'body-line',
      label: '身体成直线',
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
      targetRange: [160, 180],
      messageLow: '塌腰了，收紧核心，身体打直',
      messageHigh: '屁股别撅起来，身体打直',
      severity: 'error',
      weight: 40,
    },
    {
      id: 'wrist-placement',
      label: '手腕位置',
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_ELBOW, c: LM.LEFT_WRIST },
      targetRange: [150, 180],
      messageLow: '手腕别外翻，小臂垂直地面',
      messageHigh: '手腕对准肩膀',
      severity: 'warn',
      weight: 20,
      activePhases: ['bottom'],
    },
  ],

  repCounter: {
    phases: [
      {
        phase: 'up',
        label: '撑起',
        condition: { triple: TRIPLES.LEFT_ELBOW, range: [150, 180] },
      },
      {
        phase: 'lowering',
        label: '下放中',
        condition: { triple: TRIPLES.LEFT_ELBOW, range: [100, 150] },
      },
      {
        phase: 'bottom',
        label: '最低点',
        condition: { triple: TRIPLES.LEFT_ELBOW, range: [0, 100] },
      },
    ],
    completePhase: 'up',
    requiredIntermediatePhase: 'bottom',
    minRepIntervalMs: 700,
  },

  scoring: {
    baseScore: 100,
    errorPenalty: 12,
    warnPenalty: 6,
    minScore: 0,
  },
};

export default pushupConfig;
