/**
 * HomePage —— 首页。
 *
 * v2：首屏改为「价值主张 + 姿态演示图」，卖点卡带色调区分，
 * 动作预览复用 ExerciseCard，最近成绩卡更强调数字。
 */

import { ArrowRight, ChevronRight, ScanLine, ShieldCheck, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExerciseCard } from '../components/ExerciseCard';
import { Layout } from '../components/Layout';
import { PoseIllustration } from '../components/PoseIllustration';
import { EXERCISE_LIST } from '../exercises';
import type { ExerciseConfig } from '../types/exercise';
import { trainingStore } from '../store/trainingStore';
import { formatDateTime, formatPercent } from '../utils/format';

const FEATURES = [
  {
    icon: ScanLine,
    title: '实时骨架识别',
    desc: '浏览器内 WASM 推理，逐帧跟踪 33 个关键点，不打点、不穿戴。',
    tile: 'bg-accent/12 text-accent',
  },
  {
    icon: Volume2,
    title: '语音即时纠正',
    desc: '角度一偏离标准就播报，同一句 3 秒内不重复，不吵人。',
    tile: 'bg-sky-400/12 text-sky-300',
  },
  {
    icon: ShieldCheck,
    title: '画面不出本机',
    desc: '所有计算在设备上完成，训练记录只写进本地浏览器。',
    tile: 'bg-amber-400/12 text-amber-300',
  },
];

const STATS = [
  { value: '33', label: '身体关键点' },
  { value: '30', label: '每秒分析帧数' },
  { value: '0', label: '画面上传' },
];

export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const latest = trainingStore.getLatestSession();

  const handleSelect = (exercise: ExerciseConfig): void => {
    if (exercise.supported) {
      navigate(`/training/${exercise.id}`);
    }
  };

  return (
    <Layout>
      {/* 首屏 */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-base-900/50 px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-sky-400/10 blur-[110px]" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-[11px] font-medium tracking-wide text-accent-soft">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              打开即用 · 无需注册
            </span>

            <h1 className="text-balance mt-5 text-[2.6rem] font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
              让每一次动作
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-accent-soft via-accent to-accent-deep bg-clip-text text-transparent">
                都做对
              </span>
              <span className="text-white/90">。</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/50">
              站在摄像头前，AI 实时读取你的关节角度。蹲得不够深、腰塌了、膝盖内扣——
              它会在你偏离标准的那一刻出声道，像私教站在旁边。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" onClick={() => navigate('/exercises')}>
                开始训练
                <ArrowRight size={18} />
              </button>
              {latest ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => navigate('/result', { state: latest })}
                >
                  查看上次成绩
                </button>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => navigate('/exercises')}>
                  看看能练什么
                </button>
              )}
            </div>

            <dl className="mt-10 flex items-center gap-6 sm:gap-10">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="num text-2xl font-semibold tracking-tight text-white">
                    {s.value}
                  </dd>
                  <span className="mt-1 text-[11px] tracking-wide text-white/35">{s.label}</span>
                </div>
              ))}
            </dl>
          </div>

          <div className="hidden justify-center lg:flex">
            <PoseIllustration />
          </div>
        </div>
      </section>

      {/* 三个卖点 */}
      <section aria-label="产品能力" className="mt-14 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card-surface card-hover p-6">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${f.tile}`}
            >
              <f.icon size={20} />
            </span>
            <h3 className="mt-5 text-[15px] font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/45">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* 动作预览 */}
      <section aria-label="支持的动作" className="mt-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">动作库</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">现在能练什么</h2>
          </div>
          <button
            type="button"
            className="group inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-soft"
            onClick={() => navigate('/exercises')}
          >
            全部动作
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {EXERCISE_LIST.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onSelect={handleSelect} />
          ))}
        </div>
      </section>

      {/* 最近一次 */}
      {latest && (
        <section aria-label="最近一次训练" className="mt-16">
          <p className="eyebrow">训练记录</p>
          <div className="card-surface mt-3 flex flex-wrap items-center justify-between gap-6 p-6">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-2xl font-semibold text-white">
                {latest.avgScore}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-white">{latest.exerciseName}</p>
                <p className="mt-1 text-xs text-white/35">
                  {formatDateTime(latest.startedAt)} ·{' '}
                  {latest.mode === 'hold' ? '静态保持' : `${latest.totalReps} 次`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden text-right sm:block">
                <p className="text-[11px] text-white/35">
                  {latest.mode === 'hold' ? '达标率' : '达标次数'}
                </p>
                <p className="num mt-1 text-lg font-semibold text-accent-soft">
                  {latest.mode === 'hold'
                    ? formatPercent(latest.passRate ?? 0)
                    : `${latest.passReps}/${latest.totalReps}`}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost !px-4 !py-2.5 text-sm"
                onClick={() => navigate('/result', { state: latest })}
              >
                看详情
              </button>
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

export default HomePage;