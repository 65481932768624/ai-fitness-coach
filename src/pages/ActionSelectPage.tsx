/**
 * ActionSelectPage —— 动作库。
 *
 * v2：加部位筛选（动作变多之后必须能筛），筛选状态只在本地，不写 URL。
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ExerciseCard } from '../components/ExerciseCard';
import { EXERCISE_LIST } from '../exercises';
import type { ExerciseConfig } from '../types/exercise';

type Filter = 'all' | ExerciseConfig['bodyPart'];

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'legs', label: '下肢' },
  { key: 'chest', label: '上肢' },
  { key: 'core', label: '核心' },
];

export function ActionSelectPage(): JSX.Element {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(
    () => (filter === 'all' ? EXERCISE_LIST : EXERCISE_LIST.filter((e) => e.bodyPart === filter)),
    [filter],
  );

  const handleSelect = (exercise: ExerciseConfig): void => {
    if (!exercise.supported) {
      return;
    }
    navigate(`/training/${exercise.id}`);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">动作库</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">选择训练动作</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
            站在摄像头前，保持全身入镜。侧对镜头 45° 通常能拍到最清楚的关节角度。
          </p>
        </div>
        <span className="text-xs text-white/30">
          共 {list.length} 个动作 · {EXERCISE_LIST.filter((e) => e.supported).length} 个可用
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label="按部位筛选">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? 'border-accent/40 bg-accent/10 text-accent-soft'
                  : 'border-white/[0.07] bg-white/[0.03] text-white/45 hover:text-white/80'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} onSelect={handleSelect} />
        ))}
      </div>

      {list.length === 0 && (
        <div className="card-surface mt-8 p-10 text-center text-sm text-white/40">
          这个部位还没有动作，换一个筛选试试。
        </div>
      )}
    </Layout>
  );
}

export default ActionSelectPage;