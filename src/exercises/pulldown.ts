/**
 * 高位下拉（Wide-Grip Lat Pulldown）动作配置。
 *
 * mode: 'reps'，计数规则：手臂伸直 → 下拉到底 → 回到伸直 = 1 次。
 * 判定只看肘角（肩-肘-腕）：顶端是否伸直、底端是否收到位。
 *
 * 为什么不做「躯干稳定」判定：坐姿下拉时髋膝被座椅遮挡，肩-髋-膝夹角在
 * 背面机位会塌成 0–20°，与真实后仰无法区分，硬判会大量误报。
 * 躯干要求只写进 tips 作为提示，等有真人样本标定后再加规则。
 *
 * 机位：正对镜头（正面或背面）坐姿全身入镜，侧面看不出握距。
 */

import { TRIPLES } from '../constants/landmarks';
import type { ExerciseConfig } from '../types/exercise';

export const pulldownConfig: ExerciseConfig = {
  id: 'pulldown',
  name: '高位下拉',
  nameEn: 'Lat Pulldown',
  bodyPart: 'back',
  difficulty: 2,
  supported: true,
  icon: 'pulldown',
  description: '拉起背阔肌的宽度，练出倒三角。',
  tips: ['正对镜头，坐姿全身入镜', '双手宽于肩，正握横杆', '拉到锁骨上方，别拉到颈后', '下放放慢，别用惯性'],

  mode: 'reps',

  rules: [
    {
      id: 'arms-extended',
      label: '手臂伸展',
      triple: TRIPLES.LEFT_ELBOW,
      targetRange: [150, 180],
      messageLow: '手臂没伸直，先让背阔肌完全拉长',
      messageHigh: '伸展过大，肘关节别锁死',
      severity: 'warn',
      weight: 40,
      activePhases: ['extended'],
    },
    {
      id: 'elbow-contraction',
      label: '下拉幅度',
      triple: TRIPLES.LEFT_ELBOW,
      targetRange: [45, 95],
      messageLow: '拉得太低，肘部别过度屈',
      messageHigh: '没拉到胸口，手肘再往下收',
      severity: 'error',
      weight: 60,
      activePhases: ['contracted'],
    },
  ],

  repCounter: {
    phases: [
      { phase: 'extended', label: '手臂伸直', condition: { triple: TRIPLES.LEFT_ELBOW, range: [150, 180] } },
      { phase: 'pulling', label: '下拉中', condition: { triple: TRIPLES.LEFT_ELBOW, range: [95, 150] } },
      { phase: 'contracted', label: '收紧', condition: { triple: TRIPLES.LEFT_ELBOW, range: [0, 95] } },
    ],
    completePhase: 'extended',
    requiredIntermediatePhase: 'contracted',
    minRepIntervalMs: 900,
  },

  scoring: { baseScore: 100, errorPenalty: 12, warnPenalty: 6, minScore: 0 },
};

export default pulldownConfig;