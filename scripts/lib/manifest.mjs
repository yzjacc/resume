import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { root, dist, loadContent } from './content.mjs';

export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export const manifestName = 'build-manifest.json';

export async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`产物目录不允许符号链接：${entry.name}`);
    if (entry.isDirectory()) files.push(...(await filesUnder(file)));
    else files.push(file);
  }
  return files.sort();
}

export async function sourceFingerprint() {
  const files = [
    ...(await filesUnder(path.join(root, 'src'))),
    ...(await filesUnder(path.join(root, 'public'))),
    ...(await filesUnder(path.join(root, 'scripts'))),
    ...['package.json', 'package-lock.json', 'vite.config.ts'].map((file) =>
      path.join(root, file)
    ),
  ];
  const hash = createHash('sha256');
  for (const file of files.sort())
    hash
      .update(path.relative(root, file))
      .update('\0')
      .update(await readFile(file))
      .update('\0');
  return hash.digest('hex');
}

export function fileHeaders(name) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.json': 'application/json; charset=utf-8',
  };
  return {
    'Content-Type': types[path.extname(name)] || 'application/octet-stream',
    'Cache-Control': name.startsWith('assets/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=300, must-revalidate',
    'Content-Disposition': 'inline',
  };
}

export async function writeManifest(sourceHash, withPdf) {
  const files = [];
  for (const file of await filesUnder(dist)) {
    const name = path.relative(dist, file).split(path.sep).join('/');
    if (name === manifestName) continue;
    const bytes = await readFile(file);
    files.push({
      name,
      bytes: bytes.length,
      sha256: sha256(bytes),
      headers: fileHeaders(name),
    });
  }
  const manifest = {
    version: 1,
    sourceHash,
    withPdf,
    builtAt: new Date().toISOString(),
    files,
  };
  await writeFile(
    path.join(dist, manifestName),
    JSON.stringify(manifest, null, 2) + '\n'
  );
  return manifest;
}

export async function validateManifest(directory = dist, expectedSourceHash) {
  const manifest = JSON.parse(
    await readFile(path.join(directory, manifestName), 'utf8')
  );
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.files) ||
    !manifest.withPdf
  )
    throw new Error('发布需要完整网页和 PDF 产物，请运行 npm run build');
  if (expectedSourceHash && manifest.sourceHash !== expectedSourceHash)
    throw new Error('源码已更新但产物未重建，请运行 npm run build');
  const { profile } = await loadContent();
  const required = [
    'index.html',
    'web-frontend.html',
    'robots.txt',
    'sitemap.xml',
    '404.html',
    'resume.pdf',
    ...profile.variants.map((variant) => variant.pdfFile),
  ];
  const names = new Set();
  for (const file of manifest.files) {
    if (
      typeof file.name !== 'string' ||
      path.isAbsolute(file.name) ||
      file.name.split(/[\\/]/).some((part) => part.startsWith('.') || !part) ||
      file.name.includes('\\') ||
      names.has(file.name)
    )
      throw new Error('发布清单包含非法或重复路径');
    names.add(file.name);
    const filename = path.join(directory, file.name);
    // filesUnder also rejects a symlink in any parent directory.
    if (!(await lstat(filename)).isFile())
      throw new Error(`产物不是普通文件：${file.name}`);
    const bytes = await readFile(filename);
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
      throw new Error(`产物校验失败：${file.name}`);
  }
  const actual = (await filesUnder(directory))
    .map((file) => path.relative(directory, file).split(path.sep).join('/'))
    .filter((name) => name !== manifestName);
  if (actual.length !== names.size || actual.some((name) => !names.has(name)))
    throw new Error('产物目录与发布清单不一致');
  if (required.some((name) => !names.has(name)))
    throw new Error('发布清单缺少必需页面、SEO 文件或 PDF');
  return manifest;
}
