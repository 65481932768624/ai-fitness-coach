/**
 * App —— 路由表。
 *
 * 路由：
 * - `/`                    首页
 * - `/exercises`           动作选择
 * - `/training/:exerciseId` 实时训练
 * - `/result`              成绩页
 * - `*`                    兜底重定向首页
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { ActionSelectPage } from './pages/ActionSelectPage';
import { HomePage } from './pages/HomePage';
import { LiveTrainingPage } from './pages/LiveTrainingPage';
import { ResultPage } from './pages/ResultPage';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/exercises" element={<ActionSelectPage />} />
      <Route path="/training/:exerciseId" element={<LiveTrainingPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
