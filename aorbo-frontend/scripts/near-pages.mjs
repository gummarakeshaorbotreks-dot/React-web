// "Treks near <city>" pages: which cities and towns get a page, and what is on it.
// Used by scripts/seo-pages.mjs at build time; the app shows the same data
// (dist/data/near/<slug>.json) with src/pages/TreksNear.jsx.
//
// A town only gets a page when it has real, distinct content — a site full of
// near-identical "treks near X" pages is what Google's spam rules call doorway
// pages, and that would pull the whole site down:
//   - at least MIN_TREKS treks with a known position within the radius (the
//     radius grows from 150 to 600 km until there are enough);
//   - a smaller town next to a bigger one with (almost) the same treks is left
//     out: the bigger town's page serves both;
//   - pages are released in waves, biggest towns first (WAVE_*), so Google sees
//     a steadily growing site, not thousands of new pages on one day.
// Trek positions: the SEO bot's verified positions (TREK_GEO_FILE, see
// seo-bot/bot/trek_geo.py); the admin's coordinates only when that file is missing.
import { readFile } from 'node:fs/promises';

export const NEAR_BASE = '/treks-near';
const RADII = [150, 250, 400, 600];
// Smaller towns need treks really near them; a metro may list treks further away.
const MAX_RADIUS = (pop) => (pop >= 1e6 ? 600 : pop >= 1e5 ? 400 : 250);
const MIN_TREKS = 3;
const ENOUGH_TREKS = 5;          // stop growing the radius once there are this many
const MAX_LISTED = 24;
const MERGE_KM = 60;             // a town closer than this to a bigger one whose page...
const MERGE_OVERLAP = 0.75;      // ...already lists this share of its treks gets no page of its own
const NEARBY_TOWNS = 6;
const WAVE_START = '2026-10-15';
const WAVE_FIRST = 150;
const WAVE_PER_WEEK = 100;

export function km(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * p) / 2) ** 2
    + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(((lon2 - lon1) * p) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Shortest duration in days from "3D/2N,2D/1N", "6 Days" or "5" (nights don't count). */
export function minDays(duration) {
  const text = String(duration ?? '').trim();
  if (/^\d+$/.test(text)) return Number(text);
  const days = [...text.matchAll(/(\d+)\s*D/gi)].map((m) => Number(m[1]));
  return days.length ? Math.min(...days) : null;
}

/** Number of released pages on [date]: grows every week from WAVE_START. */
export function waveSize(date = new Date()) {
  const weeks = Math.floor((date - new Date(`${WAVE_START}T00:00:00+05:30`)) / (7 * 864e5));
  return WAVE_FIRST + Math.max(0, weeks) * WAVE_PER_WEEK;
}

export async function loadGeo(file) {
  if (!file) return {};
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    console.warn(`near-pages: no trek positions file (${e.message}); using admin coordinates only`);
    return {};
  }
}

/**
 * treks: website API trek objects; geo: {id: {lat, lon}}; places: [[name, state, lat, lon, population]].
 * Returns { pages: [page data, biggest town first], hub } for the released wave.
 */
export function buildNearPages(treks, geo, places, { date = new Date() } = {}) {
  const located = [];
  const seen = new Set();
  const hasGeo = Object.keys(geo).length > 0;
  for (const t of treks) {
    const id = t.id || t.slug;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    // The bot's file already holds the admin coordinates it could confirm (many were
    // wrong); the admin's own values are only a fallback when there is no file at all.
    const pos = hasGeo ? geo[id] : { lat: Number(t.latitude), lon: Number(t.longitude) };
    const lat = pos?.lat;
    const lon = pos?.lon;
    if (!lat || !lon) continue;
    located.push({
      id,
      name: t.name,
      state: t.state || '',
      lat,
      lon,
      price: t.price_start ?? null,
      duration: t.duration_days ?? '',
      days: minDays(t.duration_days),
      operating_days: t.operating_days || '',
      image: t.main_image || t.images?.[0]?.image_url || null,
    });
  }

  // The biggest town of a name keeps the plain address (/treks-near/aurangabad);
  // others add the state (/treks-near/aurangabad-bihar). Decided over ALL towns,
  // so an address never changes when another town gets a page.
  const biggestOfName = new Map();
  for (const [name, , , , pop] of places) {
    const s = slugify(name);
    if (!biggestOfName.has(s) || biggestOfName.get(s) < pop) biggestOfName.set(s, pop);
  }

  const accepted = [];
  for (const [name, state, lat, lon, pop] of places) { // biggest first
    const dist = located.map((t) => ({ t, d: km(lat, lon, t.lat, t.lon) })).sort((a, b) => a.d - b.d);
    let radius = null;
    const radii = RADII.filter((r) => r <= MAX_RADIUS(pop));
    for (const r of radii) {
      const n = dist.filter((x) => x.d <= r).length;
      if (n >= ENOUGH_TREKS || (r === radii.at(-1) && n >= MIN_TREKS)) {
        radius = r;
        break;
      }
    }
    if (!radius) continue;
    const within = dist.filter((x) => x.d <= radius);
    const ids = new Set(within.map((x) => x.t.id));
    // Share of THIS town's treks (not of both lists): a suburb's shorter list is
    // usually all inside its city's longer one (Gajuwaka in Visakhapatnam's).
    const twin = accepted.find((a) => km(lat, lon, a.lat, a.lon) <= MERGE_KM
      && [...ids].filter((i) => a.ids.has(i)).length / ids.size >= MERGE_OVERLAP);
    if (twin) continue;
    const base = slugify(name);
    const slug = biggestOfName.get(base) === pop ? base : `${base}-${slugify(state)}`;
    if (accepted.some((a) => a.slug === slug)) continue;
    accepted.push({ slug, name, state, lat, lon, pop, radius, ids, within });
  }

  const released = accepted.slice(0, waveSize(date));
  const pages = released.map((c) => ({
    slug: c.slug,
    path: `${NEAR_BASE}/${c.slug}`,
    name: c.name,
    state: c.state,
    radius: c.radius,
    total: c.within.length,
    treks: c.within.slice(0, MAX_LISTED).map(({ t, d }) => ({
      id: t.id,
      name: t.name,
      state: t.state,
      km: Math.round(d / 5) * 5 || 5,
      price: t.price,
      duration: t.duration,
      days: t.days,
      operating_days: t.operating_days,
      image: t.image,
    })),
    nearby: released
      .filter((o) => o !== c)
      .map((o) => ({ slug: o.slug, name: o.name, km: Math.round(km(c.lat, c.lon, o.lat, o.lon)) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, NEARBY_TOWNS),
  }));

  const byState = {};
  for (const p of pages) (byState[p.state || 'Other'] ||= []).push({ slug: p.slug, name: p.name, total: p.total });
  const hub = {
    path: NEAR_BASE,
    cities: pages.length,
    treks: located.length,
    states: Object.keys(byState).sort().map((state) => ({
      state,
      cities: byState[state].sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
  return { pages, hub, candidates: accepted.length };
}
