import 'dotenv/config';
import path from 'node:path';
import OSS from 'ali-oss';
import { dist } from './lib/content.mjs';
import {
  manifestName,
  sourceFingerprint,
  validateManifest,
  fileHeaders,
} from './lib/manifest.mjs';
import { cdnDomains, refreshUrls, refreshCdn, verifyLive } from './lib/cdn.mjs';

try {
  const manifest = await validateManifest(dist, await sourceFingerprint());
  const domains = cdnDomains(process.env.CDN_DOMAINS);
  // Upload referenced files before documents and the manifest last.
  const priority = (name) =>
    name === 'index.html'
      ? 3
      : name.endsWith('.html')
      ? 2
      : name === 'sitemap.xml'
      ? 4
      : 1;
  const files = [...manifest.files].sort(
    (a, b) => priority(a.name) - priority(b.name)
  );
  files.push({ name: manifestName });
  if (process.argv.includes('--dry-run')) {
    console.log('发布预检通过；以下文件将上传，未连接 OSS：');
    for (const file of files)
      console.log(`${file.name}  ${fileHeaders(file.name)['Cache-Control']}`);
    if (domains.length)
      console.log(
        `CDN 刷新计划：\n${refreshUrls(domains, manifest).join('\n')}`
      );
  } else {
    for (const key of [
      'OSS_REGION',
      'OSS_BUCKET',
      'OSS_ACCESS_KEY_ID',
      'OSS_ACCESS_KEY_SECRET',
    ])
      if (!process.env[key])
        throw new Error(`缺少 ${key}；请配置 .env 或 CI Secrets`);
    const client = new OSS({
      region: process.env.OSS_REGION,
      bucket: process.env.OSS_BUCKET,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      authorizationV4: true,
      secure: true,
    });
    for (const file of files) {
      try {
        await client.put(file.name, path.join(dist, file.name), {
          headers: {
            ...fileHeaders(file.name),
            'x-oss-object-acl': 'public-read',
          },
        });
      } catch (error) {
        throw new Error(
          `上传 ${file.name} 失败（${error.code ?? 'OSS_ERROR'}）`
        );
      }
      console.log(`已上传 ${file.name}`);
    }
    if (domains.length) {
      await refreshCdn(domains, manifest);
      await verifyLive(domains, manifest, { attempts: 20 });
    } else {
      console.log(
        'OSS 上传完成；未配置 CDN_DOMAINS，未刷新或核验 CDN。可配置后重新部署。'
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
