import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, 'dist');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const excluded = new Set([
  '.git',
  '.vercel',
  'node_modules',
  'dist',
  'package.json',
  'package-lock.json',
  'build.mjs',
  'speed-insights.js'
]);

for (const entry of readdirSync(root)) {
  if (excluded.has(entry)) continue;
  cpSync(join(root, entry), join(output, entry), { recursive: true });
}

await build({
  entryPoints: [join(root, 'speed-insights.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  outfile: join(output, 'speed-insights.bundle.js')
});

console.log('ROW.GG built successfully into dist/.');
