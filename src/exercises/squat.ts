/**
 * 深蹲（Squat）动作配置。
 *
 * mode: 'reps'，计数规则：standing → bottom → standing = 1 次。
 * 角度阈值为经验初值（详见架构文档 §8.1），建议侧面 45° 拍摄。
 */

import { LM, TRIPLES } from '../constants/landmarks';
import type { ExerciseConfig } from '../types/exercise';

export const squatConfig: ExerciseConfig = {
  id: 'squat',
  name: '深蹲',
  nameEn: 'Squat',
  bodyPart: 'legs',
  difficulty: 1,
  supported: true,
  icon: 'squat',
  description: '锻炼大腿与臀部，强化下肢力量。',
  tips: ['侧面 45° 拍摄', '全身入镜', '双脚与肩同宽'],

  mode: 'reps',

  rules: [
    {
      id: 'knee-depth',
      label: '下蹲深度',
      triple: TRIPLES.LEFT_KNEE,
      targetRange: [70, 100],
      messageLow: '蹲得太低了，注意膝盖',
      messageHigh: '再蹲深一点，大腿到水平',
      severity: 'warn',
      weight: 30,
      activePhases: ['bottom'],
    },
    {
      id: 'hip-angle',
      label: '髋部屈曲',
      triple: TRIPLES.LEFT_HIP,
      targetRange: [80, 110],
      messageLow: '背不要太弯，挺直腰背',
      messageHigh: '臀部再往后坐',
      severity: 'warn',
      weight: 25,
      activePhases: ['bottom'],
    },
    {
      id: 'torso-lean',
      label: '躯干前倾',
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
      targetRange: [70, 110],
      messageLow: '身体太前倾，胸口挺起来',
      messageHigh: '背别后仰，保持直立',
      severity: 'error',
      weight: 25,
      activePhases: ['bottom'],
    },
    {
      id: 'knee-valgus',
      label: '膝盖轨迹',
      triple: { a: LM.LEFT_HIP, b: LM.LEFT_KNEE, c: LM.LEFT_ANKLE },
      targetRange: [75, 105],
      messageLow: '膝盖不要内扣，向两侧打开',
      messageHigh: '膝盖对齐脚尖方向',
      severity: 'error',
      weight: 20,
      activePhases: ['descending', 'bottom'],
    },
  ],

  repCounter: {
    phases: [
      {
        phase: 'standing',
        label: '站立',
        condition: { triple: TRIPLES.LEFT_KNEE, range: [160, 180] },
      },
      {
        phase: 'descending',
        label: '下蹲中',
        condition: { triple: TRIPLES.LEFT_KNEE, range: [100, 160] },
      },
      {
        phase: 'bottom',
        label: '底部',
        condition: { triple: TRIPLES.LEFT_KNEE, range: [0, 100] },
      },
    ],
    completePhase: 'standing',
    requiredIntermediatePhase: 'bottom',
    minRepIntervalMs: 800,
  },

  scoring: {
    baseScore: 100,
    errorPenalty: 12,
    warnPenalty: 6,
    minScore: 0,
  },
};

export default squatConfig;
