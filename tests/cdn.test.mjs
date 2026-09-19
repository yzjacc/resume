import test from 'node:test';
import assert from 'node:assert/strict';
import { cdnDomains, refreshUrls, verifyLive } from '../scripts/lib/cdn.mjs';
import { sha256 } from '../scripts/lib/manifest.mjs';

test('刷新覆盖裸域、www、首页别名和中文 PDF，不刷新已有内容哈希资源', () => {
  const domains = cdnDomains(
    'https://example.com,https://www.example.com,https://example.com'
  );
  assert.equal(domains.length, 2);
  assert.throws(() => cdnDomains('https://example.com/path'));
  const urls = refreshUrls(domains, {
    files: [
      { name: 'index.html' },
      { name: '简历.pdf' },
      { name: 'assets/index-abc.css' },
    ],
  });
  assert.ok(urls.includes('https://example.com/'));
  assert.ok(urls.includes('https://www.example.com/index.html'));
  assert.ok(urls.includes(`https://example.com/${encodeURI('简历.pdf')}`));
  assert.ok(urls.every((url) => !url.includes('/assets/')));
});

test('刷新提交成功不是验收：线上旧正文和 HTTP 错误必须报错', async () => {
  const manifest = { files: [{ name: 'index.html', sha256: sha256('new') }] };
  await assert.rejects(
    verifyLive(['https://example.com'], manifest, {
      request: async () => new Response('old'),
    }),
    /旧版本/
  );
  await assert.rejects(
    verifyLive(['https://example.com'], manifest, {
      request: async () => new Response('denied', { status: 403 }),
    }),
    /HTTP 403/
  );
  await verifyLive(['https://example.com'], manifest, {
    request: async () => new Response('new'),
  });
});
