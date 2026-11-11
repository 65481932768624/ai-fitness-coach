/**
 * ResultPage —— 成绩页。
 *
 * v4：主卡直接照参考稿的"完成度卡"来做——深墨绿底、青柠大数字、
 * 右侧两枚玻璃数据块、底部一条带青柠段的进度条。
 * 往下回到纸白：四项指标用分隔线分栏（不是四张卡），问题清单回归列表。
 */

import { ArrowRight, Home, RotateCcw, TrendingUp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { trainingStore } from '../store/trainingStore';
import type { SessionSummary } from '../types/training';
import { formatDateTime, formatDuration, formatPercent } from '../utils/format';

/** 从 location.state 或最近记录解析 summary */
function resolveSummary(state: unknown): SessionSummary | null {
  if (state && typeof state === 'object' && 'sessionId' in (state as Record<string, unknown>)) {
    return state as SessionSummary;
  }
  return trainingStore.getLatestSession();
}

export function ResultPage(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const summary = resolveSummary(location.state);

  if (!summary) {
    return (
      <Layout>
        <div className="mx-auto mt-16 max-w-md rounded-panel border border-line bg-paper-pure p-10 text-center">
          <h1 className="display text-[22px]">还没有训练记录</h1>
          <p className="mt-2.5 text-[13px] text-ink-500">先完成一次训练，这里就会有成绩。</p>
          <button type="button" className="btn-dark mt-7" onClick={() => navigate('/exercises')}>
            去选动作
          </button>
        </div>
      </Layout>
    );
  }

  const isHold = summary.mode === 'hold';
  const quality = isHold
    ? (summary.passRate ?? 0)
    : Math.round((summary.passReps / Math.max(summary.totalReps, 1)) * 100);

  const stats = [
    {
      label: isHold ? '保持时长' : '完成次数',
      value: isHold ? formatDuration(summary.holdDurationMs ?? 0) : `${summary.totalReps}`,
      unit: isHold ? '' : '次',
    },
    {
      label: isHold ? '达标率' : '达标次数',
      value: isHold ? formatPercent(summary.passRate ?? 0) : `${summary.passReps}`,
      unit: isHold ? '' : `/${summary.totalReps}`,
    },
    { label: '训练时长', value: formatDuration(summary.durationMs), unit: '' },
    { label: '完成时间', value: formatDateTime(summary.startedAt), unit: '' },
  ];

  const verdict =
    summary.avgScore >= 85
      ? '动作非常标准，继续按这个幅度练。'
      : summary.avgScore >= 70
        ? '整体不错，下面这几处再收一收就更稳了。'
        : '先别追速度：把幅度和角度做对，分数会跟着上来。';

  return (
    <Layout>
      <div className="mx-auto max-w-[920px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">训练小结</p>
            <h1 className="display mt-4 text-[26px] leading-tight sm:text-[32px]">
              {summary.exerciseName}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-pure px-3 py-1.5 text-[11px] text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-deep" />
            已完成 · {isHold ? '静态保持' : '计次'}
          </span>
        </div>

        {/* 完成度卡 */}
        <section className="card-deep grain top-sheen mt-6 px-6 py-8 sm:px-10 sm:py-9">
          <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,rgba(95,227,216,.10),transparent_60%)]" />
          <div className="relative">
            <div className="grid gap-7 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[15px] text-white/65">完成度</span>
                  <span className="num text-[52px] font-semibold leading-none tracking-tight text-lime sm:text-[62px]">
                    {summary.avgScore}
                  </span>
                  <span className="text-[20px] font-medium text-lime/80">%</span>
                </div>
                <p className="mt-4 max-w-[380px] text-[13px] leading-[1.8] text-white/60">
                  {verdict}
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                <div className="flex items-center justify-between rounded-2xl border border-white/[.10] bg-white/[.06] px-4 py-3 backdrop-blur-md">
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[.16em] text-white/40">动作质量</p>
                    <p className="num mt-1 text-[17px] font-medium text-white">{quality}%</p>
                  </div>
                  <ArrowRight size={15} className="text-lime/70" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/[.10] bg-white/[.06] px-4 py-3 backdrop-blur-md">
                  <div>
                    <p className="text-[9.5px] uppercase tracking-[.16em] text-white/40">
                      {isHold ? '达标时长' : '达标次数'}
                    </p>
                    <p className="num mt-1 text-[17px] font-medium text-white">
                      {isHold
                        ? formatPercent(summary.passRate ?? 0)
                        : `${summary.passReps}/${summary.totalReps}`}
                    </p>
                  </div>
                  <ArrowRight size={15} className="text-lime/70" />
                </div>
              </div>
            </div>

            {/* 进度条 */}
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
              <span className="num text-[10px] text-white/30">
                {formatDuration(summary.durationMs)}
              </span>
            </div>
          </div>
        </section>

        {/* 四项指标：分隔线而不是四张卡 */}
        <section className="mt-4 grid grid-cols-2 overflow-hidden rounded-card border border-line bg-paper-pure sm:grid-cols-4">
          {stats.map((s, index) => (
            <div
              key={s.label}
              className={[
                'border-line-soft px-5 py-5',
                index % 2 === 0 ? 'border-r' : '',
                index < 2 ? 'border-b sm:border-b-0' : '',
                index < 3 ? 'sm:border-r' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <p className="text-[9.5px] uppercase tracking-[.18em] text-ink-400">{s.label}</p>
              <p className="num mt-3 flex items-baseline gap-1 whitespace-nowrap text-[18px] font-semibold tracking-tight text-ink-900 sm:text-[20px]">
                {s.value}
                {s.unit && <span className="text-[11px] font-normal text-ink-400">{s.unit}</span>}
              </p>
            </div>
          ))}
        </section>

        {/* 问题清单 */}
        <section className="mt-4 rounded-panel border border-line bg-paper-pure p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-ink-900">
              <TrendingUp size={14} className="text-lime-deep" strokeWidth={2.2} />
              主要问题
            </h2>
            <span className="text-[10px] uppercase tracking-[.14em] text-ink-400">
              按触发次数排序
            </span>
          </div>

          {summary.topIssues.length === 0 ? (
            <p className="mt-5 rounded-card bg-lime-tint px-5 py-4 text-[12.5px] text-[#5E7A25]">
              本次没有明显问题，动作很标准。
            </p>
          ) : (
            <ul className="mt-3">
              {summary.topIssues.map((issue, index) => (
                <li
                  key={issue.ruleId}
                  className={`flex items-center justify-between py-3.5 ${
                    index > 0 ? 'border-t border-line-soft' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="num flex h-6 w-6 items-center justify-center rounded-full bg-paper-soft text-[10px] text-ink-500">
                      {index + 1}
                    </span>
                    <span className="text-[13px] text-ink-700">{issue.label}</span>
                  </div>
                  <span className="num text-[11.5px] text-ink-400">
                    <span className="text-[13px] font-medium text-ink-900">{issue.count}</span> 次
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="btn-dark px-6"
            onClick={() => navigate(`/training/${summary.exerciseId}`)}
          >
            <RotateCcw size={15} />
            再练一次
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/exercises')}>
            换个动作
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
            <Home size={14} />
            回首页
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ResultPage;
