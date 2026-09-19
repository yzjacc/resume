import { build } from 'vite';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
import { root, dist, loadContent } from './lib/content.mjs';
import { generatePdfs } from './lib/pdf.mjs';
import {
  sourceFingerprint,
  writeManifest,
  manifestName,
} from './lib/manifest.mjs';

export async function buildResume({ withPdf = true } = {}) {
  const sourceHash = await sourceFingerprint();
  const { profile } = await loadContent();
  // A failed build must never leave a deployable stale manifest.
  await rm(path.join(dist, manifestName), { force: true });
  await build({ configFile: path.join(root, 'vite.config.ts') });
  if (withPdf) await generatePdfs(profile);
  if (sourceHash !== (await sourceFingerprint()))
    throw new Error('构建期间源文件有变化，请重新构建');
  await writeManifest(sourceHash, withPdf);
  console.log(`构建完成：dist/（${withPdf ? '网页、SEO、PDF' : '网页、SEO'}）`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  buildResume({ withPdf: !process.argv.includes('--web-only') }).catch(
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    }
  );
}
