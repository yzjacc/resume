const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 监听的目录
const srcDir = path.resolve(__dirname, 'src');

// 构建和转换函数
function buildAndConvert() {
  console.log('\n=== 开始构建和转换 ===');

  // 执行构建命令
  exec('npm run prettier && npx tsc && npx vite build --watch', {
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

// 递归监听目录
function watchDirectory(dir) {
  console.log('开始监听目录:', dir);

  // 监听当前目录
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename) {
      const fullPath = path.join(dir, filename);
      console.log(`文件 ${eventType}: ${fullPath}`);
      buildAndConvert();
    }
  });
}

// 首次执行构建和转换
console.log('首次执行构建和转换...');
buildAndConvert();

// 开始监听目录
watchDirectory(srcDir);

// 保持进程运行
console.log('文件监听已就绪，按 Ctrl+C 停止...');
process.on('SIGINT', () => {
  console.log('停止监听...');
  process.exit(0);
});
