// src/constants/config.ts
var VISIBILITY_THRESHOLD = 0.5;
var SMOOTH_ALPHA = 0.4;
var BODY_MIN_VISIBLE_LANDMARKS = 8;
var PASS_SCORE = 70;
var TARGET_FPS = 30;
var TARGET_FRAME_INTERVAL_MS = 1e3 / TARGET_FPS;
var STORAGE_PREFIX = "fitness_coach.";
var STORAGE_SESSIONS_KEY = `${STORAGE_PREFIX}sessions.v1`;
var STORAGE_SPEECH_KEY = `${STORAGE_PREFIX}speech.v1`;

// src/engine/smoother.ts
var LandmarkSmoother = class {
  alpha;
  prev = null;
  /**
   * @param alpha 平滑系数，默认 SMOOTH_ALPHA
   */
  constructor(alpha = SMOOTH_ALPHA) {
    this.alpha = alpha;
  }
  /**
   * 对一帧关键点做平滑。
   * @param input 原始关键点数组
   * @returns 平滑后的关键点数组（新数组，不修改入参）
   */
  smooth(input) {
    if (input.length === 0) {
      return input;
    }
    if (!this.prev || this.prev.length !== input.length) {
      this.prev = input.map((lm) => ({ ...lm }));
      return this.prev.map((lm) => ({ ...lm }));
    }
    const alpha = this.alpha;
    const smoothed = input.map((cur, i) => {
      const prev = this.prev;
      const p = prev[i];
      return {
        x: alpha * cur.x + (1 - alpha) * p.x,
        y: alpha * cur.y + (1 - alpha) * p.y,
        z: alpha * cur.z + (1 - alpha) * p.z,
        visibility: alpha * cur.visibility + (1 - alpha) * p.visibility
      };
    });
    this.prev = smoothed.map((lm) => ({ ...lm }));
    return smoothed;
  }
  /** 重置滤波器状态（切换视频源 / 重新开始时调用） */
  reset() {
    this.prev = null;
  }
  /** 设置平滑系数 */
  setAlpha(alpha) {
    this.alpha = Math.min(1, Math.max(0.05, alpha));
  }
};

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
    for (const lm of landmarks) {
      if (lm.visibility >= this.threshold) {
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

// src/engine/angleCalculator.ts
var videoAspectRatio = 16 / 9;
function toVec(lm) {
  return { x: lm.x * videoAspectRatio, y: lm.y };
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

// tests/engine.integration.test.ts
var results = [];
var suiteName = "";
function suite(n) {
  suiteName = n;
}
function test(name, fn) {
  try {
    fn();
    results.push({ name: `${suiteName} > ${name}`, pass: true, detail: "ok" });
  } catch (e) {
    results.push({ name: `${suiteName} > ${name}`, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}
function assert(c, m) {
  if (!c) throw new Error(m);
}
function assertEqual(a, e, m) {
  if (a !== e) throw new Error(`${m} (expected=${String(e)}, actual=${String(a)})`);
}
var ASPECT = 16 / 9;
function px(x, y, v = 1) {
  return { x: x / ASPECT, y, z: 0, visibility: v };
}
function poseForKneeAngle(angleDeg, kneeVisibility = 1) {
  const hip = px(0, 0);
  const knee = px(0, 1, kneeVisibility);
  const rad = angleDeg * Math.PI / 180;
  const ankle = px(Math.sin(rad), 1 - Math.cos(rad));
  const arr = [];
  for (let i = 0; i < 33; i += 1) arr.push(px(0.5, 0.5));
  arr[23] = hip;
  arr[25] = knee;
  arr[27] = ankle;
  return arr;
}
suite("T2.6 \u5F15\u64CE\u7AEF\u5230\u7AEF\u96C6\u6210");
test("\u5B8C\u6574\u6DF1\u8E72 \u2192 \u8BA1\u6570 1 + \u8BC4\u5206\u5728 [0,100] + \u6C47\u603B\u6B63\u786E", () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  const re = new RuleEngine(squatConfig, gate);
  const sc = new ScoringEngine(squatConfig.scoring);
  const repRecords = [];
  let currentRepViolations = [];
  let lastRepEnd = 0;
  let t = 0;
  const feed = (angle, isBottom = false) => {
    t += 200;
    const lms = smoother.smooth(poseForKneeAngle(angle));
    const state = rc.update(lms, t);
    const phase = isBottom ? "bottom" : state.phase;
    const violations = re.evaluate(lms, phase, t);
    for (const v of violations) {
      if (!currentRepViolations.some((x) => x.ruleId === v.ruleId)) currentRepViolations.push(v);
    }
    if (state.repJustCompleted) {
      const score = sc.scoreRep(currentRepViolations);
      repRecords.push({ score, pass: score >= PASS_SCORE });
      currentRepViolations = [];
      lastRepEnd = t;
    }
  };
  feed(180);
  feed(140);
  feed(85, true);
  feed(140);
  feed(180);
  assertEqual(rc.getCount(), 1, "\u5E94\u8BA1 1 \u6B21");
  assertEqual(repRecords.length, 1, "\u5E94\u8BB0\u5F55 1 \u4E2A rep");
  assert(repRecords[0].score >= 0 && repRecords[0].score <= 100, "\u8BC4\u5206\u5E94\u5728 0-100");
  assertEqual(repRecords[0].pass, repRecords[0].score >= PASS_SCORE, "pass \u6807\u5FD7\u4E0E\u5206\u6570\u7EBF\u4E00\u81F4");
  assert(lastRepEnd > 0, "\u5E94\u8BB0\u5F55 rep \u7ED3\u675F\u65F6\u95F4");
});
test("\u4E0B\u8E72\u6DF1\u5EA6\u4E0D\u8DB3\uFF08\u672A\u8FBE bottom \u533A\u95F4\uFF09\u2192 \u4E0D\u8BA1\u6570\uFF08\u9632\u6296\u6B63\u786E\uFF09", () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  let t = 0;
  const seq = [180, 150, 130, 150, 180];
  for (const angle of seq) {
    t += 200;
    rc.update(smoother.smooth(poseForKneeAngle(angle)), t);
  }
  assertEqual(rc.getCount(), 0, "\u672A\u8FBE bottom \u533A\u95F4\u4E0D\u5E94\u8BA1\u6570\uFF08\u9632\u6296\uFF09");
});
test("\u5230\u8FBE bottom \u4E14\u819D\u89D2\u8FC7\u6DF1(50\xB0) \u2192 \u8BA1\u6570 + \u89E6\u53D1\u8FDD\u89C4\u6263\u5206", () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  const re = new RuleEngine(squatConfig, gate);
  const sc = new ScoringEngine(squatConfig.scoring);
  let t = 0;
  let violationsAtBottom = [];
  let currentRepViolations = [];
  let score = 100;
  const seq = [[180, false], [150, false], [50, true], [150, false], [180, false]];
  for (const [angle, bottom] of seq) {
    t += 200;
    const lms = smoother.smooth(poseForKneeAngle(angle));
    const st = rc.update(lms, t);
    const v = re.evaluate(lms, bottom ? "bottom" : st.phase, t);
    if (bottom) violationsAtBottom = v;
    for (const x of v) {
      if (!currentRepViolations.some((y) => y.ruleId === x.ruleId)) currentRepViolations.push(x);
    }
    if (st.repJustCompleted) {
      score = sc.scoreRep(currentRepViolations);
      currentRepViolations = [];
    }
  }
  assertEqual(rc.getCount(), 1, "\u5230\u8FBE bottom \u533A\u95F4\u5E94\u8BA1\u6570 1");
  assert(violationsAtBottom.some((v) => v.ruleId === "knee-depth"), "\u819D\u89D2 50\xB0 \u5E94\u89E6\u53D1 knee-depth");
  const kd = violationsAtBottom.find((v) => v.ruleId === "knee-depth");
  assertEqual(kd.message, "\u8E72\u5F97\u592A\u4F4E\u4E86\uFF0C\u6CE8\u610F\u819D\u76D6", "\u5E94\u7ED9\u51FA\u300C\u8E72\u592A\u4F4E\u300D\u6587\u6848");
  assert(score < 100, `\u8FDD\u89C4\u5E94\u6263\u5206 (score=${score})`);
});
test("\u4F4E\u53EF\u89C1\u5EA6\u6574\u6BB5 \u2192 \u95E8\u63A7\u8DF3\u8FC7\uFF0C\u4E0D\u8BA1\u6570\u4E0D\u8FDD\u89C4", () => {
  const smoother = new LandmarkSmoother(1);
  const gate = new ConfidenceGate();
  const rc = new RepCounter(squatConfig.repCounter, gate);
  const re = new RuleEngine(squatConfig, gate);
  let t = 0;
  let anyViolation = false;
  for (const angle of [180, 140, 85, 140, 180]) {
    t += 200;
    const lms = smoother.smooth(poseForKneeAngle(angle, 0.2));
    rc.update(lms, t);
    if (re.evaluate(lms, "bottom", t).length > 0) anyViolation = true;
  }
  assertEqual(anyViolation, false, "\u4F4E\u53EF\u89C1\u5EA6\u4E0D\u5E94\u4EA7\u751F\u8FDD\u89C4");
  assertEqual(rc.getCount(), 0, "\u4F4E\u53EF\u89C1\u5EA6\u4E0D\u5E94\u8BA1\u6570");
});
test("\u5E73\u6ED1\u5668\u6709\u6548\u6291\u5236\u6296\u52A8\uFF08\u8F93\u51FA\u4ECB\u4E8E\u524D\u540E\u5E27\u4E4B\u95F4\uFF09", () => {
  const smoother = new LandmarkSmoother(0.4);
  const flat = [];
  for (let i = 0; i < 33; i += 1) flat.push(px(0.5, 0.5));
  smoother.smooth(flat);
  const jumped = [];
  for (let i = 0; i < 33; i += 1) jumped.push(px(0.9, 0.9));
  const out = smoother.smooth(jumped);
  assert(out[5].y > 0.5 && out[5].y < 0.9, `\u5E73\u6ED1\u8F93\u51FA\u5E94\u4ECB\u4E8E 0.5~0.9\uFF0C\u5B9E\u5F97 ${out[5].y}`);
});
test("\u89D2\u5EA6\u8BA1\u7B97\u95ED\u73AF\uFF1A\u7531\u59FF\u6001\u53CD\u7B97\u89D2\u5EA6\u2248\u76EE\u6807\u503C", () => {
  for (const target of [90, 120, 160, 45]) {
    const lms = poseForKneeAngle(target);
    const got = calcJointAngle(lms, { a: 23, b: 25, c: 27 });
    assert(Math.abs(got - target) <= 2, `\u76EE\u6807 ${target}\xB0\uFF0C\u5B9E\u5F97 ${got}\xB0`);
  }
});
var passed = results.filter((r) => r.pass).length;
var failed = results.filter((r) => !r.pass).length;
console.log("\n========== \u96C6\u6210\u6D4B\u8BD5\u7ED3\u679C ==========");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  if (!r.pass) console.log(`      \u2514\u2500 ${r.detail}`);
}
console.log(`\u96C6\u6210\u603B\u8BA1: ${results.length} | \u901A\u8FC7: ${passed} | \u5931\u8D25: ${failed}`);
console.log("=================================\n");
if (failed > 0) process.exitCode = 1;
