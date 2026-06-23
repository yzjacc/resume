import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { viteSingleFile } from 'vite-plugin-singlefile';

const variants = {
  fullstack: {
    fileName: 'index.html',
    title: '全栈开发工程师',
    documentTitle: '简历 | 全栈开发工程师 | 于子俊 - Zijun Yu',
    pdfFileName: '字节跳动-全栈工程师-于子俊.pdf',
  },
  webFrontend: {
    fileName: 'web-frontend.html',
    title: 'Web前端开发工程师',
    documentTitle: '简历 | Web前端开发工程师 | 于子俊 - Zijun Yu',
    pdfFileName: '字节跳动-Web前端工程师-于子俊.pdf',
  },
};

function applyResumeVariant(html: string, variant: typeof variants.fullstack) {
  return html
    .replace(/<title>.*?<\/title>/, `<title>${variant.documentTitle}</title>`)
    .replace(/全栈开发工程师/g, variant.title)
    .replace(/字节跳动-全栈工程师-于子俊\.pdf/g, variant.pdfFileName);
}

function resumeVariantPlugin(): Plugin {
  let buildOutDir = '';

  return {
    name: 'resume-variant',
    configResolved(config) {
      buildOutDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== `/${variants.webFrontend.fileName}`) {
          next();
          return;
        }

        try {
          const htmlPath = path.resolve(__dirname, 'src', variants.fullstack.fileName);
          const html = await fs.readFile(htmlPath, 'utf-8');
          const transformedHtml = await server.transformIndexHtml(pathname, html);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(transformedHtml);
        } catch (error) {
          next(error);
        }
      });
    },
    transformIndexHtml(html, ctx) {
      const pathname = ctx.path?.split('?')[0];
      return applyResumeVariant(
        html,
        pathname === `/${variants.webFrontend.fileName}` ? variants.webFrontend : variants.fullstack
      );
    },
    generateBundle(_, bundle) {
      const indexAsset = bundle[variants.fullstack.fileName];
      if (!indexAsset || indexAsset.type !== 'asset') {
        return;
      }

      const fullstackHtml = applyResumeVariant(String(indexAsset.source), variants.fullstack);
      indexAsset.source = fullstackHtml;
    },
    async writeBundle() {
      const indexPath = path.resolve(buildOutDir, variants.fullstack.fileName);
      const html = await fs.readFile(indexPath, 'utf-8');
      await fs.writeFile(
        path.resolve(buildOutDir, variants.webFrontend.fileName),
        applyResumeVariant(html, variants.webFrontend)
      );
    },
  };
}

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
    resumeVariantPlugin(),
  ],
});
