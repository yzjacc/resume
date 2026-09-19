import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { root } from './lib/content.mjs';
import { createBuildQueue } from './lib/build-queue.mjs';

let child;
let timer;
let stopping = false;
const enqueue = createBuildQueue(
  () =>
    new Promise((resolve, reject) => {
      if (stopping) return resolve();
      child = spawn(process.execPath, [path.join(root, 'scripts/build.mjs')], {
        cwd: root,
        stdio: 'inherit',
      });
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        child = undefined;
        code === 0 || stopping
          ? resolve()
          : reject(new Error(`构建失败：${code ?? signal}`));
      });
    }),
  (error) => console.error(`${error.message}；修正后保存文件将自动重试。`)
);
const watcher = chokidar.watch(
  [
    'src',
    'public',
    'scripts',
    'vite.config.ts',
    'package.json',
    'package-lock.json',
  ].map((file) => path.join(root, file)),
  {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  }
);
watcher.on('all', () => {
  clearTimeout(timer);
  timer = setTimeout(enqueue, 300);
});
watcher.on('error', (error) => console.error(error.message));
watcher.on('ready', () => {
  console.log('保存源文件后自动生成网页、SEO 和 PDF。不会上传线上。');
  void enqueue();
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    stopping = true;
    clearTimeout(timer);
    await watcher.close();
    child?.kill('SIGTERM');
  });
