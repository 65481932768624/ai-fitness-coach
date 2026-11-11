/**
 * HomePage —— 首页。
 *
 * v7（当前）：按用户给的三张示意图「照搬」。
 * 1. Hero 直接就是示意图里那张草地实拍——骨架、127°、置信度都是照片自带的，
 *    只把烤在像素里的标题擦掉，换成分辨率更高的真文字；照片顶到窗口最上沿，
 *    所以顶栏在这个页面是浮在照片上的（Layout overlayHeader）。
 * 2. 压暗只做「文字背后一团柔和暗角」，照片本身不调色——这是和示意图一致的关键。
 * 3. 三格数据条咬在照片下沿，末格青柠；往下是动作库、能力（左图右文）、
 *    数据报告白卡、深色收尾卡。
 */

import { ArrowRight, ArrowUpRight, ChevronRight, Play, ScanLine, ShieldCheck, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExerciseCard } from '../components/ExerciseCard';
import { Layout } from '../components/Layout';
import { media } from '../constants/config';
import { EXERCISE_LIST } from '../exercises';
import { trainingStore } from '../store/trainingStore';
import type { ExerciseConfig } from '../types/exercise';
import { formatDateTime, formatDuration, formatPercent } from '../utils/format';

const CAPABILITIES = [
  {
    icon: ScanLine,
    title: '实时姿态识别',
    desc: '浏览器内完成推理，逐帧跟踪 33 个关键点，不打点、不穿戴设备。',
  },
  {
    icon: Volume2,
    title: '动作角度评估',
    desc: '把膝角、髋角、躯干前倾换算成具体度数，偏离标准就判定出来。',
  },
  {
    icon: ShieldCheck,
    title: '训练强度反馈',
    desc: '画面不出本机，训练记录只写进本地存储，随时可以复核。',
  },
];

const HERO_CHIPS = ['33 关键点', '角度判定', '语音纠正', '本地计算'];

const STATS = [
  { value: '33', unit: '个', label: '身体关键点' },
  { value: '30', unit: 'fps', label: '每秒判定次数' },
  { value: '0', unit: 'KB', label: '上传到云端' },
];

export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const latest = trainingStore.getLatestSession();

  const handleSelect = (exercise: ExerciseConfig): void => {
    if (exercise.supported) {
      navigate(`/training/${exercise.id}`);
    }
  };

  const quality = latest
    ? latest.mode === 'hold'
      ? (latest.passRate ?? 0)
      : Math.round((latest.passReps / Math.max(latest.totalReps, 1)) * 100)
    : 0;

  return (
    <Layout overlayHeader>
      {/* ---------------- Hero：就是示意图那一张 ----------------
          底图 = 用户稿里的草地实拍（图上原有的骨架 / 127° / 置信度原样保留），
          只把烤在像素里的标题擦掉，换成真文字，所以这屏跟稿子基本逐像素一致。 */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-deep">
        <img
          src={media('hero-field.jpg')}
          alt="训练者在草地上做拉伸，画面右侧是实时读取的关节角度"
          className="absolute inset-0 hidden h-full w-full object-cover object-[56%_32%] md:block"
          fetchPriority="high"
          decoding="sync"
        />
        <img
          src={media('hero-gym-tall.jpg')}
          alt="训练者在健身房跑步"
          className="absolute inset-0 block h-full w-full object-cover object-[58%_36%] md:hidden"
          fetchPriority="high"
          decoding="sync"
        />

        {/* 只为了白字能读：左浅右无，照片本身不做任何调色 */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(64%_46%_at_12%_36%,rgba(6,14,16,.42)_0%,rgba(6,14,16,.22)_46%,rgba(6,14,16,0)_78%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(6,14,16,.22)_0%,rgba(6,14,16,.06)_58%,rgba(6,14,16,0)_100%)]" />

        <div className="relative mx-auto flex w-full max-w-[1180px] flex-col justify-center px-5 pb-24 pt-32 sm:px-8 sm:pb-28 sm:pt-36 md:min-h-[690px] md:py-28 lg:min-h-[740px]">
          <div className="max-w-[540px]">
            <h1 className="text-[clamp(34px,4.8vw,68px)] font-medium leading-[1.2] tracking-[.01em] text-white [text-shadow:0_2px_34px_rgba(4,10,12,.62),0_1px_4px_rgba(4,10,12,.3)]">
              让每一次动作
              <br />
              都做对。
            </h1>

            <p className="mt-6 text-[13px] font-light tracking-[.02em] text-white/80 [text-shadow:0_1px_14px_rgba(6,14,16,.4)] sm:text-[15px]">
              AI 动作识别 · 实时动态分析 · 个性化训练指导
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/exercises')}
                className="group inline-flex items-center gap-2.5 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[13.5px] font-medium text-deep transition hover:bg-white/90 active:scale-[.985]"
              >
                开始训练
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-deep text-lime transition-transform duration-300 group-hover:rotate-45">
                  <ArrowRight size={15} strokeWidth={2.2} />
                </span>
              </button>

              {latest ? (
                <button
                  type="button"
                  onClick={() => navigate('/result', { state: latest })}
                  className="btn-glass"
                >
                  上次成绩 · {latest.avgScore} 分
                </button>
              ) : (
                <a href="#how" className="btn-glass">
                  <Play size={12} />
                  它是怎么判断的
                </a>
              )}
            </div>

            <div className="mt-8 flex w-fit max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 backdrop-blur-md">
              {HERO_CHIPS.map((chip, index) => (
                <span key={chip} className="flex items-center gap-3">
                  {index > 0 && <span className="h-3 w-px bg-white/25" />}
                  <span className="whitespace-nowrap text-[10.5px] text-white/85">{chip}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 数据条（紧贴 Hero 下沿，末格青柠） ---------------- */}
      <section className="relative z-10 -mt-9 px-1 sm:-mt-12 sm:px-0">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {STATS.map((s, index) => {
            const accent = index === STATS.length - 1;
            return (
              <div
                key={s.label}
                tabIndex={0}
                className={`stat-card rounded-[16px] px-4 py-4 sm:px-7 sm:py-5 ${
                  accent ? 'bg-lime' : 'bg-paper-pure shadow-[0_18px_40px_-28px_rgba(11,21,23,.45)]'
                }`}
              >
                <p
                  className={`num flex items-baseline gap-1 text-[28px] font-semibold leading-none tracking-tight sm:text-[38px] ${
                    accent ? 'text-deep' : 'text-ink-900'
                  }`}
                >
                  {s.value}
                  <span
                    className={`text-[10.5px] font-normal sm:text-[12px] ${
                      accent ? 'text-deep/55' : 'text-ink-400'
                    }`}
                  >
                    {s.unit}
                  </span>
                </p>
                <p
                  className={`mt-2.5 text-[10px] tracking-wide sm:text-[11.5px] ${
                    accent ? 'text-deep/70' : 'text-ink-400'
                  }`}
                >
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- 现在能练什么 ---------------- */}
      <section className="mt-20 sm:mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">动作库</p>
            <h2 className="display mt-4 text-[26px] leading-tight sm:text-[34px]">现在能练什么</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/exercises')}
            className="group hidden items-center gap-1 text-[12.5px] text-ink-500 transition-colors hover:text-ink-900 sm:inline-flex"
          >
            全部动作
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {EXERCISE_LIST.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onSelect={handleSelect} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/exercises')}
          className="btn-ghost mt-5 w-full sm:hidden"
        >
          查看全部动作
          <ChevronRight size={15} />
        </button>
      </section>

      {/* ---------------- 能力（左实拍 / 右三条） ---------------- */}
      <section className="mt-16 sm:mt-20">
        <div className="grid gap-3 lg:grid-cols-[.88fr_1.12fr]">
          {/* 实拍：同一张草地稿的局部特写（小腿 + 鞋），与 Hero 不重复 */}
          <div
            role="img"
            aria-label="训练者的脚踝与鞋被实时标注"
            className="relative aspect-[4/3] w-full overflow-hidden rounded-panel border border-line bg-deep bg-cover bg-center lg:aspect-auto lg:h-full lg:min-h-[280px]"
            style={{ backgroundImage: `url(${media('pose-detail.jpg')})` }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,16,18,.32)_0%,rgba(7,16,18,0)_34%,rgba(7,16,18,.14)_100%)]" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 backdrop-blur-md">
              <span className="h-1 w-1 animate-breathe rounded-full bg-lime" />
              <span className="text-[10px] tracking-wide text-white/85">实时姿态识别 · 33 关键点</span>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-panel border border-line bg-paper-pure px-6 sm:px-9">
            {CAPABILITIES.map((f, index) => (
              <div
                key={f.title}
                className={`flex items-start gap-4 py-6 ${index > 0 ? 'border-t border-line-soft' : ''}`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F3EC] text-ink-800">
                  <f.icon size={17} strokeWidth={1.9} />
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold tracking-tight text-ink-900">{f.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-[1.8] text-ink-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 数据报告（示意图里那张白卡） ---------------- */}
      <section id="how" className="mt-16 scroll-mt-24 sm:mt-20">
        <div className="rounded-block border border-line bg-paper-pure px-6 py-14 text-center sm:px-14 sm:py-16">
          <p className="eyebrow justify-center">数据报告</p>
          <h2 className="display mx-auto mt-6 max-w-[620px] text-[22px] leading-[1.45] sm:text-[32px]">
            AI 健身教练，把看不见的动作
            <br className="hidden sm:block" />
            变成可追踪的数据
          </h2>
          <p className="lede mx-auto mt-6 max-w-[500px] text-[13.5px] sm:text-[15px]">
            从标准到错误，系统都会给出明确的纠正建议。
            每一次练习都有当下的反馈——练得对不对，不需要猜。
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            <span className="rotate-[-1.5deg] rounded-full border border-line bg-paper-soft px-5 py-2.5 text-[13px] text-ink-700">
              实时姿态识别
            </span>
            <span className="rotate-[1.5deg] rounded-full border border-line bg-paper-pure px-5 py-2.5 text-[13px] text-ink-700 shadow-soft">
              动作角度评估
            </span>
            <span className="rotate-[-1deg] rounded-full bg-lime px-5 py-2.5 text-[13px] font-medium text-deep shadow-[0_14px_30px_-18px_rgba(169,217,63,.9)]">
              语音即时纠正
            </span>
          </div>
        </div>
      </section>

      {/* ---------------- 收尾：完成度 / 开始 ---------------- */}
      <section className="mt-6 sm:mt-8">
        {latest ? (
          <div className="card-deep grain top-sheen px-6 py-8 sm:px-10 sm:py-9">
            <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,rgba(95,227,216,.10),transparent_60%)]" />
            <div className="relative">
              <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="eyebrow-onDark">上次训练 · {latest.exerciseName}</p>
                  <div className="mt-4 flex items-baseline gap-2.5">
                    <span className="text-[15px] text-white/65">完成度</span>
                    <span className="num text-[50px] font-semibold leading-none tracking-tight text-lime sm:text-[58px]">
                      {latest.avgScore}
                    </span>
                    <span className="text-[20px] font-medium text-lime/80">%</span>
                  </div>
                  <p className="mt-3 text-[11.5px] text-white/40">
                    {formatDateTime(latest.startedAt)} · {formatDuration(latest.durationMs)}
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:w-[300px] lg:grid-cols-1">
                  <div className="flex items-center justify-between rounded-2xl border border-white/[.10] bg-white/[.06] px-4 py-3 backdrop-blur-md">
                    <div>
                      <p className="text-[9.5px] uppercase tracking-[.16em] text-white/40">动作质量</p>
                      <p className="num mt-1 text-[17px] font-medium text-white">{quality}%</p>
                    </div>
                    <ArrowUpRight size={15} className="text-lime/70" />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/[.10] bg-white/[.06] px-4 py-3 backdrop-blur-md">
                    <div>
                      <p className="text-[9.5px] uppercase tracking-[.16em] text-white/40">
                        {latest.mode === 'hold' ? '达标时长' : '达标次数'}
                      </p>
                      <p className="num mt-1 text-[17px] font-medium text-white">
                        {latest.mode === 'hold'
                          ? formatPercent(latest.passRate ?? 0)
                          : `${latest.passReps}/${latest.totalReps}`}
                      </p>
                    </div>
                    <ArrowRight size={15} className="text-lime/70" />
                  </div>
                </div>
              </div>

              {/* 进度条：轨道上的青柠段 + 两端时间 */}
              <div className="mt-7 flex items-center gap-3">
                <span className="num text-[10px] text-white/30">00:00</span>
                <div className="relative h-[3px] flex-1 rounded-full bg-white/[.10]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-aqua/70 to-lime"
                    style={{ width: `${Math.max(6, Math.min(100, quality))}%` }}
                  />
                  <span
                    className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_0_3px_rgba(201,242,107,.18)]"
                    style={{ left: `calc(${Math.max(6, Math.min(100, quality))}% - 4px)` }}
                  />
                </div>
                <span className="num text-[10px] text-white/30">{formatDuration(latest.durationMs)}</span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/result', { state: latest })}
                  className="btn-lime px-5 py-2.5 text-[13px]"
                >
                  看完整小结
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/exercises')}
                  className="btn-glass px-4 py-2.5 text-[13px]"
                >
                  再练一次
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-deep grain top-sheen px-6 py-14 text-center sm:px-10 sm:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,rgba(95,227,216,.12),transparent_62%)]" />
            <div className="relative">
              <p className="eyebrow-onDark justify-center">无需准备</p>
              <h2 className="display-onDark mx-auto mt-5 max-w-[420px] text-[24px] leading-[1.4] sm:text-[32px]">
                不用预约，不用器械
                <br />
                打开摄像头就能练
              </h2>
              <button
                type="button"
                onClick={() => navigate('/exercises')}
                className="btn-lime mt-8 px-6 py-3"
              >
                开始训练
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}

export default HomePage;
