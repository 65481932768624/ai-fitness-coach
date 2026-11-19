/**
 * CoachingManager —— 周期性动作要领播报。
 *
 * 独立于违规反馈：即使姿势正确，也按间隔轮换播报沉肩、挺胸、核心、
 * 器材摆放、握距和呼吸。与错误反馈共享播放通道，错误优先、不打断当前语句。
 */

export interface CoachingTickResult {
  text: string;
  kind: 'coaching';
  cueIndex: number;
}

export class CoachingManager {
  private cueIndex = 0;
  private nextCueAtMs = 0;
  private introSpoken = false;

  constructor(
    private readonly intervalMs = 12000,
    private readonly pauseAfterErrorMs = 6000,
  ) {}

  /** 开始训练时播报准备提示，并启动周期计时 */
  start(now: number): string {
    this.cueIndex = 0;
    this.introSpoken = true;
    this.nextCueAtMs = now + this.intervalMs;
    return '准备开始';
  }

  /**
   * 取当前应该播报的要领。
   * @param now 当前时刻
   * @param cues 动作配置的要领列表
   * @param lastErrorAtMs 最近一次纠错播报时刻
   */
  tick(now: number, cues: string[], lastErrorAtMs: number): CoachingTickResult | null {
    if (!this.introSpoken || cues.length === 0 || now < this.nextCueAtMs) {
      return null;
    }
    if (now - lastErrorAtMs < this.pauseAfterErrorMs) {
      // 延后而不是直接吞掉，确保纠错后仍有要领播报
      this.nextCueAtMs = now + this.pauseAfterErrorMs;
      return null;
    }
    const cueIndex = this.cueIndex % cues.length;
    const text = cues[cueIndex];
    this.cueIndex = (cueIndex + 1) % cues.length;
    this.nextCueAtMs = now + this.intervalMs;
    return { text: `动作要领：${text}`, kind: 'coaching', cueIndex };
  }

  /** 暂停时停止推进周期 */
  pause(): void {
    this.introSpoken = false;
  }

  /** 恢复时重新计时 */
  resume(now: number): void {
    this.introSpoken = true;
    this.nextCueAtMs = now + this.intervalMs;
  }

  reset(): void {
    this.cueIndex = 0;
    this.nextCueAtMs = 0;
    this.introSpoken = false;
  }
}
