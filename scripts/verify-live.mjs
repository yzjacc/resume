import 'dotenv/config';
import { loadContent, dist } from './lib/content.mjs';
import { validateManifest } from './lib/manifest.mjs';
import { cdnDomains, verifyLive } from './lib/cdn.mjs';

try {
  const { profile } = await loadContent();
  const manifest = await validateManifest(dist);
  await verifyLive(
    cdnDomains(process.env.CDN_DOMAINS || profile.siteUrl),
    manifest
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
