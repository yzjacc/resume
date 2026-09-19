import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { dist, loadContent, renderPage, seoFiles } from './content.mjs';
import { sourceFingerprint, validateManifest } from './manifest.mjs';

/** @returns {import('vite').Plugin} */
export function resumePlugin() {
  return {
    name: 'resume-content',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        return renderPage(html, context.filename);
      },
    },
    configureServer(server) {
      server.watcher.on('change', (file) => {
        if (/[/\\](content|templates)[/\\]/.test(file))
          server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use(async (request, response, next) => {
        try {
          const name = decodeURIComponent(
            request.url?.split('?')[0]?.slice(1) || ''
          );
          if (
            !['robots.txt', 'sitemap.xml'].includes(name) &&
            !name.endsWith('.pdf')
          )
            return next();
          const { profile } = await loadContent();
          if (name.endsWith('.pdf')) {
            if (
              ![
                'resume.pdf',
                ...profile.variants.map((variant) => variant.pdfFile),
              ].includes(name)
            )
              return next();
            try {
              await validateManifest(dist, await sourceFingerprint());
              const bytes = await readFile(path.join(dist, name));
              response.setHeader('Content-Type', 'application/pdf');
              response.setHeader('Cache-Control', 'no-store');
              response.end(bytes);
            } catch {
              response.statusCode = 503;
              response.setHeader('Content-Type', 'text/plain; charset=utf-8');
              response.end(
                'PDF 尚未生成或内容已更新，请运行 npm run watch 或 npm run build，等待构建完成后重试。'
              );
            }
            return;
          }
          response.setHeader(
            'Content-Type',
            name === 'robots.txt'
              ? 'text/plain; charset=utf-8'
              : 'application/xml; charset=utf-8'
          );
          response.end(seoFiles(profile)[name]);
        } catch (error) {
          next(error);
        }
      });
    },
    async generateBundle() {
      const { profile } = await loadContent();
      for (const [fileName, source] of Object.entries(seoFiles(profile)))
        this.emitFile({ type: 'asset', fileName, source });
    },
  };
}
