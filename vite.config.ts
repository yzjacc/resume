import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { viteSingleFile } from 'vite-plugin-singlefile';
// 若要在当前仓库设置用户名，可以使用以下命令：
// git config --local user.name "Your Name"
// 若要在当前仓库设置邮箱，可以使用以下命令：
// git config --local user.email "your.email@example.com"

// https://vitejs.dev/config/
export default defineConfig({
  root: './src',
  build: {
    outDir: '..',
    emptyOutDir: false,
  },
  plugins: [
    createHtmlPlugin({
      minify: true,
    }),
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
  ],
});
