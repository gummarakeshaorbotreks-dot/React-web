// "<destination> trips & treks" pages (/destinations/<slug>): every package that
// visits a place people search for ("coorg trip", "gokarna", "manali trek package"),
// and a page per state with 3+ packages.
//
// Which packages visit which destination comes from the SEO bot
// (DESTINATIONS_FILE, see seo-bot/bot/destinations.py); everything shown is
// computed here from the live trek data. A destination needs at least
// MIN_PACKAGES packages: with one, the package's own page already is that page.
import { readFile } from 'node:fs/promises';
import { organisersOf } from '../src/seo/meta.js';
import { km, minDays, slugify } from './near-pages.mjs';

export const DEST_BASE = '/destinations';
const MIN_PACKAGES = 2;
const METROS = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];
const FROM_METROS = 3;
const MAX_RELATED = 12;

export async function loadDestinations(file) {
  if (!file) return [];
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    console.warn(`destination-pages: no destinations file (${e.message}); no destination pages`);
    return [];
  }
}

/** dests: from the bot; treks: website API objects; places: India towns; nearPages: released city pages. */
export function buildDestinationPages(dests, treks, places, nearPages = []) {
  const byId = new Map(treks.map((t) => [t.id || t.slug, t]));
  const metros = METROS.map((n) => places.find((p) => p[0] === n)).filter(Boolean);
  const cityPages = new Set(nearPages.map((p) => p.slug));
  const pages = [];
  const taken = new Set();
  for (const d of dests) {
    const found = [...new Set(d.treks)].map((id) => byId.get(id)).filter(Boolean);
    if (found.length < MIN_PACKAGES || taken.has(d.slug)) continue;
    taken.add(d.slug);
    const named = (t) => (t.name.toLowerCase().includes(d.name.toLowerCase()) ? 0 : 1);
    const items = found
      .sort((a, b) => named(a) - named(b) || (a.price_start ?? 1e9) - (b.price_start ?? 1e9))
      .map((t) => ({
        id: t.id || t.slug,
        name: t.name,
        state: t.state || '',
        price: t.price_start ?? null,
        duration: t.duration_days ?? '',
        days: minDays(t.duration_days),
        operating_days: t.operating_days || '',
        operators: organisersOf(t),
        image: t.main_image || t.images?.[0]?.image_url || null,
      }));
    const byDistance = d.lat != null
      ? metros
        .map(([city, , lat, lon]) => ({ city, km: Math.round(km(d.lat, d.lon, lat, lon) / 5) * 5, page: cityPages.has(slugify(city)) ? slugify(city) : null }))
        .sort((a, b) => a.km - b.km)
      : [];
    // The nearest metro always; others only when they are a real option (not Kolkata for Spiti).
    const from = byDistance.filter((m, i) => i === 0 || m.km <= Math.max(600, 1.6 * byDistance[0].km)).slice(0, FROM_METROS);
    pages.push({
      slug: d.slug,
      path: `${DEST_BASE}/${d.slug}`,
      name: d.name,
      state: d.state,
      kind: d.kind,
      treks: items,
      // Some are typed in lowercase in the admin ("malpe beach").
      places: d.places.slice(0, 12).map((p) => (p === p.toLowerCase() ? p.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : p)),
      from,
      // Position, for the distance on its "trip from <city>" pages (scripts/route-pages.mjs).
      lat: d.lat ?? null,
      lon: d.lon ?? null,
      routes: [],
    });
  }
  for (const p of pages) {
    p.statePage = pages.find((o) => o.kind === 'state' && o.state === p.state && o !== p)?.slug || null;
    p.related = pages
      .filter((o) => o !== p && o.kind !== 'state' && o.state === p.state)
      .sort((a, b) => b.treks.length - a.treks.length)
      .slice(0, MAX_RELATED)
      .map((o) => ({ slug: o.slug, name: o.name, count: o.treks.length }));
  }
  const states = {};
  for (const p of pages) {
    const s = (states[p.state || 'Other'] ||= { state: p.state || 'Other', page: null, places: [] });
    if (p.kind === 'state') s.page = { slug: p.slug, count: p.treks.length };
    else s.places.push({ slug: p.slug, name: p.name, count: p.treks.length });
  }
  const hub = {
    path: DEST_BASE,
    destinations: pages.length,
    states: Object.values(states)
      .sort((a, b) => a.state.localeCompare(b.state))
      .map((s) => ({ ...s, places: s.places.sort((a, b) => a.name.localeCompare(b.name)) })),
  };
  return { pages, hub };
}
