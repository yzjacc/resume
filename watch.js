const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

// 监听的文件路径
const watchPaths = [
  './src/**/*',
];

// 构建和转换函数
function buildAndConvert() {
  console.log('\n=== 开始构建和转换 ===');

  // 执行构建命令
  exec('npm run prettier && tsc && vite build', {
    cwd: __dirname,
    stdio: 'inherit'
  }, (error, stdout, stderr) => {
    if (error) {
      console.error('构建失败:', error.message);
      return;
    }

    // 执行 PDF 转换命令
    exec('node html-to-pdf.js', {
      cwd: __dirname,
      stdio: 'inherit'
    }, (error, stdout, stderr) => {
      if (error) {
        console.error('PDF 转换失败:', error.message);
      } else {
        console.log('PDF 转换成功');
      }

      console.log('=== 构建和转换完成 ===\n');
    });
  });
}

// 初始化监听器
const watcher = chokidar.watch(watchPaths, {
  persistent: true,
  ignoreInitial: true,
  cwd: __dirname,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

console.log('开始监听文件变化...');
console.log('首次执行构建和转换...');
console.log('监听路径:', watchPaths.map(p => path.resolve(__dirname, p)));

// 首次执行构建和转换
buildAndConvert();

// 监听文件变化
watcher
  .on('change', (filePath) => {
    const fullPath = path.resolve(__dirname, filePath);
    console.log(`文件已更改: ${fullPath}`);
    buildAndConvert();
  })
  .on('add', (filePath) => {
    const fullPath = path.resolve(__dirname, filePath);
    console.log(`文件已添加: ${fullPath}`);
    buildAndConvert();
  })
  .on('unlink', (filePath) => {
    const fullPath = path.resolve(__dirname, filePath);
    console.log(`文件已删除: ${fullPath}`);
    buildAndConvert();
  })
  .on('error', (error) => {
    console.error('监听错误:', error);
  })
  .on('ready', () => {
    console.log('文件监听已就绪');
  });

// 保持进程运行
process.on('SIGINT', () => {
  console.log('停止监听...');
  watcher.close();
  process.exit(0);
});
