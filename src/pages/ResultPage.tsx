/**
 * ResultPage —— 成绩页。
 *
 * v2：总分做视觉焦点，四宫格指标收进一张卡（用分隔线而不是四张卡），
 * 问题清单按触发次数排布。
 */

import { Award, Home, RotateCcw, TrendingUp } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ScoreRing } from '../components/ScoreRing';
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
        <div className="card-surface mx-auto max-w-lg p-10 text-center">
          <h1 className="text-xl font-semibold text-white">还没有训练记录</h1>
          <p className="mt-2 text-sm text-white/45">先完成一次训练，这里就会有成绩。</p>
          <button type="button" className="btn-primary mt-6" onClick={() => navigate('/exercises')}>
            去选动作
          </button>
        </div>
      </Layout>
    );
  }

  const isHold = summary.mode === 'hold';
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
      <div className="mx-auto max-w-3xl">
        {/* 总分 */}
        <section className="card-surface relative overflow-hidden p-7 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1 text-[11px] font-medium text-accent-soft">
                <Award size={13} />
                训练完成
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {summary.exerciseName}
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">{verdict}</p>
            </div>
            <ScoreRing score={summary.avgScore} />
          </div>
        </section>

        {/* 四项指标 */}
        <section className="card-surface mt-4 grid grid-cols-2 divide-white/[0.06] sm:grid-cols-4 sm:divide-x">
          {stats.map((s) => (
            <div key={s.label} className="border-b border-white/[0.06] px-5 py-5 last:border-b-0 sm:border-b-0">
              <p className="text-[11px] text-white/35">{s.label}</p>
              <p className="num mt-2 flex items-baseline gap-1 text-2xl font-semibold tracking-tight text-white">
                {s.value}
                {s.unit && <span className="text-xs font-normal text-white/35">{s.unit}</span>}
              </p>
            </div>
          ))}
        </section>

        {/* 问题清单 */}
        <section className="card-surface mt-4 p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
            <TrendingUp size={17} className="text-accent" />
            主要问题
            <span className="text-xs font-normal text-white/30">按触发次数排序</span>
          </h2>

          {summary.topIssues.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-accent/15 bg-accent/[0.05] px-4 py-4 text-sm text-accent-soft">
              本次没有明显问题，动作很标准。
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {summary.topIssues.map((issue, index) => (
                <li
                  key={issue.ruleId}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="num flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10 text-[11px] font-semibold text-amber-300">
                      {index + 1}
                    </span>
                    <span className="text-sm text-white/80">{issue.label}</span>
                  </div>
                  <span className="num text-xs text-white/35">
                    <span className="text-sm font-semibold text-white/80">{issue.count}</span> 次
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/training/${summary.exerciseId}`)}
          >
            <RotateCcw size={18} />
            再练一次
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/exercises')}>
            换个动作
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/')}>
            <Home size={18} />
            回首页
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ResultPage;