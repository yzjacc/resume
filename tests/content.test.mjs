import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  root,
  loadContent,
  renderPage,
  seoFiles,
  structuredData,
  safeJson,
  validateProfile,
} from '../scripts/lib/content.mjs';

test('两个岗位从同一正文渲染，首份 HTML 就有正文和 SEO，不需要执行 JS', async () => {
  const { profile } = await loadContent();
  const results = [];
  for (const variant of profile.variants) {
    const template = await readFile(
      path.join(root, 'src', variant.htmlFile),
      'utf8'
    );
    const html = await renderPage(template, variant.htmlFile);
    assert.match(html, /<html lang="zh-CN">/);
    assert.match(html, /SchemaTable/);
    assert.ok(html.includes(`<h2>${variant.role}</h2>`));
    assert.ok(html.includes(encodeURIComponent(variant.pdfFile)));
    assert.match(html, /rel="canonical" href="https:\/\/yuzijun.cn\/"/);
    assert.match(html, /name="description"/);
    assert.doesNotMatch(html, /<%|href=""|<script[^>]+src=/);
    const schema = JSON.parse(
      html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]
    );
    assert.equal(schema.mainEntity.name, profile.name);
    results.push(html.match(/<div class="content-bd">[\s\S]*?<\/main>/)[0]);
  }
  assert.equal(results[0], results[1]);
});

test('规范地址、站点地图和人物实体一致，不把重复岗位页当作独立收录页', async () => {
  const { profile } = await loadContent();
  const files = seoFiles(profile);
  assert.ok(
    files['robots.txt'].includes(`Sitemap: ${profile.siteUrl}/sitemap.xml`)
  );
  assert.equal((files['sitemap.xml'].match(/<loc>/g) || []).length, 1);
  assert.ok(
    files['sitemap.xml'].includes(`<lastmod>${profile.updatedAt}</lastmod>`)
  );
  assert.equal(structuredData(profile).url, `${profile.siteUrl}/`);
});

test('拒绝错误域名、日期、越界路径和重复岗位，JSON-LD 不可逃逸 script', async () => {
  const { profile } = await loadContent();
  for (const value of [
    'http://yuzijun.cn',
    'https://yuzijun.cn/sub',
    'https://yuzijun.cn/',
  ]) {
    assert.throws(() => validateProfile({ ...profile, siteUrl: value }));
  }
  assert.throws(() => validateProfile({ ...profile, updatedAt: '2026-02-31' }));
  assert.throws(() =>
    validateProfile({
      ...profile,
      variants: [profile.variants[0], profile.variants[0]],
    })
  );
  assert.throws(() =>
    validateProfile({
      ...profile,
      variants: [
        { ...profile.variants[0], pdfFile: '../secret.pdf' },
        profile.variants[1],
      ],
    })
  );
  assert.doesNotMatch(
    safeJson({ name: '</script><script>alert(1)</script>' }),
    /<\/script>/
  );
});
