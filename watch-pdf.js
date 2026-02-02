const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');

// 监听的文件路径
const indexHtmlPath = path.resolve(__dirname, 'index.html');

console.log(`Watching for changes in ${indexHtmlPath}`);

// 初始化时生成一次PDF
console.log('Generating initial PDF...');
execSync('node html-to-pdf.js', { stdio: 'inherit' });

// 使用chokidar监听文件变化
const watcher = chokidar.watch(indexHtmlPath, {
  ignored: /(^|[\\/])\../, // 忽略隐藏文件
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100
  }
});

// 监听文件变化事件
watcher
  .on('change', (path) => {
    console.log(`File ${path} has been changed. Generating PDF...`);
    execSync('node html-to-pdf.js', { stdio: 'inherit' });
  })
  .on('error', (error) => {
    console.error('Error watching file:', error);
  });

console.log('Watcher started. Press Ctrl+C to stop.');
