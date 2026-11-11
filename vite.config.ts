import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 配置。
 *
 * 关键点：
 * - `crossOriginIsolated` 相关 header（COOP/COEP）用于让 MediaPipe WASM
 *   多线程 (SharedArrayBuffer) 可用。若浏览器/环境不支持多线程，MediaPipe
 *   会自动降级为单线程，仍可正常运行。
 * - `optimizeDeps.exclude` 排除 tasks-vision，避免依赖预打包破坏 WASM 资源路径。
 */
export default defineConfig({
  // 部署到 GitHub Pages 项目页时用 `VITE_BASE=/<repo>/` 指定子路径；
  // 自定义域名 / 用户主页仓库（<user>.github.io）保持默认 '/' 即可。
  base:
    (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env
      ?.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    host: true,
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
  },
});
