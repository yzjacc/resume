import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { resumePlugin } from './scripts/lib/resume-plugin.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: path.join(root, 'src'),
  publicDir: path.join(root, 'public'),
  appType: 'mpa',
  plugins: [resumePlugin()],
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(root, 'src/index.html'),
        frontend: path.join(root, 'src/web-frontend.html'),
        notFound: path.join(root, 'src/404.html'),
      },
    },
  },
});
