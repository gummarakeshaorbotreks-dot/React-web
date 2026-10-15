// Trek organiser profile pages (/organisers/<slug>): Aorbo Treks is a marketplace,
// so every organiser gets a page with all its treks, where it goes and its prices.
// Searches for an organiser's name land here, and organisers can link to their page.
// Built from the live trek data (operators of each trek); placeholder names
// ("we will update soon") and Aorbo's own labels never get a page.
import { organisersOf } from '../src/seo/meta.js';
import { minDays, slugify } from './near-pages.mjs';

export const ORG_BASE = '/organisers';

/** treks: website API trek objects (with operators); destinationPages: built destination pages. */
export function buildOrganiserPages(treks, destinationPages = []) {
  const byName = new Map();
  for (const t of treks) {
    for (const name of organisersOf(t)) {
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(t);
    }
  }
  const pages = [];
  for (const [name, list] of byName) {
    const ids = new Set(list.map((t) => t.id || t.slug));
    const items = list
      .sort((a, b) => (a.price_start ?? 1e9) - (b.price_start ?? 1e9))
      .map((t) => ({
        id: t.id || t.slug,
        name: t.name,
        state: t.state || '',
        price: t.price_start ?? null,
        duration: t.duration_days ?? '',
        days: minDays(t.duration_days),
        operating_days: t.operating_days || '',
        image: t.main_image || t.images?.[0]?.image_url || null,
      }));
    const destinations = destinationPages
      .filter((d) => d.kind !== 'state' && d.treks.some((t) => ids.has(t.id)))
      .map((d) => ({ slug: d.slug, name: d.name, count: d.treks.filter((t) => ids.has(t.id)).length }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    pages.push({
      slug: slugify(name),
      path: `${ORG_BASE}/${slugify(name)}`,
      name,
      treks: items,
      states: [...new Set(items.flatMap((t) => t.state.split(',').map((s) => s.trim())).filter(Boolean))].sort(),
      destinations,
    });
  }
  pages.sort((a, b) => b.treks.length - a.treks.length || a.name.localeCompare(b.name));
  for (const p of pages) p.others = pages.filter((o) => o !== p).map((o) => ({ slug: o.slug, name: o.name, count: o.treks.length }));
  const hub = { path: ORG_BASE, organisers: pages.map((p) => ({ slug: p.slug, name: p.name, count: p.treks.length, states: p.states })) };
  return { pages, hub };
}
