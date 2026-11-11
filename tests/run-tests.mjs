/**
 * 测试运行器：用 esbuild 将 TS 测试打包为 CJS，再由 node 执行。
 * 这样无需安装 vitest/jest，直接真实执行源码逻辑。
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const entry = path.resolve(process.cwd(), 'tests/engine.test.ts');
const outfile = path.resolve(process.cwd(), 'tests/.engine.test.bundle.mjs');

await build({
  entryPoints: [entry],
  bundle: true,
  outfile,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  logLevel: 'warning',
});

await import(pathToFileURL(outfile).href);
