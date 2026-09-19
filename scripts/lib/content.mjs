import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ejs from 'ejs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const dist = path.join(root, 'dist');
export const profilePath = path.join(root, 'src/content/profile.json');
export const experiencePath = path.join(root, 'src/content/experience.html');
export const canonicalUrl = (profile) => `${profile.siteUrl}/`;
export const escapeHtml = (text) => ejs.escapeXML(String(text));
export const safeJson = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export function validateProfile(profile) {
  for (const key of [
    'siteUrl',
    'name',
    'englishName',
    'username',
    'description',
    'updatedAt',
    'personalInfo',
    'education',
    'school',
    'email',
    'phone',
    'phoneLabel',
    'github',
  ]) {
    if (typeof profile[key] !== 'string' || !profile[key].trim())
      throw new Error(`profile.json 缺少有效的 ${key}`);
  }
  const url = new URL(profile.siteUrl);
  if (url.protocol !== 'https:' || url.origin !== profile.siteUrl)
    throw new Error('siteUrl 必须是无路径、无尾斜杠的 HTTPS 主域名');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(profile.updatedAt) ||
    !Number.isFinite(Date.parse(profile.updatedAt)) ||
    new Date(profile.updatedAt).toISOString().slice(0, 10) !== profile.updatedAt
  )
    throw new Error('updatedAt 必须是真实的 YYYY-MM-DD 日期');
  if (new URL(profile.github).protocol !== 'https:')
    throw new Error('github 必须是 HTTPS 地址');
  if (
    !/^[\w.+-]+@[\w.-]+\.[a-z]+$/i.test(profile.email) ||
    !/^\+?[\d -]+$/.test(profile.phone)
  )
    throw new Error('联系方式格式不正确');
  if (!Array.isArray(profile.variants) || profile.variants.length !== 2)
    throw new Error('需配置全栈和前端两个岗位版本');
  const expectedFiles = ['index.html', 'web-frontend.html'];
  const names = new Set();
  for (const variant of profile.variants) {
    if (
      !expectedFiles.includes(variant.htmlFile) ||
      !variant.role?.trim() ||
      !variant.id?.trim()
    )
      throw new Error('岗位版本配置不正确');
    if (
      !/^[^/\\?#%\x00-\x1f]+\.pdf$/.test(variant.pdfFile) ||
      variant.pdfFile.startsWith('.') ||
      variant.pdfFile === 'resume.pdf'
    )
      throw new Error('PDF 名称必须是独立的 .pdf 文件名');
    for (const name of [variant.id, variant.htmlFile, variant.pdfFile]) {
      if (names.has(name)) throw new Error(`岗位版本出现重复名称：${name}`);
      names.add(name);
    }
  }
  return profile;
}

export async function loadContent() {
  const [json, experience] = await Promise.all([
    readFile(profilePath, 'utf8'),
    readFile(experiencePath, 'utf8'),
  ]);
  return { profile: validateProfile(JSON.parse(json)), experience };
}

export function structuredData(profile) {
  const url = canonicalUrl(profile);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    url,
    dateModified: profile.updatedAt,
    mainEntity: {
      '@type': 'Person',
      '@id': `${url}#person`,
      name: profile.name,
      alternateName: [profile.englishName, profile.username],
      description: profile.description,
      url,
      sameAs: [profile.github],
    },
  };
}

export async function renderPage(template, filename) {
  const { profile, experience } = await loadContent();
  const variant = profile.variants.find(
    (item) => item.htmlFile === path.basename(filename)
  );
  if (!variant) return template;
  return ejs.render(
    template,
    {
      profile,
      experience,
      variant,
      canonical: canonicalUrl(profile),
      title: `简历 | ${variant.role} | ${profile.name} - ${profile.englishName}`,
      description: profile.description,
      updatedLabel: `${profile.updatedAt.slice(
        0,
        4
      )}年${profile.updatedAt.slice(5, 7)}月`,
      jsonLd: safeJson(structuredData(profile)),
      pdfHref: `/${encodeURIComponent(variant.pdfFile)}`,
    },
    { filename: path.join(root, 'src', path.basename(filename)) }
  );
}

export function seoFiles(profile) {
  const url = escapeHtml(canonicalUrl(profile));
  return {
    'robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${canonicalUrl(
      profile
    )}sitemap.xml\n`,
    'sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}</loc><lastmod>${profile.updatedAt}</lastmod></url></urlset>\n`,
  };
}
