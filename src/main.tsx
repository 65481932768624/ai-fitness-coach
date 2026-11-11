import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// 部署在子路径（GitHub Pages 项目页）时，路由必须带上同一前缀，
// 否则 /ai-fitness-coach/ 下的链接会被当成根路径跳走。
const baseUrl = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const basename = baseUrl.replace(/\/$/, '') || '/';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('未找到 #root 挂载节点，请检查 index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
