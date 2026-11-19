// Telugu trek guides (SEO plan phase 3, 19 Nov 2026: Indian-language versions, the CarDekho pattern):
// /te/treks/<key> for every trek on the compare/collection set (treks only, not tours, not listings the
// team must confirm, not thin; scripts/fact-pages.mjs trekEntries) that has a Telugu name in
// scripts/data/names-te.json. Text: src/seo/telugu.js (fixed sentences + checked facts). Each guide is
// paired with its English page through hreflang (both ways) and offers the trek's packages.
// Kannada and other languages use the same builder with their own names file and text module.
import { readFile } from 'node:fs/promises';

export const TE_BASE = '/te';
const MIN_FACTS = 3;
const keyFacts = (f) => ['altitude_m', 'trail_km', 'difficulty', 'months', 'start', 'rail', 'airport']
  .filter((k) => (Array.isArray(f[k]) ? f[k].length : f[k] != null && f[k] !== '')).length;

export async function loadNames(file) {
  try {
    return JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8')).names || {};
  } catch {
    return {};
  }
}

/** entries: trekEntries(); names: { key: Telugu name }. */
export function buildTeluguPages(entries, names) {
  const pages = [];
  for (const e of entries) {
    const nameTe = names[e.key];
    if (!nameTe || !e.listings.length || keyFacts(e.facts) < MIN_FACTS) continue;
    pages.push({
      slug: e.key,
      path: `${TE_BASE}/treks/${e.key}`,
      en: `/treks/${e.listings[0].id}`,
      name: e.name,
      nameTe,
      state: e.state,
      facts: e.facts,
      price: e.price,
      image: e.image,
      listings: e.listings.map(({ id, name, price, duration, operating_days, image }) => ({ id, name, price, duration, operating_days, image })),
    });
  }
  pages.sort((a, b) => a.name.localeCompare(b.name));
  for (const p of pages) {
    p.others = pages.filter((o) => o !== p && o.state === p.state).slice(0, 8).map((o) => ({ path: o.path, nameTe: o.nameTe }));
  }
  const states = [...new Set(pages.map((p) => p.state))].sort();
  const hub = pages.length ? {
    path: TE_BASE,
    states: states.map((s) => ({ state: s, treks: pages.filter((p) => p.state === s).map((p) => ({ path: p.path, nameTe: p.nameTe, name: p.name })) })),
  } : null;
  return { pages, hub };
}

/** English listing page -> its Telugu guide (for the hreflang pair on the English page). */
export function teluguAlternates(pages) {
  const out = new Map();
  for (const p of pages) for (const l of p.listings) if (`/treks/${l.id}` === p.en) out.set(l.id, p.path);
  return out;
}
