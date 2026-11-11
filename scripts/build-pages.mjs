/**
 * GitHub Pages 构建脚本。
 *
 * 为什么要单独一个脚本：Windows 的 Git Bash 会把命令行里的 `/ai-fitness-coach/`
 * 当成路径改写成 `C:/Program Files/Git/...`，所以不能在 shell 里直接
 * `VITE_BASE=/ai-fitness-coach/ npm run build`。这里在 Node 进程内设置，
 * 不经过 shell，路径不会被改写。
 *
 * 用法：
 *   node scripts/build-pages.mjs            # 默认仓库名 ai-fitness-coach
 *   node scripts/build-pages.mjs my-repo    # 自定义仓库名
 *   PAGES_BASE=/ node scripts/build-pages.mjs   # 用户主页仓库 / 自定义域名
 */

import { build } from 'vite';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repo = process.argv[2] ?? 'ai-fitness-coach';
const base = process.env.PAGES_BASE ?? `/${repo}/`;

process.env.VITE_BASE = base;

console.log(`[build-pages] base = ${base}`);
await build({ logLevel: 'warn' });

// GitHub Pages 无法配置 SPA 回退：把 index.html 复制成 404.html，
// 直接访问 /training/squat 这类深链时由前端路由接管。
const dist = path.resolve('dist');
await cp(path.join(dist, 'index.html'), path.join(dist, '404.html'));
// 关闭 Jekyll，避免下划线开头的文件被忽略
await writeFile(path.join(dist, '.nojekyll'), '');

console.log('[build-pages] dist 已生成 404.html 与 .nojekyll');
console.log(`[build-pages] 预览：http://localhost:4173${base}`);