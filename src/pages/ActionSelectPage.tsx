/**
 * ActionSelectPage —— 动作库。
 *
 * v4：按参考稿做成"一张干净的目录页"：居中大标题 + 一行说明，
 * 筛选是白底胶囊、选中反色成墨绿；卡片网格只留发丝线与极浅投影，
 * 标题上方那个青色小标签是这一页唯一的装饰。
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
      <div className="mx-auto max-w-[860px] pt-6 text-center sm:pt-10">
        <p className="eyebrow justify-center">动作库</p>
        <h1 className="display mt-6 text-[34px] leading-[1.15] sm:text-[48px]">选择训练动作</h1>
        <p className="mx-auto mt-5 max-w-[560px] text-[13.5px] leading-[1.85] text-ink-500 sm:text-[14.5px]">
          站在镜头前，保持全身入镜。相对镜头 45° 最能拍摄到清晰的关节角度。
        </p>
      </div>

      <div className="mt-11 flex flex-col items-center gap-4 border-b border-line pb-5 sm:flex-row sm:justify-between">
        <div
          className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0"
          role="tablist"
          aria-label="按部位筛选"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`tab-pill shrink-0 ${active ? 'tab-pill-active' : ''}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <span className="text-[11.5px] text-ink-400">
          共 {list.length} 个动作 · {EXERCISE_LIST.filter((e) => e.supported).length} 个可用
        </span>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} onSelect={handleSelect} />
        ))}
      </div>

      {list.length === 0 && (
        <div className="mt-7 rounded-card border border-line-soft bg-paper-soft py-16 text-center text-[13px] text-ink-400">
          这个部位还没有动作，换一个筛选试试。
        </div>
      )}

      <div className="mx-auto mt-14 flex max-w-[520px] items-start gap-3 rounded-card border border-line-soft bg-paper-soft px-5 py-4">
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime-deep" />
        <p className="text-[11.5px] leading-[1.9] text-ink-400">
          镜头高度与胸口齐平，距离 2–3 米，背景尽量干净，姿态识别的稳定性会明显提升。
          所有检测与判断逻辑都在本机完成，不上传任何视频。
        </p>
      </div>
    </Layout>
  );
}

export default ActionSelectPage;
