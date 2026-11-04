/** 集成测试运行器 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const entry = path.resolve(process.cwd(), 'tests/engine.integration.test.ts');
const outfile = path.resolve(process.cwd(), 'tests/.integration.bundle.mjs');

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
