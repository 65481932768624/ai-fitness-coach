// src/engine/angleCalculator.ts
var videoAspectRatio = 16 / 9;
function toVec(lm2) {
  return { x: lm2.x * videoAspectRatio, y: lm2.y };
}
function calcAngle(a, b, c) {
  const va = toVec(a);
  const vb = toVec(b);
  const vc = toVec(c);
  const v1 = { x: va.x - vb.x, y: va.y - vb.y };
  const v2 = { x: vc.x - vb.x, y: vc.y - vb.y };
  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 < 1e-6 || len2 < 1e-6) {
    return 0;
  }
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cos = dot / (len1 * len2);
  const clamped = Math.min(1, Math.max(-1, cos));
  return Math.round(Math.acos(clamped) * 180 / Math.PI);
}
function calcJointAngle(landmarks, triple) {
  const a = landmarks[triple.a];
  const b = landmarks[triple.b];
  const c = landmarks[triple.c];
  if (!a || !b || !c) {
    return 0;
  }
  return calcAngle(a, b, c);
}
function calcVerticalAngle(a, b) {
  const va = toVec(a);
  const vb = toVec(b);
  const dx = vb.x - va.x;
  const dy = vb.y - va.y;
  if (Math.hypot(dx, dy) < 1e-6) {
    return 0;
  }
  const angle = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI);
  return Math.round(angle);
}
function calcHorizontalDistance(a, b) {
  return Math.abs(a.x - b.x);
}

// src/constants/config.ts
var VISIBILITY_THRESHOLD = 0.5;
var FEEDBACK_MIN_INTERVAL_MS = 3e3;
var BODY_MIN_VISIBLE_LANDMARKS = 8;
var TARGET_FPS = 30;
var TARGET_FRAME_INTERVAL_MS = 1e3 / TARGET_FPS;
var STORAGE_PREFIX = "fitness_coach.";
var STORAGE_SESSIONS_KEY = `${STORAGE_PREFIX}sessions.v1`;
var STORAGE_SPEECH_KEY = `${STORAGE_PREFIX}speech.v1`;

// src/engine/confidenceGate.ts
var ConfidenceGate = class {
  threshold;
  /**
   * @param threshold 可见度阈值，默认 VISIBILITY_THRESHOLD
   */
  constructor(threshold = VISIBILITY_THRESHOLD) {
    this.threshold = threshold;
  }
  /**
   * 判断一个三点组合的三个关键点是否都可信。
   * @param landmarks 关键点数组
   * @param triple 三点索引
   */
  isTripleValid(landmarks, triple) {
    const points = [landmarks[triple.a], landmarks[triple.b], landmarks[triple.c]];
    return points.every((p) => p !== void 0 && p.visibility >= this.threshold);
  }
  /**
   * 判断整帧是否「检测到人体」：有效关键点数量达到阈值。
   * @param landmarks 关键点数组
   */
  isBodyDetected(landmarks) {
    if (landmarks.length < BODY_MIN_VISIBLE_LANDMARKS) {
      return false;
    }
    let visibleCount = 0;
    for (const lm2 of landmarks) {
      if (lm2.visibility >= this.threshold) {
        visibleCount += 1;
        if (visibleCount >= BODY_MIN_VISIBLE_LANDMARKS) {
          return true;
        }
      }
    }
    return false;
  }
  /** 设置阈值 */
  setThreshold(threshold) {
    this.threshold = threshold;
  }
};

// src/engine/repCounter.ts
var DEFAULT_MIN_INTERVAL_MS = 800;
var RepCounter = class {
  config;
  gate;
  currentPhase;
  currentPhaseLabel;
  visitedIntermediate;
  repCount;
  lastRepTs;
  /**
   * @param config 计数状态机配置
   * @param gate 置信度门控实例
   */
  constructor(config, gate) {
    this.config = config;
    this.gate = gate;
    this.currentPhase = config.completePhase;
    this.currentPhaseLabel = this.labelOf(config.completePhase);
    this.visitedIntermediate = false;
    this.repCount = 0;
    this.lastRepTs = -Infinity;
  }
  /**
   * 每帧更新状态机。
   * @param landmarks 平滑后关键点
   * @param timestampMs 时间戳（ms）
   * @returns 计数状态
   */
  update(landmarks, timestampMs) {
    const nextPhase = this.detectPhase(landmarks);
    let repJustCompleted = false;
    if (nextPhase !== null) {
      const prevPhase = this.currentPhase;
      if (nextPhase === this.config.requiredIntermediatePhase) {
        this.visitedIntermediate = true;
      }
      if (nextPhase !== prevPhase) {
        this.currentPhase = nextPhase;
        this.currentPhaseLabel = this.labelOf(nextPhase);
      }
      if (nextPhase === this.config.completePhase && prevPhase !== this.config.completePhase && this.visitedIntermediate) {
        const minInterval = this.config.minRepIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
        if (timestampMs - this.lastRepTs >= minInterval) {
          this.repCount += 1;
          this.lastRepTs = timestampMs;
          repJustCompleted = true;
        }
        this.visitedIntermediate = false;
      }
    }
    return {
      phase: this.currentPhase,
      phaseLabel: this.currentPhaseLabel,
      repCount: this.repCount,
      repJustCompleted
    };
  }
  /** 根据当前角度匹配阶段（返回阶段名或 null） */
  detectPhase(landmarks) {
    for (const def of this.config.phases) {
      if (!this.gate.isTripleValid(landmarks, def.condition.triple)) {
        continue;
      }
      const angle = calcJointAngle(landmarks, def.condition.triple);
      const [low, high] = def.condition.range;
      if (angle >= low && angle <= high) {
        return def.phase;
      }
    }
    return null;
  }
  /** 获取阶段中文名 */
  labelOf(phase) {
    const def = this.config.phases.find((p) => p.phase === phase);
    return def ? def.label : phase;
  }
  /** 重置状态机 */
  reset() {
    this.currentPhase = this.config.completePhase;
    this.currentPhaseLabel = this.labelOf(this.config.completePhase);
    this.visitedIntermediate = false;
    this.repCount = 0;
    this.lastRepTs = -Infinity;
  }
  /** 当前计数 */
  getCount() {
    return this.repCount;
  }
  /** 当前阶段 */
  getPhase() {
    return this.currentPhase;
  }
  /** 当前阶段中文名 */
  getPhaseLabel() {
    return this.currentPhaseLabel;
  }
};

// src/engine/ruleEngine.ts
var RuleEngine = class {
  config;
  gate;
  /**
   * @param config 动作配置
   * @param gate 置信度门控实例
   */
  constructor(config, gate) {
    this.config = config;
    this.gate = gate;
  }
  /**
   * 评估当前帧所有规则。
   * @param landmarks 平滑后关键点
   * @param phase 当前状态机阶段
   * @param timestampMs 时间戳（ms）
   * @returns 违规列表（可能为空）
   */
  evaluate(landmarks, phase, timestampMs) {
    const violations = [];
    if (landmarks.length < 33) {
      return violations;
    }
    for (const rule of this.config.rules) {
      if (!this.isRuleActive(rule, phase)) {
        continue;
      }
      const violation = this.evaluateRule(rule, landmarks, timestampMs);
      if (violation) {
        violations.push(violation);
      }
    }
    return violations;
  }
  /**
   * 离线评估：用于 hold 模式采样（不关心阶段）。
   */
  evaluateAll(landmarks, timestampMs) {
    const violations = [];
    if (landmarks.length < 33) {
      return violations;
    }
    for (const rule of this.config.rules) {
      const violation = this.evaluateRule(rule, landmarks, timestampMs);
      if (violation) {
        violations.push(violation);
      }
    }
    return violations;
  }
  /** 判断规则在当前阶段是否生效 */
  isRuleActive(rule, phase) {
    if (!rule.activePhases || rule.activePhases.length === 0) {
      return true;
    }
    return rule.activePhases.includes(phase);
  }
  /** 评估单条规则，返回违规或 null */
  evaluateRule(rule, landmarks, timestampMs) {
    if (!this.gate.isTripleValid(landmarks, rule.triple)) {
      return null;
    }
    const angle = calcJointAngle(landmarks, rule.triple);
    const [low, high] = rule.targetRange;
    if (angle < low) {
      return {
        ruleId: rule.id,
        label: rule.label,
        severity: rule.severity,
        message: rule.messageLow,
        actualAngle: angle,
        targetRange: rule.targetRange,
        timestampMs
      };
    }
    if (angle > high) {
      return {
        ruleId: rule.id,
        label: rule.label,
        severity: rule.severity,
        message: rule.messageHigh,
        actualAngle: angle,
        targetRange: rule.targetRange,
        timestampMs
      };
    }
    return null;
  }
  /** 获取动作配置 */
  getConfig() {
    return this.config;
  }
};

// src/engine/scoringEngine.ts
var ScoringEngine = class {
  config;
  /**
   * @param config 评分配置
   */
  constructor(config) {
    this.config = config;
  }
  /**
   * 计算单次计次动作的得分。
   * @param violations 该次动作累计违规（去重后建议每规则一次）
   * @returns 0-100 的得分
   */
  scoreRep(violations) {
    let score = this.config.baseScore;
    for (const v of violations) {
      if (v.severity === "error") {
        score -= this.config.errorPenalty;
      } else {
        score -= this.config.warnPenalty;
      }
    }
    return this.clamp(score);
  }
  /**
   * 计算静态动作得分。
   * @param passRate 姿势达标率 0-1
   * @returns 0-100 的得分
   */
  scoreHold(passRate) {
    const ratio = Number.isFinite(passRate) ? Math.min(1, Math.max(0, passRate)) : 0;
    return this.clamp(this.config.baseScore * ratio);
  }
  /** 约束分数到合法区间 */
  clamp(score) {
    const min = this.config.minScore;
    const max = this.config.baseScore;
    if (!Number.isFinite(score)) {
      return min;
    }
    return Math.round(Math.min(max, Math.max(min, score)));
  }
  /** 获取配置 */
  getConfig() {
    return this.config;
  }
};

// src/engine/feedbackManager.ts
var FeedbackManager = class _FeedbackManager {
  minIntervalMs;
  lastSpokenAt;
  enabled;
  volume;
  rate;
  lastText;
  lang;
  /**
   * @param minIntervalMs 同文案去重间隔（ms），默认 FEEDBACK_MIN_INTERVAL_MS
   */
  constructor(minIntervalMs = FEEDBACK_MIN_INTERVAL_MS) {
    this.minIntervalMs = minIntervalMs;
    this.lastSpokenAt = /* @__PURE__ */ new Map();
    this.enabled = true;
    this.volume = 1;
    this.rate = 1.05;
    this.lastText = null;
    this.lang = "zh-CN";
  }
  /** 检测浏览器是否支持语音合成 */
  static isSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }
  /**
   * 提交本帧违规，按优先级选出候选文案并尝试播报。
   * - error 优先于 warn；
   * - 同文案在 minIntervalMs 内跳过；
   * @param violations 本帧违规列表
   * @param timestampMs 时间戳（ms）
   * @returns 实际播报的文案；未播报返回 null
   */
  submit(violations, timestampMs) {
    if (violations.length === 0) {
      return null;
    }
    const sorted = [...violations].sort((a, b) => {
      if (a.severity === b.severity) {
        return a.timestampMs - b.timestampMs;
      }
      return a.severity === "error" ? -1 : 1;
    });
    for (const v of sorted) {
      if (this.speak(v.message, timestampMs)) {
        return v.message;
      }
    }
    return null;
  }
  /**
   * 直接播报一段文案（带去重）。
   * @param text 文案
   * @param timestampMs 时间戳（ms）
   * @returns 是否实际播报
   */
  speak(text, timestampMs) {
    if (!text || !this.enabled || !_FeedbackManager.isSupported()) {
      return false;
    }
    const last = this.lastSpokenAt.get(text);
    if (last !== void 0 && timestampMs - last < this.minIntervalMs) {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.lang;
      utterance.volume = this.volume;
      utterance.rate = this.rate;
      window.speechSynthesis.speak(utterance);
      this.lastSpokenAt.set(text, timestampMs);
      this.lastText = text;
      this.pruneMap(timestampMs);
      return true;
    } catch (error) {
      console.warn("[FeedbackManager] \u8BED\u97F3\u64AD\u62A5\u5931\u8D25", error);
      return false;
    }
  }
  /** 强制播报（忽略去重，用于入场提示 / 重播） */
  forceSpeak(text, timestampMs) {
    this.lastSpokenAt.delete(text);
    return this.speak(text, timestampMs);
  }
  /**
   * 重播上一条文案。
   * @param timestampMs 当前时间戳（ms）
   */
  replayLast(timestampMs) {
    if (!this.lastText) {
      return false;
    }
    return this.forceSpeak(this.lastText, timestampMs);
  }
  /** 清空过期去重记录，避免 Map 无限增长 */
  pruneMap(timestampMs) {
    for (const [key, ts] of this.lastSpokenAt.entries()) {
      if (timestampMs - ts > this.minIntervalMs * 4) {
        this.lastSpokenAt.delete(key);
      }
    }
  }
  /** 语音开关 */
  setEnabled(value) {
    this.enabled = value;
    if (!value && _FeedbackManager.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
  /** 是否启用 */
  isEnabled() {
    return this.enabled;
  }
  /** 设置音量 0-1 */
  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, value));
  }
  /** 设置语速 0.5-2 */
  setRate(value) {
    this.rate = Math.min(2, Math.max(0.5, value));
  }
  /** 重置状态 */
  reset() {
    this.lastSpokenAt.clear();
    this.lastText = null;
    if (_FeedbackManager.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
};

// src/constants/landmarks.ts
var LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};
var TRIPLES = {
  LEFT_KNEE: { a: LM.LEFT_HIP, b: LM.LEFT_KNEE, c: LM.LEFT_ANKLE },
  RIGHT_KNEE: { a: LM.RIGHT_HIP, b: LM.RIGHT_KNEE, c: LM.RIGHT_ANKLE },
  LEFT_HIP: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
  RIGHT_HIP: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_KNEE },
  LEFT_ELBOW: { a: LM.LEFT_SHOULDER, b: LM.LEFT_ELBOW, c: LM.LEFT_WRIST },
  RIGHT_ELBOW: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_ELBOW, c: LM.RIGHT_WRIST },
  LEFT_TORSO: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
  RIGHT_TORSO: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_KNEE },
  LEFT_BODY_LINE: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
  RIGHT_BODY_LINE: { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, c: LM.RIGHT_ANKLE }
};

// src/exercises/plank.ts
var plankConfig = {
  id: "plank",
  name: "\u5E73\u677F\u652F\u6491",
  nameEn: "Plank",
  bodyPart: "core",
  difficulty: 2,
  supported: true,
  icon: "plank",
  description: "\u5F3A\u5316\u6838\u5FC3\u7A33\u5B9A\uFF0C\u5851\u9020\u8179\u90E8\u7EBF\u6761\u3002",
  tips: ["\u4FA7\u9762\u62CD\u6444", "\u8098\u5728\u80A9\u6B63\u4E0B\u65B9", "\u6536\u7D27\u6838\u5FC3"],
  mode: "hold",
  rules: [
    {
      id: "body-line",
      label: "\u8EAB\u4F53\u6210\u76F4\u7EBF",
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
      targetRange: [160, 180],
      messageLow: "\u8170\u80CC\u633A\u76F4\uFF0C\u6536\u7D27\u6838\u5FC3",
      messageHigh: "\u81C0\u90E8\u522B\u62AC\u9AD8\uFF0C\u8EAB\u4F53\u653E\u5E73",
      severity: "error",
      weight: 50
    },
    {
      id: "hip-height",
      label: "\u9ACB\u90E8\u9AD8\u5EA6",
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
      targetRange: [165, 185],
      messageLow: "\u81C0\u90E8\u592A\u9AD8\u4E86\uFF0C\u5F80\u4E0B\u653E\u4E00\u70B9",
      messageHigh: "\u8170\u522B\u584C\uFF0C\u63D0\u8D77\u9ACB\u90E8",
      severity: "error",
      weight: 30
    },
    {
      id: "neck-align",
      label: "\u5934\u9888\u4E2D\u7ACB",
      triple: { a: LM.NOSE, b: LM.LEFT_SHOULDER, c: LM.LEFT_HIP },
      targetRange: [150, 180],
      messageLow: "\u5934\u522B\u4F4E\u5782\uFF0C\u770B\u5411\u5730\u9762",
      messageHigh: "\u8116\u5B50\u653E\u677E\uFF0C\u4E0D\u8981\u62AC\u592A\u9AD8",
      severity: "warn",
      weight: 20
    }
  ],
  repCounter: null,
  hold: {
    sampleIntervalMs: 500,
    passRateWarnThreshold: 0.7
  },
  scoring: {
    baseScore: 100,
    errorPenalty: 12,
    warnPenalty: 6,
    minScore: 0
  }
};

// src/exercises/pushup.ts
var pushupConfig = {
  id: "pushup",
  name: "\u4FEF\u5367\u6491",
  nameEn: "Push-up",
  bodyPart: "chest",
  difficulty: 2,
  supported: true,
  icon: "pushup",
  description: "\u953B\u70BC\u80F8\u808C\u3001\u80A9\u90E8\u4E0E\u4E09\u5934\u808C\u3002",
  tips: ["\u4FA7\u9762\u62CD\u6444", "\u8EAB\u4F53\u6210\u4E00\u6761\u76F4\u7EBF", "\u624B\u8155\u5728\u80A9\u6B63\u4E0B\u65B9"],
  mode: "reps",
  rules: [
    {
      id: "elbow-angle",
      label: "\u8098\u90E8\u5C48\u4F38",
      triple: TRIPLES.LEFT_ELBOW,
      targetRange: [70, 100],
      messageLow: "\u4E0B\u5F97\u592A\u4F4E\u4E86\uFF0C\u8098\u90E8\u522B\u8FC7\u6DF1",
      messageHigh: "\u518D\u5F80\u4E0B\u4E00\u70B9\uFF0C\u80F8\u8D34\u8FD1\u5730\u9762",
      severity: "warn",
      weight: 40,
      activePhases: ["bottom"]
    },
    {
      id: "body-line",
      label: "\u8EAB\u4F53\u6210\u76F4\u7EBF",
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_ANKLE },
      targetRange: [160, 180],
      messageLow: "\u584C\u8170\u4E86\uFF0C\u6536\u7D27\u6838\u5FC3\uFF0C\u8EAB\u4F53\u6253\u76F4",
      messageHigh: "\u5C41\u80A1\u522B\u6485\u8D77\u6765\uFF0C\u8EAB\u4F53\u6253\u76F4",
      severity: "error",
      weight: 40
    },
    {
      id: "wrist-placement",
      label: "\u624B\u8155\u4F4D\u7F6E",
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_ELBOW, c: LM.LEFT_WRIST },
      targetRange: [150, 180],
      messageLow: "\u624B\u8155\u522B\u5916\u7FFB\uFF0C\u5C0F\u81C2\u5782\u76F4\u5730\u9762",
      messageHigh: "\u624B\u8155\u5BF9\u51C6\u80A9\u8180",
      severity: "warn",
      weight: 20,
      activePhases: ["bottom"]
    }
  ],
  repCounter: {
    phases: [
      {
        phase: "up",
        label: "\u6491\u8D77",
        condition: { triple: TRIPLES.LEFT_ELBOW, range: [150, 180] }
      },
      {
        phase: "lowering",
        label: "\u4E0B\u653E\u4E2D",
        condition: { triple: TRIPLES.LEFT_ELBOW, range: [100, 150] }
      },
      {
        phase: "bottom",
        label: "\u6700\u4F4E\u70B9",
        condition: { triple: TRIPLES.LEFT_ELBOW, range: [0, 100] }
      }
    ],
    completePhase: "up",
    requiredIntermediatePhase: "bottom",
    minRepIntervalMs: 700
  },
  scoring: {
    baseScore: 100,
    errorPenalty: 12,
    warnPenalty: 6,
    minScore: 0
  }
};

// src/exercises/squat.ts
var squatConfig = {
  id: "squat",
  name: "\u6DF1\u8E72",
  nameEn: "Squat",
  bodyPart: "legs",
  difficulty: 1,
  supported: true,
  icon: "squat",
  description: "\u953B\u70BC\u5927\u817F\u4E0E\u81C0\u90E8\uFF0C\u5F3A\u5316\u4E0B\u80A2\u529B\u91CF\u3002",
  tips: ["\u4FA7\u9762 45\xB0 \u62CD\u6444", "\u5168\u8EAB\u5165\u955C", "\u53CC\u811A\u4E0E\u80A9\u540C\u5BBD"],
  mode: "reps",
  rules: [
    {
      id: "knee-depth",
      label: "\u4E0B\u8E72\u6DF1\u5EA6",
      triple: TRIPLES.LEFT_KNEE,
      targetRange: [70, 100],
      messageLow: "\u8E72\u5F97\u592A\u4F4E\u4E86\uFF0C\u6CE8\u610F\u819D\u76D6",
      messageHigh: "\u518D\u8E72\u6DF1\u4E00\u70B9\uFF0C\u5927\u817F\u5230\u6C34\u5E73",
      severity: "warn",
      weight: 30,
      activePhases: ["bottom"]
    },
    {
      id: "hip-angle",
      label: "\u9ACB\u90E8\u5C48\u66F2",
      triple: TRIPLES.LEFT_HIP,
      targetRange: [80, 110],
      messageLow: "\u80CC\u4E0D\u8981\u592A\u5F2F\uFF0C\u633A\u76F4\u8170\u80CC",
      messageHigh: "\u81C0\u90E8\u518D\u5F80\u540E\u5750",
      severity: "warn",
      weight: 25,
      activePhases: ["bottom"]
    },
    {
      id: "torso-lean",
      label: "\u8EAF\u5E72\u524D\u503E",
      triple: { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, c: LM.LEFT_KNEE },
      targetRange: [70, 110],
      messageLow: "\u8EAB\u4F53\u592A\u524D\u503E\uFF0C\u80F8\u53E3\u633A\u8D77\u6765",
      messageHigh: "\u80CC\u522B\u540E\u4EF0\uFF0C\u4FDD\u6301\u76F4\u7ACB",
      severity: "error",
      weight: 25,
      activePhases: ["bottom"]
    },
    {
      id: "knee-valgus",
      label: "\u819D\u76D6\u8F68\u8FF9",
      triple: { a: LM.LEFT_HIP, b: LM.LEFT_KNEE, c: LM.LEFT_ANKLE },
      targetRange: [75, 105],
      messageLow: "\u819D\u76D6\u4E0D\u8981\u5185\u6263\uFF0C\u5411\u4E24\u4FA7\u6253\u5F00",
      messageHigh: "\u819D\u76D6\u5BF9\u9F50\u811A\u5C16\u65B9\u5411",
      severity: "error",
      weight: 20,
      activePhases: ["descending", "bottom"]
    }
  ],
  repCounter: {
    phases: [
      {
        phase: "standing",
        label: "\u7AD9\u7ACB",
        condition: { triple: TRIPLES.LEFT_KNEE, range: [160, 180] }
      },
      {
        phase: "descending",
        label: "\u4E0B\u8E72\u4E2D",
        condition: { triple: TRIPLES.LEFT_KNEE, range: [100, 160] }
      },
      {
        phase: "bottom",
        label: "\u5E95\u90E8",
        condition: { triple: TRIPLES.LEFT_KNEE, range: [0, 100] }
      }
    ],
    completePhase: "standing",
    requiredIntermediatePhase: "bottom",
    minRepIntervalMs: 800
  },
  scoring: {
    baseScore: 100,
    errorPenalty: 12,
    warnPenalty: 6,
    minScore: 0
  }
};

// src/exercises/index.ts
var EXERCISE_REGISTRY = {
  squat: squatConfig,
  pushup: pushupConfig,
  plank: plankConfig
};
var EXERCISE_LIST = Object.values(EXERCISE_REGISTRY);
function getExercise(id) {
  if (id in EXERCISE_REGISTRY) {
    return EXERCISE_REGISTRY[id];
  }
  return null;
}
function isExerciseId(id) {
  return id in EXERCISE_REGISTRY;
}

// tests/engine.test.ts
var results = [];
var currentSuite = "";
function suite(name) {
  currentSuite = name;
}
function test(name, fn) {
  const full = `${currentSuite} > ${name}`;
  try {
    fn();
    results.push({ name: full, pass: true, detail: "ok" });
  } catch (err) {
    results.push({
      name: full,
      pass: false,
      detail: err instanceof Error ? err.message : String(err)
    });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg} (expected=${String(expected)}, actual=${String(actual)})`);
  }
}
function assertApprox(actual, expected, tol, msg) {
  if (Math.abs(actual - expected) > tol) {
    throw new Error(`${msg} (expected\u2248${expected}\xB1${tol}, actual=${actual})`);
  }
}
function lm(x, y, visibility = 1) {
  return { x, y, z: 0, visibility };
}
function makeLandmarks(overrides = {}) {
  const arr = [];
  for (let i = 0; i < 33; i += 1) arr.push(lm(0.5, 0.5, 1));
  for (const k of Object.keys(overrides)) {
    arr[Number(k)] = overrides[Number(k)];
  }
  return arr;
}
function pixel2landmark(px, py, visibility = 1) {
  const aspect = 16 / 9;
  return lm(px / aspect, py, visibility);
}
suite("T2.1 \u89D2\u5EA6\u8BA1\u7B97 (angleCalculator)");
test("\u4E09\u70B9\u5171\u7EBF \u2192 180\xB0", () => {
  const a = pixel2landmark(0, 0);
  const b = pixel2landmark(1, 0);
  const c = pixel2landmark(2, 0);
  assertEqual(calcAngle(a, b, c), 180, "\u5171\u7EBF\u5939\u89D2\u5E94\u4E3A 180\xB0");
});
test("\u76F4\u89D2 \u2192 90\xB0", () => {
  const a = pixel2landmark(0, 0);
  const b = pixel2landmark(0, 1);
  const c = pixel2landmark(1, 1);
  assertEqual(calcAngle(a, b, c), 90, "\u76F4\u89D2\u5E94\u4E3A 90\xB0");
});
test("\u9510\u89D2 45\xB0", () => {
  const b = pixel2landmark(0, 0);
  const a = pixel2landmark(1, 0);
  const c = pixel2landmark(1, 1);
  assertApprox(calcAngle(a, b, c), 45, 1, "45\xB0 \u5939\u89D2");
});
test("\u949D\u89D2 135\xB0", () => {
  const b = pixel2landmark(0, 0);
  const a = pixel2landmark(1, 0);
  const c = pixel2landmark(-1, 1);
  assertApprox(calcAngle(a, b, c), 135, 1, "135\xB0 \u5939\u89D2");
});
test("\u96F6\u957F\u5EA6\u5411\u91CF \u2192 \u8FD4\u56DE 0\uFF08\u4E0D\u629B\u5F02\u5E38\uFF09", () => {
  const a = pixel2landmark(1, 1);
  const b = pixel2landmark(1, 1);
  const c = pixel2landmark(2, 2);
  assertEqual(calcAngle(a, b, c), 0, "\u9000\u5316\u8F93\u5165\u5E94\u8FD4\u56DE 0");
});
test("calcJointAngle \u7D22\u5F15\u8D8A\u754C \u2192 \u8FD4\u56DE 0", () => {
  const lms = makeLandmarks();
  const angle = calcJointAngle(lms, { a: 0, b: 99, c: 1 });
  assertEqual(angle, 0, "\u8D8A\u754C\u7D22\u5F15\u5E94\u8FD4\u56DE 0");
});
test("calcJointAngle \u6B63\u5E38\u53D6\u503C", () => {
  const lms = makeLandmarks({
    23: pixel2landmark(0, 0),
    25: pixel2landmark(1, 0),
    27: pixel2landmark(2, 0)
  });
  const angle = calcJointAngle(lms, TRIPLES.LEFT_KNEE);
  assertEqual(angle, 180, "\u9ACB-\u819D-\u8E1D\u5171\u7EBF\u5E94\u4E3A 180\xB0");
});
test("calcVerticalAngle \u5782\u76F4\u5411\u4E0B \u2192 0\xB0", () => {
  const a = pixel2landmark(0.5, 0);
  const b = pixel2landmark(0.5, 1);
  assertApprox(calcVerticalAngle(a, b), 0, 1, "\u7AD6\u76F4\u5411\u4E0B\u5E94\u4E3A 0\xB0");
});
test("calcVerticalAngle \u6C34\u5E73 \u2192 90\xB0", () => {
  const a = pixel2landmark(0, 0.5);
  const b = pixel2landmark(1, 0.5);
  assertApprox(calcVerticalAngle(a, b), 90, 1, "\u6C34\u5E73\u65B9\u5411\u5E94\u4E3A 90\xB0");
});
test("calcVerticalAngle \u9000\u5316\u70B9 \u2192 0", () => {
  const a = pixel2landmark(0.5, 0.5);
  const b = pixel2landmark(0.5, 0.5);
  assertEqual(calcVerticalAngle(a, b), 0, "\u91CD\u5408\u70B9\u5E94\u8FD4\u56DE 0");
});
test("calcHorizontalDistance \u5F52\u4E00\u5316 x \u5DEE\u503C", () => {
  const a = lm(0.2, 0.5);
  const b = lm(0.7, 0.5);
  assertApprox(calcHorizontalDistance(a, b), 0.5, 1e-9, "\u6C34\u5E73\u8DDD\u79BB");
});
test("\u89D2\u5EA6\u7ED3\u679C\u6052\u5728 [0,180] \u4E14\u4E3A\u6574\u6570", () => {
  const samples = [
    [pixel2landmark(0, 0), pixel2landmark(1, 0), pixel2landmark(0, 1)],
    [pixel2landmark(3, 4), pixel2landmark(0, 0), pixel2landmark(-3, 4)],
    [pixel2landmark(0.1, 0.9), pixel2landmark(0.5, 0.5), pixel2landmark(0.9, 0.1)]
  ];
  for (const [a, b, c] of samples) {
    const angle = calcAngle(a, b, c);
    assert(angle >= 0 && angle <= 180, `\u89D2\u5EA6\u8D8A\u754C: ${angle}`);
    assertEqual(angle, Math.round(angle), `\u89D2\u5EA6\u5E94\u4E3A\u6574\u6570: ${angle}`);
  }
});
suite("T2.2 \u72B6\u6001\u673A\u8BA1\u6570 (repCounter)");
function kneeLandmarksForAngle(angleDeg) {
  const hip = pixel2landmark(0, 0);
  const knee = pixel2landmark(0, 1);
  const rad = angleDeg * Math.PI / 180;
  const ax = Math.sin(rad);
  const ay = -Math.cos(rad);
  const ankle = pixel2landmark(0 + ax * 1, 1 + ay * 1);
  return makeLandmarks({
    23: hip,
    25: knee,
    27: ankle
  });
}
test("\u6DF1\u8E72\u5E8F\u5217 180\u2192160\u2192100\u219280\u2192100\u2192160\u2192180 \u8BA1 1 \u6B21", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  const seq = [180, 160, 100, 80, 100, 160, 180];
  let lastCount = 0;
  for (const angle of seq) {
    t += 40;
    const state = rc.update(kneeLandmarksForAngle(angle), t);
    lastCount = state.repCount;
  }
  assertEqual(lastCount, 1, "\u5B8C\u6574\u6DF1\u8E72\u5E8F\u5217\u5E94\u8BA1\u6570 1");
});
test("\u53EA\u4E0B\u8E72\u4E0D\u5165\u5E95\u90E8 \u2192 \u4E0D\u8BA1\u6570\uFF08\u4E0D\u7ECF\u8FC7\u4E2D\u95F4\u9636\u6BB5\uFF09", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  const seq = [180, 140, 180, 140, 180];
  for (const angle of seq) {
    t += 200;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assertEqual(rc.getCount(), 0, "\u672A\u7ECF\u8FC7\u5E95\u90E8\u9636\u6BB5\u4E0D\u5E94\u8BA1\u6570");
});
test("\u9632\u6296\uFF1AminRepIntervalMs \u5185\u7B2C\u4E8C\u6B21\u4E0D\u8BA1\u6570", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  const seq = [180, 80, 180, 80, 180];
  let t = 0;
  for (const angle of seq) {
    t += 100;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assertEqual(rc.getCount(), 1, "800ms \u5185\u4E0D\u5E94\u91CD\u590D\u8BA1\u6570");
});
test("\u9632\u6296\uFF1A\u8D85\u8FC7\u95F4\u9694\u540E\u7B2C\u4E8C\u6B21\u6B63\u5E38\u8BA1\u6570", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  for (const angle of [180, 80, 180]) {
    t += 100;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  t += 900;
  for (const angle of [80, 180]) {
    t += 100;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assertEqual(rc.getCount(), 2, "\u8D85\u8FC7\u95F4\u9694\u540E\u5E94\u8BA1\u6570\u7B2C 2 \u6B21");
});
test("repJustCompleted \u6807\u5FD7\u4EC5\u5728\u5B8C\u6210\u5E27\u4E3A true", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  const flags = [];
  for (const angle of [180, 80, 180, 180]) {
    t += 300;
    flags.push(rc.update(kneeLandmarksForAngle(angle), t).repJustCompleted);
  }
  assertEqual(flags[0], false, "\u7AD9\u7ACB\u5E27\u4E0D\u5E94\u6807\u8BB0\u5B8C\u6210");
  assertEqual(flags[1], false, "\u5E95\u90E8\u5E27\u4E0D\u5E94\u6807\u8BB0\u5B8C\u6210");
  assertEqual(flags[2], true, "\u56DE\u5230\u7AD9\u7ACB\u5E27\u5E94\u6807\u8BB0\u5B8C\u6210");
  assertEqual(flags[3], false, "\u91CD\u590D\u7AD9\u7ACB\u5E27\u4E0D\u5E94\u518D\u6807\u8BB0");
});
test("reset() \u6E05\u96F6\u8BA1\u6570\u4E0E\u9636\u6BB5", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  for (const angle of [180, 80, 180]) {
    t += 300;
    rc.update(kneeLandmarksForAngle(angle), t);
  }
  assert(rc.getCount() === 1, "\u91CD\u7F6E\u524D\u5E94\u6709 1 \u6B21");
  rc.reset();
  assertEqual(rc.getCount(), 0, "reset \u540E\u8BA1\u6570\u5F52\u96F6");
  assertEqual(rc.getPhase(), "standing", "reset \u540E\u56DE\u5230 completePhase");
});
test("\u9636\u6BB5\u6807\u7B7E\u53EF\u8BFB\uFF08\u7AD9\u7ACB/\u5E95\u90E8\uFF09", () => {
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  rc.update(kneeLandmarksForAngle(180), t += 10);
  assertEqual(rc.getPhaseLabel(), "\u7AD9\u7ACB", "\u7AD9\u7ACB\u9636\u6BB5\u6807\u7B7E");
  rc.update(kneeLandmarksForAngle(80), t += 10);
  assertEqual(rc.getPhaseLabel(), "\u5E95\u90E8", "\u5E95\u90E8\u9636\u6BB5\u6807\u7B7E");
});
suite("T2.3 \u89C4\u5219\u5F15\u64CE (ruleEngine)");
function squatPoseWithKneeAngle(angleDeg) {
  return kneeLandmarksForAngle(angleDeg);
}
test("\u9636\u6BB5\u8FC7\u6EE4\uFF1A\u975E bottom \u9636\u6BB5 knee-depth \u89C4\u5219\u4E0D\u751F\u6548", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(180);
  const vStanding = engine.evaluate(lms, "standing", 0);
  const hasKneeDepth = vStanding.some((v) => v.ruleId === "knee-depth");
  assertEqual(hasKneeDepth, false, "standing \u9636\u6BB5 knee-depth \u4E0D\u5E94\u89E6\u53D1");
});
test("bottom \u9636\u6BB5\u819D\u89D2\u8FC7\u6D45(160\xB0) \u2192 \u89E6\u53D1 messageHigh \u6587\u6848", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(160);
  const violations = engine.evaluate(lms, "bottom", 0);
  const v = violations.find((x) => x.ruleId === "knee-depth");
  assert(v !== void 0, "\u819D\u89D2 160 > \u4E0A\u9650 100 \u5E94\u89E6\u53D1 knee-depth");
  assertEqual(v.message, "\u518D\u8E72\u6DF1\u4E00\u70B9\uFF0C\u5927\u817F\u5230\u6C34\u5E73", "\u5E94\u7ED9\u51FA\u300C\u8E72\u592A\u6D45\u300D\u63D0\u793A");
  assertEqual(v.severity, "warn", "\u4E25\u91CD\u5EA6\u5E94\u4E3A warn");
  assertEqual(v.actualAngle, 160, "\u5B9E\u6D4B\u89D2\u5EA6\u8BB0\u5F55");
});
test("bottom \u9636\u6BB5\u819D\u89D2\u8FC7\u6DF1(50\xB0) \u2192 \u89E6\u53D1 messageLow \u6587\u6848", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(50);
  const violations = engine.evaluate(lms, "bottom", 0);
  const v = violations.find((x) => x.ruleId === "knee-depth");
  assert(v !== void 0, "\u819D\u89D2 50 < \u4E0B\u9650 70 \u5E94\u89E6\u53D1 knee-depth");
  assertEqual(v.message, "\u8E72\u5F97\u592A\u4F4E\u4E86\uFF0C\u6CE8\u610F\u819D\u76D6", "\u5E94\u7ED9\u51FA\u300C\u8E72\u592A\u4F4E\u300D\u63D0\u793A");
});
test("bottom \u9636\u6BB5\u819D\u89D2\u5728\u533A\u95F4\u5185(85\xB0) \u2192 \u65E0 knee-depth \u8FDD\u89C4", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(85);
  const violations = engine.evaluate(lms, "bottom", 0);
  const v = violations.find((x) => x.ruleId === "knee-depth");
  assertEqual(v, void 0, "\u533A\u95F4\u5185\u4E0D\u5E94\u89E6\u53D1 knee-depth");
});
test("\u7F6E\u4FE1\u5EA6\u95E8\u63A7\uFF1A\u5173\u952E\u70B9 visibility<0.5 \u2192 \u89C4\u5219\u8DF3\u8FC7", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(160);
  lms[25] = { ...lms[25], visibility: 0.2 };
  const violations = engine.evaluate(lms, "bottom", 0);
  const v = violations.find((x) => x.ruleId === "knee-depth");
  assertEqual(v, void 0, "\u4F4E\u53EF\u89C1\u5EA6\u70B9\u5E94\u88AB\u95E8\u63A7\u8DF3\u8FC7");
});
test("\u5173\u952E\u70B9\u4E0D\u8DB3 33 \u2192 \u8FD4\u56DE\u7A7A\u8FDD\u89C4\u6570\u7EC4", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const violations = engine.evaluate(makeLandmarks().slice(0, 10), "bottom", 0);
  assertEqual(violations.length, 0, "\u70B9\u6570\u4E0D\u8DB3\u5E94\u8FD4\u56DE\u7A7A\u6570\u7EC4");
});
test("evaluateAll \u5FFD\u7565\u9636\u6BB5\uFF08hold \u6A21\u5F0F\u7528\uFF09", () => {
  const gate = new ConfidenceGate();
  const engine = new RuleEngine(squatConfig, gate);
  const lms = squatPoseWithKneeAngle(160);
  const violations = engine.evaluateAll(lms, 0);
  const v = violations.find((x) => x.ruleId === "knee-depth");
  assert(v !== void 0, "evaluateAll \u5E94\u5FFD\u7565 activePhases \u751F\u6548");
});
test("ConfidenceGate.isBodyDetected \u9700\u8981 \u22658 \u4E2A\u6709\u6548\u70B9", () => {
  const gate = new ConfidenceGate();
  const few = makeLandmarks();
  for (let i = 0; i < 33; i += 1) few[i] = { ...few[i], visibility: i < 5 ? 0.9 : 0.1 };
  assertEqual(gate.isBodyDetected(few), false, "5 \u4E2A\u6709\u6548\u70B9\u5E94\u5224\u5B9A\u672A\u68C0\u6D4B\u5230\u4EBA\u4F53");
  const many = makeLandmarks();
  for (let i = 0; i < 33; i += 1) many[i] = { ...many[i], visibility: i < 8 ? 0.9 : 0.1 };
  assertEqual(gate.isBodyDetected(many), true, "8 \u4E2A\u6709\u6548\u70B9\u5E94\u5224\u5B9A\u68C0\u6D4B\u5230\u4EBA\u4F53");
});
suite("T2.4 \u8BED\u97F3\u53BB\u91CD (feedbackManager)");
function installFakeSpeech() {
  const fake = { spoken: [], cancelCount: 0 };
  const g = globalThis;
  if (!g.window) g.window = {};
  g.window.speechSynthesis = {
    speak(u) {
      fake.spoken.push(u.text);
    },
    cancel() {
      fake.cancelCount += 1;
    }
  };
  g.SpeechSynthesisUtterance = class {
    text;
    lang = "en";
    volume = 1;
    rate = 1;
    constructor(text) {
      this.text = text;
    }
  };
  return fake;
}
test("\u540C\u6587\u6848 3s \u5185\u4E0D\u91CD\u590D\u64AD\u62A5", () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  assertEqual(fm.speak("\u518D\u8E72\u6DF1\u4E00\u70B9", 1e3), true, "\u9996\u6B21\u5E94\u64AD\u62A5");
  assertEqual(fm.speak("\u518D\u8E72\u6DF1\u4E00\u70B9", 2e3), false, "1s \u540E\u540C\u6587\u6848\u5E94\u88AB\u53BB\u91CD");
  assertEqual(fm.speak("\u518D\u8E72\u6DF1\u4E00\u70B9", 3999), false, "2999ms \u5185\u5E94\u53BB\u91CD");
  assertEqual(fm.speak("\u518D\u8E72\u6DF1\u4E00\u70B9", 4e3), true, "\u6070\u597D 3000ms \u540E\u5E94\u53EF\u518D\u64AD");
});
test("\u4E0D\u540C\u6587\u6848\u4E92\u4E0D\u53BB\u91CD", () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  assertEqual(fm.speak("\u6587\u6848A", 1e3), true, "A \u9996\u64AD");
  assertEqual(fm.speak("\u6587\u6848B", 1100), true, "B \u4E0D\u540C\u6587\u6848\u5E94\u53EF\u64AD");
});
test("submit \u6309 error \u4F18\u5148\u4E8E warn", () => {
  const fake = installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  const spoken = fm.submit(
    [
      { ruleId: "w1", label: "w", severity: "warn", message: "\u8B66\u544A\u6587\u6848", actualAngle: 1, targetRange: [0, 1], timestampMs: 10 },
      { ruleId: "e1", label: "e", severity: "error", message: "\u4E25\u91CD\u6587\u6848", actualAngle: 1, targetRange: [0, 1], timestampMs: 20 }
    ],
    1e3
  );
  assertEqual(spoken, "\u4E25\u91CD\u6587\u6848", "error \u5E94\u4F18\u5148\u64AD\u62A5");
  assertEqual(fake.spoken[0], "\u4E25\u91CD\u6587\u6848", "\u5B9E\u9645\u64AD\u62A5 error \u6587\u6848");
});
test("submit \u7A7A\u8FDD\u89C4 \u2192 \u8FD4\u56DE null \u4E0D\u64AD\u62A5", () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  assertEqual(fm.submit([], 1e3), null, "\u7A7A\u5217\u8868\u5E94\u8FD4\u56DE null");
});
test("\u7981\u7528\u540E\u4E0D\u64AD\u62A5", () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  fm.setEnabled(false);
  assertEqual(fm.speak("\u9759\u97F3", 1e3), false, "\u7981\u7528\u540E\u5E94\u8FD4\u56DE false");
});
test("forceSpeak \u5FFD\u7565\u53BB\u91CD", () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  assertEqual(fm.speak("\u5165\u573A", 1e3), true, "\u9996\u64AD");
  assertEqual(fm.speak("\u5165\u573A", 1100), false, "\u53BB\u91CD\u751F\u6548");
  assertEqual(fm.forceSpeak("\u5165\u573A", 1200), true, "forceSpeak \u5E94\u5FFD\u7565\u53BB\u91CD");
});
test("\u97F3\u91CF/\u8BED\u901F\u94B3\u5236\u5230\u5408\u6CD5\u533A\u95F4", () => {
  installFakeSpeech();
  const fm = new FeedbackManager(3e3);
  fm.setVolume(5);
  fm.setRate(9);
  const anyFm = fm;
  assertEqual(anyFm.volume, 1, "\u97F3\u91CF\u4E0A\u9650 1");
  assertEqual(anyFm.rate, 2, "\u8BED\u901F\u4E0A\u9650 2");
  fm.setVolume(-1);
  fm.setRate(0.1);
  assertEqual(anyFm.volume, 0, "\u97F3\u91CF\u4E0B\u9650 0");
  assertEqual(anyFm.rate, 0.5, "\u8BED\u901F\u4E0B\u9650 0.5");
});
suite("T2.5 \u8BC4\u5206\u5F15\u64CE (scoringEngine)");
test("\u65E0\u8FDD\u89C4 \u2192 \u6EE1\u5206", () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.scoreRep([]), 100, "\u65E0\u8FDD\u89C4\u5E94\u4E3A 100");
});
test("1 \u4E2A error \u6263 12 \u5206", () => {
  const se = new ScoringEngine(squatConfig.scoring);
  const v = [{ ruleId: "a", label: "a", severity: "error", message: "", actualAngle: 0, targetRange: [0, 1], timestampMs: 0 }];
  assertEqual(se.scoreRep(v), 88, "error \u6263 12");
});
test("1 \u4E2A warn \u6263 6 \u5206", () => {
  const se = new ScoringEngine(squatConfig.scoring);
  const v = [{ ruleId: "a", label: "a", severity: "warn", message: "", actualAngle: 0, targetRange: [0, 1], timestampMs: 0 }];
  assertEqual(se.scoreRep(v), 94, "warn \u6263 6");
});
test("\u591A\u8FDD\u89C4\u53E0\u52A0\u4E14\u4E0D\u4F4E\u4E8E minScore", () => {
  const se = new ScoringEngine(squatConfig.scoring);
  const mk = (sev) => ({ ruleId: "x", label: "x", severity: sev, message: "", actualAngle: 0, targetRange: [0, 1], timestampMs: 0 });
  const many = [mk("error"), mk("error"), mk("error"), mk("error"), mk("error"), mk("error"), mk("error"), mk("error"), mk("error"), mk("error")];
  assertEqual(se.scoreRep(many), 0, "\u6263\u5206\u8FC7\u591A\u5E94\u94B3\u5236\u5230 minScore=0");
});
test("scoreHold = baseScore * passRate", () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.scoreHold(0.8), 80, "\u8FBE\u6807\u7387 0.8 \u2192 80 \u5206");
  assertEqual(se.scoreHold(1), 100, "\u8FBE\u6807\u7387 1 \u2192 100");
  assertEqual(se.scoreHold(0), 0, "\u8FBE\u6807\u7387 0 \u2192 0");
});
test("scoreHold \u975E\u6CD5\u8FBE\u6807\u7387\uFF08NaN/\u8D85\u8303\u56F4\uFF09\u88AB\u94B3\u5236", () => {
  const se = new ScoringEngine(squatConfig.scoring);
  assertEqual(se.scoreHold(NaN), 0, "NaN \u2192 0");
  assertEqual(se.scoreHold(2), 100, ">1 \u94B3\u5236\u5230 1");
  assertEqual(se.scoreHold(-1), 0, "<0 \u94B3\u5236\u5230 0");
});
suite("T3 \u6269\u5C55\u6027\u9A8C\u8BC1");
test("\u6CE8\u518C\u8868\u5305\u542B 3 \u4E2A\u52A8\u4F5C\u4E14 id \u4E00\u81F4", () => {
  const ids = Object.keys(EXERCISE_REGISTRY).sort();
  assertEqual(ids.join(","), "plank,pushup,squat", "\u6CE8\u518C\u8868\u5E94\u542B squat/pushup/plank");
  assertEqual(EXERCISE_LIST.length, 3, "\u52A8\u4F5C\u5217\u8868\u5E94\u6709 3 \u9879");
});
test("getExercise \u6309 id \u8FD4\u56DE\u914D\u7F6E\uFF0C\u672A\u77E5 id \u8FD4\u56DE null", () => {
  assertEqual(getExercise("squat")?.id, "squat", "\u5E94\u8FD4\u56DE\u6DF1\u8E72\u914D\u7F6E");
  assertEqual(getExercise("unknown"), null, "\u672A\u77E5 id \u5E94\u8FD4\u56DE null");
});
test("isExerciseId \u7C7B\u578B\u5B88\u536B\u6B63\u786E", () => {
  assertEqual(isExerciseId("plank"), true, "plank \u662F\u5408\u6CD5 id");
  assertEqual(isExerciseId("deadlift"), false, "deadlift \u975E\u5408\u6CD5 id");
});
test("\u6A21\u62DF\u65B0\u589E\u52A8\u4F5C\uFF1A\u4EC5\u9760\u914D\u7F6E\u5373\u53EF\u88AB\u6CE8\u518C\u8868\u8BC6\u522B\uFF08\u4E0D\u6539\u5F15\u64CE\u4EE3\u7801\uFF09", () => {
  const lunge = {
    id: "squat",
    // 复用 id 类型
    name: "\u5F13\u6B65\u8E72",
    nameEn: "Lunge",
    bodyPart: "legs",
    difficulty: 2,
    supported: true,
    icon: "lunge",
    description: "\u6D4B\u8BD5\u7528",
    tips: ["\u4FA7\u9762\u62CD\u6444"],
    mode: "reps",
    rules: [
      {
        id: "knee-depth",
        label: "\u524D\u819D\u89D2\u5EA6",
        triple: TRIPLES.LEFT_KNEE,
        targetRange: [80, 110],
        messageLow: "\u8E72\u592A\u6DF1",
        messageHigh: "\u518D\u8E72\u6DF1",
        severity: "warn",
        weight: 100
      }
    ],
    repCounter: {
      phases: [
        { phase: "stand", label: "\u7AD9\u7ACB", condition: { triple: TRIPLES.LEFT_KNEE, range: [160, 180] } },
        { phase: "down", label: "\u4E0B\u8E72", condition: { triple: TRIPLES.LEFT_KNEE, range: [0, 110] } }
      ],
      completePhase: "stand",
      requiredIntermediatePhase: "down",
      minRepIntervalMs: 700
    },
    scoring: { baseScore: 100, errorPenalty: 12, warnPenalty: 6, minScore: 0 }
  };
  const gate = new ConfidenceGate();
  const rc = new RepCounter(lunge.repCounter, gate);
  const re = new RuleEngine(lunge, gate);
  let t = 0;
  let count = 0;
  for (const angle of [180, 100, 180]) {
    t += 900;
    count = rc.update(kneeLandmarksForAngle(angle), t).repCount;
  }
  assertEqual(count, 1, "\u65B0\u52A8\u4F5C\u914D\u7F6E\u5E94\u80FD\u88AB\u901A\u7528 RepCounter \u6B63\u786E\u8BA1\u6570");
  const violations = re.evaluate(kneeLandmarksForAngle(50), "down", t);
  assert(violations.some((v) => v.ruleId === "knee-depth"), "\u65B0\u52A8\u4F5C\u89C4\u5219\u5E94\u88AB\u901A\u7528 RuleEngine \u8BC4\u4F30");
});
test("\u6240\u6709\u5185\u7F6E\u52A8\u4F5C\u914D\u7F6E\u7ED3\u6784\u5B8C\u6574\uFF08invariant \u6821\u9A8C\uFF09", () => {
  for (const cfg of EXERCISE_LIST) {
    assert(cfg.rules.length > 0, `${cfg.id} \u5FC5\u987B\u6709\u89C4\u5219`);
    assert(cfg.scoring.baseScore > 0, `${cfg.id} baseScore \u5FC5\u987B\u4E3A\u6B63`);
    if (cfg.mode === "reps") {
      assert(cfg.repCounter !== null, `${cfg.id} reps \u6A21\u5F0F\u5FC5\u987B\u6709 repCounter`);
      const rc = cfg.repCounter;
      assert(rc.phases.length >= 2, `${cfg.id} \u81F3\u5C11 2 \u4E2A\u9636\u6BB5`);
      assert(
        rc.phases.some((p) => p.phase === rc.completePhase),
        `${cfg.id} completePhase \u5FC5\u987B\u5728 phases \u4E2D\u5B9A\u4E49`
      );
      assert(
        rc.phases.some((p) => p.phase === rc.requiredIntermediatePhase),
        `${cfg.id} requiredIntermediatePhase \u5FC5\u987B\u5728 phases \u4E2D\u5B9A\u4E49`
      );
    } else {
      assert(cfg.hold !== void 0, `${cfg.id} hold \u6A21\u5F0F\u5FC5\u987B\u6709 hold \u914D\u7F6E`);
    }
  }
});
var passed = results.filter((r) => r.pass).length;
var failed = results.filter((r) => !r.pass).length;
console.log("\n================ \u6D4B\u8BD5\u7ED3\u679C ================");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  if (!r.pass) console.log(`      \u2514\u2500 ${r.detail}`);
}
console.log("==========================================");
console.log(`\u603B\u8BA1: ${results.length} | \u901A\u8FC7: ${passed} | \u5931\u8D25: ${failed}`);
console.log("==========================================\n");
if (failed > 0) {
  process.exitCode = 1;
}
