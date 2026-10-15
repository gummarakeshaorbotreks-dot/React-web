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
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  SITE_URL, STATIC_PAGES, absoluteUrl, blogMeta, destinationHubMeta, destinationMeta, nearHubMeta, nearMeta,
  notFoundMeta, staticPageMeta, trekMeta,
} from '../src/seo/meta.js';
import { indexOverrides, withOverride } from '../src/seo/overrides.js';
import { buildDestinationPages, loadDestinations } from './destination-pages.mjs';
import { buildNearPages, loadGeo } from './near-pages.mjs';

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

const EMPTY_MAIN = '<main id="main" data-prerendered=""></main>';
if (!template.includes(EMPTY_MAIN)) throw new Error(`dist/index.html is missing ${EMPTY_MAIN} (scripts/prerender.mjs)`);
const json = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

/**
 * extra (pre-built pages): { main: pre-rendered page HTML, data: the page's JSON (path
 * of its file + content, so the app needs no request), css: [stylesheet texts, inlined],
 * preload: the hero image url (optional) }.
 */
async function writePage(p, meta, extra = null) {
  if (writtenLower.has(p.toLowerCase())) {
    console.warn(`seo-pages: ${p} differs from another page only in capitals — no own file, left out of the sitemap`);
    return false;
  }
  writtenLower.add(p.toLowerCase());
  const file = p === '/' ? path.join(DIST, 'index.html') : path.join(DIST, p.replace(/^\//, ''), 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  let html = withHead(withOverride(meta, overrides[p]));
  if (extra) {
    html = html
      .replace(EMPTY_MAIN, `<main id="main" data-prerendered="" data-static="">${extra.main}</main>`)
      .replace('<!--/seo-->', `<!--/seo-->\n    ${[
        // The hero photo is the largest thing on a trek page: start downloading it at once
        // (the page's own preload sits in <body>, found later).
        extra.preload
          ? `<link rel="preload" as="image" href="${esc(extra.preload)}" fetchpriority="high"${extra.preload.includes('.supabase.co/') ? ' crossorigin="anonymous"' : ''}>`
          : '',
        // The page's own small stylesheet, inline: no request before the first paint.
        ...extra.css.map((text) => `<style>${text}</style>`),
      ].filter(Boolean).join('\n    ')}`)
      .replace('</body>', `<script id="page-data" type="application/json" data-file="${esc(extra.data.file)}">${json(extra.data.content)}</script>\n  </body>`);
  }
  await writeFile(file, html);
  return true;
}

// Data from the live API (the build fails rather than silently dropping
// every trek and blog post from the sitemap).
let treks = [];
let blogs = [];
let overrides = {};
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
  // Page overrides from the admin / SEO bot. Optional: an older backend without the
  // endpoint answers 404, and the build goes on with the default titles.
  try {
    overrides = indexOverrides(await getJson(`${API}/api/seo-overrides/`));
  } catch (e) {
    console.warn(`seo-pages: no SEO overrides (${e.message})`);
  }
} catch (e) {
  if (!ALLOW_OFFLINE) throw new Error(`seo-pages: the website API (${API}) is unreachable: ${e.message}. Set SEO_ALLOW_OFFLINE=1 to build static pages only.`);
  console.warn(`seo-pages: API unreachable (${e.message}); static pages only.`);
}

// Computed before any page is written: trek pages link to the city and destination
// pages they appear on. "Treks near <city>": scripts/near-pages.mjs; "<destination>
// trips": scripts/destination-pages.mjs. These pages, and the trek pages, are full
// HTML built with the app's own components (the SSR bundle), plus a JSON file per
// page for in-app navigation.
let near = { pages: [], hub: null, candidates: 0 };
let destinations = { pages: [], hub: null };
let ssr = null;
if (treks.length) {
  const places = JSON.parse(await readFile(new URL('./data/india-places.json', import.meta.url), 'utf8')).places;
  near = buildNearPages(treks, await loadGeo(process.env.TREK_GEO_FILE), places);
  destinations = buildDestinationPages(await loadDestinations(process.env.DESTINATIONS_FILE), treks, places, near.pages);
  ssr = await import(pathToFileURL(path.resolve('node_modules/.cache/prerender/entry-prerender.js')).href);
}
// A page's stylesheet is a separate chunk (loaded with the page's code); inline it so
// the pre-built HTML looks right before the JavaScript arrives.
async function cssWith(marker) {
  const found = [];
  for (const f of await readdir(path.join(DIST, 'assets'))) {
    const text = f.endsWith('.css') ? await readFile(path.join(DIST, 'assets', f), 'utf8') : '';
    if (text.includes(marker)) found.push(text.replaceAll('</', '<\\/'));
  }
  return found;
}
const trekLinks = new Map();
const linksOf = (id) => {
  if (!trekLinks.has(id)) trekLinks.set(id, { destinations: [], near: [] });
  return trekLinks.get(id);
};
for (const d of destinations.pages) {
  for (const t of d.treks) linksOf(t.id).destinations.push({ slug: d.slug, name: d.name, kind: d.kind, count: d.treks.length });
}
for (const c of near.pages) {
  for (const t of c.treks) linksOf(t.id).near.push({ slug: c.slug, name: c.name, km: t.km });
}
for (const l of trekLinks.values()) {
  l.destinations.sort((a, b) => (a.kind === 'state') - (b.kind === 'state') || b.count - a.count).splice(4);
  l.near.sort((a, b) => a.km - b.km).splice(3);
}

const urls = [];
for (const p of Object.keys(STATIC_PAGES)) {
  if (await writePage(p, staticPageMeta(p))) urls.push({ loc: absoluteUrl(p), priority: p === '/' ? '1.0' : '0.6' });
}
const seen = new Set();
const trekCss = ssr ? await cssWith('.detail-hero') : [];
if (ssr) await mkdir(path.join(DIST, 'data', 'treks'), { recursive: true });
for (const t of treks) {
  const id = t.id || t.slug;
  const links = trekLinks.get(id) || { destinations: [], near: [] };
  const meta = trekMeta(t, links);
  if (seen.has(meta.path)) continue;
  seen.add(meta.path);
  const file = `/data/treks/${encodeURIComponent(id)}.json`;
  const content = { trek: t, links };
  const hero = /^https?:/.test(t.main_image || '') ? t.main_image : null;
  const extra = ssr ? { main: ssr.renderTrek(content, meta.path), data: { file, content }, css: trekCss, preload: hero } : null;
  if (await writePage(meta.path, meta, extra)) {
    urls.push({ loc: absoluteUrl(meta.path), priority: '0.9', image: meta.image });
    if (ssr) await writeFile(path.join(DIST, 'data', 'treks', `${id}.json`), JSON.stringify(content));
  }
}
for (const b of blogs) {
  const meta = blogMeta(b);
  if (await writePage(meta.path, meta)) {
    urls.push({ loc: absoluteUrl(meta.path), priority: '0.7', lastmod: (b.updated_at || b.created_at || '').slice(0, 10), image: meta.image });
  }
}
if (ssr) {
  const css = await cssWith('.near-lead');
  const writeDataPages = async (dir, { pages, hub }, meta, render, hubMeta, renderHub) => {
    if (!pages.length) return;
    await mkdir(path.join(DIST, 'data', dir), { recursive: true });
    for (const page of pages) {
      const file = `/data/${dir}/${page.slug}.json`;
      await writeFile(path.join(DIST, file), JSON.stringify(page));
      if (await writePage(page.path, meta(page), { main: render(page), data: { file, content: page }, css })) {
        urls.push({ loc: absoluteUrl(page.path), priority: '0.6' });
      }
    }
    const file = `/data/${dir}/index.json`;
    await writeFile(path.join(DIST, file), JSON.stringify(hub));
    if (await writePage(hub.path, hubMeta(hub), { main: renderHub(hub), data: { file, content: hub }, css })) {
      urls.push({ loc: absoluteUrl(hub.path), priority: '0.7' });
    }
  };
  await writeDataPages('near', near, nearMeta, ssr.renderNear, nearHubMeta, ssr.renderNearHub);
  await writeDataPages('destinations', destinations, destinationMeta, ssr.renderDestination, destinationHubMeta, ssr.renderDestinationHub);
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
console.log(`seo-pages: ${Object.keys(STATIC_PAGES).length} pages + ${seen.size} treks + ${blogs.length} blog posts + ${near.pages.length} of ${near.candidates} city pages + ${destinations.pages.length} destination pages, sitemap ${urls.length} URLs, ${Object.keys(overrides).length} override(s), 404.html, robots.txt`);
