/**
 * 杠铃卧推（Barbell Bench Press）动作配置。
 *
 * mode: 'reps'，计数规则：手臂伸直 → 下放到胸口 → 推起伸直 = 1 次。
 * 判定三个角度：
 *   1) 底端的肘角（肩-肘-腕）——有没有下到胸口；
 *   2) 顶端的肘角——有没有推到位；
 *   3) 底端的大臂与躯干夹角（髋-肩-肘）——有没有把大臂摊成 90°（肩关节压力大）。
 *
 * 机位：侧面拍摄，镜头与凳面同高，全身 + 杠铃入镜。
 */

import { LM, TRIPLES } from '../constants/landmarks';
import type { ExerciseConfig } from '../types/exercise';

export const benchPressConfig: ExerciseConfig = {
  id: 'benchpress',
  name: '杠铃卧推',
  nameEn: 'Bench Press',
  bodyPart: 'chest',
  difficulty: 3,
  supported: true,
  icon: 'benchpress',
  description: '上肢推的力量核心，胸、肩、三头一起发力。',
  tips: [
    '侧面拍摄，镜头与凳面同高',
    '躺下先调位置：杠铃在眼睛正上方',
    '大臂与身体约 60°，别摊成 90°（肩压力大）',
    '肩胛骨贴紧凳子，推起时别送出去',
    '背阔肌收紧，像“往里掰杠”，肩会更稳',
    '下放到下胸，大臂略低于水平，小臂垂直地面',
    '顶端手肘留一点微曲，不要完全打直',
    '下放吸气、推起吐气；大重量上推憋气、顶端再吐',
    '别给杠铃套固定卡钳，推不起来能往一边倒卸片',
  ],

  mode: 'reps',

  rules: [
    {
      id: 'bar-depth',
      label: '下放深度',
      triple: TRIPLES.LEFT_ELBOW,
      targetRange: [70, 100],
      messageLow: '下太深了，肩前侧吃不住，下胸就够',
      messageHigh: '没下到位，下放到下胸、大臂略低于水平',
      severity: 'error',
      weight: 45,
      activePhases: ['bottom'],
    },
    {
      id: 'lockout',
      label: '推起幅度',
      triple: TRIPLES.LEFT_ELBOW,
      targetRange: [140, 172],
      messageLow: '推得不够，手臂接近伸直再还原',
      messageHigh: '肘别完全打直，留一点微曲，护关节',
      severity: 'warn',
      weight: 25,
      activePhases: ['top'],
    },
    {
      id: 'shoulder-angle',
      label: '大臂夹角',
      triple: { a: LM.LEFT_HIP, b: LM.LEFT_SHOULDER, c: LM.LEFT_ELBOW },
      targetRange: [45, 78],
      messageLow: '肘收太紧了，稍微打开一点，不然前臂使不上力',
      messageHigh: '大臂摊太开，肩关节压力大，收到约 60°',
      severity: 'error',
      weight: 30,
      activePhases: ['bottom'],
    },
  ],

  repCounter: {
    phases: [
      { phase: 'top', label: '推起', condition: { triple: TRIPLES.LEFT_ELBOW, range: [145, 180] } },
      { phase: 'lowering', label: '下放中', condition: { triple: TRIPLES.LEFT_ELBOW, range: [100, 145] } },
      { phase: 'bottom', label: '触胸', condition: { triple: TRIPLES.LEFT_ELBOW, range: [0, 100] } },
    ],
    completePhase: 'top',
    requiredIntermediatePhase: 'bottom',
    minRepIntervalMs: 900,
  },

  scoring: { baseScore: 100, errorPenalty: 12, warnPenalty: 6, minScore: 0 },
};

export default benchPressConfig;