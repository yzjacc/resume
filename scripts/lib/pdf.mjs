import path from 'node:path';
import { copyFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { preview } from 'vite';
import { dist, root } from './content.mjs';

export async function generatePdfs(profile) {
  const server = await preview({
    configFile: path.join(root, 'vite.config.ts'),
    preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
  });
  let browser;
  try {
    browser = await puppeteer.launch({
      ...(process.env.PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
        : {}),
      ...(process.env.PUPPETEER_NO_SANDBOX === 'true'
        ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
        : {}),
    });
    const address = server.httpServer.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    for (const variant of profile.variants) {
      const page = await browser.newPage();
      const failures = [];
      page.on('requestfailed', (request) => failures.push(request.url()));
      page.on('response', (response) => {
        if (response.status() >= 400) failures.push(response.url());
      });
      await page.setViewport({ width: 1024, height: 1400 });
      await page.emulateMediaType('print');
      await page.goto(`${baseUrl}/${variant.htmlFile}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      if (failures.length)
        throw new Error(`PDF 引用资源不可用：${failures.join(', ')}`);
      await page.pdf({
        path: path.join(dist, variant.pdfFile),
        format: 'A4',
        preferCSSPageSize: true,
        printBackground: true,
        tagged: true,
      });
      await page.close();
      console.log(`已生成 ${variant.pdfFile}`);
    }
    const primary = profile.variants.find(
      (variant) => variant.htmlFile === 'index.html'
    );
    await copyFile(
      path.join(dist, primary.pdfFile),
      path.join(dist, 'resume.pdf')
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve()))
    );
  }
}
