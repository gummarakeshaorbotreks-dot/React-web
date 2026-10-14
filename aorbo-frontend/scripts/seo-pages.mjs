// Runs after scripts/prerender.mjs (see package.json "build").
//
// Before this, the server answered EVERY address with the home page's HTML
// (nginx `try_files … /index.html`): Google's first look at /about, each trek,
// each blog post — and even /robots.txt and /sitemap.xml — was the home page.
// This writes, from the live website API:
//   - dist/<page>/index.html for every static page, trek and blog post, each
//     with its own <title>, description, canonical, share tags and JSON-LD
//     (the body is the same app frame; the app renders the page as before);
//   - dist/404.html (noindex) for addresses that do not exist;
//   - dist/sitemap.xml and dist/robots.txt.
// The tags come from src/seo/meta.js — the same table the app uses while
// people move around the site (useSeo), so the two always agree.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SITE_URL, STATIC_PAGES, absoluteUrl, blogMeta, notFoundMeta, staticPageMeta, trekMeta } from '../src/seo/meta.js';

const DIST = process.env.PRERENDER_DIST || 'dist';
const API = (process.env.SEO_API_URL || process.env.VITE_API_URL || SITE_URL).replace(/\/$/, '');
const ALLOW_OFFLINE = process.env.SEO_ALLOW_OFFLINE === '1';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headBlock({ title, description, path: p, image, type = 'website', noindex = false, jsonLd = null }) {
  const url = absoluteUrl(p);
  const img = image || `${SITE_URL}/og-image.jpg`;
  const lines = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`,
    noindex ? null : `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:site_name" content="Aorbo Treks" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    // `<` is escaped so a title can never close the script tag.
    jsonLd ? `<script id="ld-json" type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : null,
  ].filter(Boolean);
  return `<!--seo-->\n    ${lines.join('\n    ')}\n    <!--/seo-->`;
}

async function getJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

async function allPages(listPath) {
  const first = await getJson(`${API}${listPath}?page=1`);
  const items = [...(first.results || [])];
  for (let page = 2; page <= (first.total_pages || 1); page++) {
    items.push(...((await getJson(`${API}${listPath}?page=${page}`)).results || []));
  }
  return items;
}

/** Runs [fn] over [items], [n] at a time. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]);
    }
  }));
  return out;
}

const template = await readFile(path.join(DIST, 'index.html'), 'utf8');
if (!/<!--seo-->[\s\S]*?<!--\/seo-->/.test(template)) throw new Error('dist/index.html is missing the <!--seo--> … <!--/seo--> block');
const withHead = (meta) => template.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, headBlock(meta));

// Paths that differ only in capitals ("/treks/Coorg" vs "/treks/coorg" are two
// different treks) would overwrite each other on a case-insensitive disk
// (Windows builds): the second one gets no file. nginx answers addresses
// without a file with a real 404, so such a page must stay out of the sitemap
// (the health bot flagged /treks/coorg). Fix the data: give treks unique slugs.
const writtenLower = new Set();

async function writePage(p, meta) {
  if (writtenLower.has(p.toLowerCase())) {
    console.warn(`seo-pages: ${p} differs from another page only in capitals — no own file, left out of the sitemap`);
    return false;
  }
  writtenLower.add(p.toLowerCase());
  const file = p === '/' ? path.join(DIST, 'index.html') : path.join(DIST, p.replace(/^\//, ''), 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, withHead(meta));
  return true;
}

// Data from the live API (the build fails rather than silently dropping
// every trek and blog post from the sitemap).
let treks = [];
let blogs = [];
try {
  const list = await allPages('/api/treks/');
  treks = (await pool(list, 6, async (t) => {
    const id = t.id || t.slug;
    try {
      return await getJson(`${API}/api/treks/${encodeURIComponent(id)}/`);
    } catch {
      return t; // the list entry still has name / state / price / image
    }
  })).filter((t) => t && (t.id || t.slug) && t.name);
  blogs = (await allPages('/api/blogs/')).filter((b) => b && b.slug && b.title);
} catch (e) {
  if (!ALLOW_OFFLINE) throw new Error(`seo-pages: the website API (${API}) is unreachable: ${e.message}. Set SEO_ALLOW_OFFLINE=1 to build static pages only.`);
  console.warn(`seo-pages: API unreachable (${e.message}); static pages only.`);
}

const urls = [];
for (const p of Object.keys(STATIC_PAGES)) {
  if (await writePage(p, staticPageMeta(p))) urls.push({ loc: absoluteUrl(p), priority: p === '/' ? '1.0' : '0.6' });
}
const seen = new Set();
for (const t of treks) {
  const meta = trekMeta(t);
  if (seen.has(meta.path)) continue;
  seen.add(meta.path);
  if (await writePage(meta.path, meta)) urls.push({ loc: absoluteUrl(meta.path), priority: '0.9', image: meta.image });
}
for (const b of blogs) {
  const meta = blogMeta(b);
  if (await writePage(meta.path, meta)) {
    urls.push({ loc: absoluteUrl(meta.path), priority: '0.7', lastmod: (b.updated_at || b.created_at || '').slice(0, 10), image: meta.image });
  }
}
await writeFile(path.join(DIST, '404.html'), withHead(notFoundMeta()));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
  ...urls.map((u) => [
    '  <url>',
    `    <loc>${esc(u.loc)}</loc>`,
    u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
    `    <priority>${u.priority}</priority>`,
    u.image && /^https?:/.test(u.image) ? `    <image:image><image:loc>${esc(u.image)}</image:loc></image:image>` : null,
    '  </url>',
  ].filter(Boolean).join('\n')),
  '</urlset>',
  '',
].join('\n');
await writeFile(path.join(DIST, 'sitemap.xml'), xml);
await writeFile(
  path.join(DIST, 'robots.txt'),
  [
    // /api/ stays crawlable: trek and blog pages fetch their content from it in
    // the browser, and Google renders pages the same way. Blocking it would
    // show Google empty trek pages.
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/crash-report/',
    'Disallow: /supersecretadmin/',
    'Disallow: /accounts/',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n'),
);
console.log(`seo-pages: ${Object.keys(STATIC_PAGES).length} pages + ${seen.size} treks + ${blogs.length} blog posts, sitemap ${urls.length} URLs, 404.html, robots.txt`);
