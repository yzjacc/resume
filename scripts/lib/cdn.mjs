import RPCClient from '@alicloud/pop-core';
import { sha256, manifestName } from './manifest.mjs';

export function cdnDomains(value = '') {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ].map((item) => {
    const url = new URL(item);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== item)
      throw new Error('CDN_DOMAINS 只能包含逗号分隔、不带路径的 HTTP(S) 域名');
    return item;
  });
}

export function refreshUrls(domains, manifest) {
  return domains.flatMap((domain) => [
    `${domain}/`,
    ...[
      ...manifest.files
        .map((file) => file.name)
        .filter((name) => !name.startsWith('assets/')),
      manifestName,
    ].map((name) => `${domain}/${encodeURI(name)}`),
  ]);
}

export async function refreshCdn(domains, manifest) {
  const client = new RPCClient({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    endpoint: 'https://cdn.aliyuncs.com',
    apiVersion: '2018-05-10',
  });
  try {
    const result = await client.request(
      'RefreshObjectCaches',
      {
        ObjectPath: refreshUrls(domains, manifest).join('\n'),
        ObjectType: 'File',
      },
      { method: 'POST' }
    );
    console.log(
      `已提交 CDN 刷新任务：${result.RefreshTaskId}；等待实际页面校验。`
    );
  } catch (error) {
    throw new Error(
      `CDN 刷新失败（${
        error.code ?? 'CDN_ERROR'
      }），OSS 已上传；检查 RAM 的 cdn:RefreshObjectCaches 权限后重试`
    );
  }
}

export async function verifyLive(
  domains,
  manifest,
  { attempts = 1, delayMs = 30000, request = fetch } = {}
) {
  const homepage = manifest.files.find((file) => file.name === 'index.html');
  const checks = domains.flatMap((domain) => [
    { url: `${domain}/`, sha256: homepage.sha256 },
    ...manifest.files.map((file) => ({
      url: `${domain}/${encodeURI(file.name)}`,
      sha256: file.sha256,
    })),
  ]);
  let failures;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const results = await Promise.all(
      checks.map(async (check) => {
        try {
          const response = await request(check.url, {
            signal: AbortSignal.timeout(15000),
          });
          if (response.status !== 200)
            return `${check.url}：HTTP ${response.status}`;
          if (
            sha256(Buffer.from(await response.arrayBuffer())) !== check.sha256
          )
            return `${check.url}：仍是旧版本或内容不一致`;
        } catch {
          return `${check.url}：请求失败`;
        }
        return null;
      })
    );
    failures = results.filter(Boolean);
    if (!failures.length) {
      console.log('线上网页、SEO、资源及 PDF 与本次构建一致。');
      return;
    }
    if (attempt < attempts) {
      console.log(`CDN 尚未全部更新（${attempt}/${attempts}），30 秒后复查。`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`线上校验未通过：\n${failures.join('\n')}`);
}
