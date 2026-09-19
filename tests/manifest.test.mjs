import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadContent } from '../scripts/lib/content.mjs';
import {
  sha256,
  fileHeaders,
  validateManifest,
} from '../scripts/lib/manifest.mjs';

test('发布前阻止过期源码、漏文件、污染文件、文件篡改和路径越界', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'resume-manifest-'));
  try {
    const { profile } = await loadContent();
    const names = [
      'index.html',
      'web-frontend.html',
      'robots.txt',
      'sitemap.xml',
      '404.html',
      'resume.pdf',
      ...profile.variants.map((variant) => variant.pdfFile),
    ];
    const data = Buffer.from('fixture');
    const manifest = {
      version: 1,
      withPdf: true,
      sourceHash: 'current',
      files: names.map((name) => ({
        name,
        bytes: data.length,
        sha256: sha256(data),
      })),
    };
    const save = () =>
      writeFile(
        path.join(dir, 'build-manifest.json'),
        JSON.stringify(manifest)
      );
    for (const name of names) await writeFile(path.join(dir, name), data);
    await save();
    await validateManifest(dir, 'current');
    await assert.rejects(validateManifest(dir, 'changed'), /源码已更新/);
    await writeFile(path.join(dir, '.env'), 'secret');
    // Hidden files are never in the upload manifest.
    await validateManifest(dir, 'current');
    await writeFile(path.join(dir, 'extra.txt'), data);
    await assert.rejects(validateManifest(dir, 'current'), /清单不一致/);
    await rm(path.join(dir, 'extra.txt'));
    await writeFile(path.join(dir, 'index.html'), 'tampered');
    await assert.rejects(validateManifest(dir, 'current'), /校验失败/);
    await writeFile(path.join(dir, 'index.html'), data);
    manifest.files[0].name = '../outside.html';
    await save();
    await assert.rejects(validateManifest(dir, 'current'), /非法/);
    manifest.files[0].name = 'index.html';
    manifest.withPdf = false;
    await save();
    await assert.rejects(validateManifest(dir, 'current'), /完整网页和 PDF/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('仅带哈希资源长缓存；HTML、SEO 与 PDF 均可及时更新', () => {
  assert.match(
    fileHeaders('assets/main-123abc.css')['Cache-Control'],
    /immutable/
  );
  for (const name of ['index.html', 'robots.txt', 'sitemap.xml', 'resume.pdf'])
    assert.doesNotMatch(fileHeaders(name)['Cache-Control'], /immutable/);
  assert.match(fileHeaders('robots.txt')['Content-Type'], /^text\/plain/);
});
