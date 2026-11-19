// Page families built on the trek facts (SEO plan phase 2, 19 Nov 2026; scripts/data/trek-facts.json):
//   - /compare/<a>-vs-<b>: two nearby treks in the same state, side by side (height, trail,
//     difficulty, season, how to reach, days, price). Only treks with full facts; each trek is
//     paired with its 3 nearest, so every page answers a real "X or Y?" question.
//   - /compare/<trek>-organisers: the organisers running the same trek, side by side - only once
//     2+ organisers have real departures for it (price, city, days), never empty.
//   - /collections/treks-in-<month>: treks in season that month (6+ treks).
//   - /collections/<theme>-treks-in-<state> or -near-<city>: fort, snow, monsoon, night, sunrise,
//     waterfall and easy treks (4+ treks).
// Only treks (scripts/listing-kind.mjs), never tours; listings the team still has to confirm
// (review: true) and thin pages stay out. Everything shown is computed from the facts and the
// live listings - no page states a thing the data does not hold (the Cleartrip trap: empty pages).
import { organisersOf } from '../src/seo/meta.js';
import { DIFFICULTY_RANK, MONTHS, monthSlug } from '../src/seo/trekFacts.js';
import { km, minDays, slugify } from './near-pages.mjs';

export const COMPARE_BASE = '/compare';
export const COLLECTION_BASE = '/collections';
const PAIR_MAX_KM = 250;
const PAIRS_PER_TREK = 3;
const MIN_MONTH = 6;
const MIN_THEME = 4;
const NEAR_CITY_KM = 200;
// Cities a trek's distance is given from (display names); the big ones also name collections
// the way people search ("night treks near bangalore"), never "near Dehradun".
const METROS = [['Bengaluru', 'Bangalore'], ['Mumbai', 'Mumbai'], ['Pune', 'Pune'], ['Hyderabad', 'Hyderabad'], ['Chennai', 'Chennai'],
  ['Delhi', 'Delhi'], ['Kolkata', 'Kolkata'], ['Ahmedabad', 'Ahmedabad'], ['Dehradun', 'Dehradun'], ['Siliguri', 'Siliguri'], ['Chandigarh', 'Chandigarh']];
const SEARCH_CITIES = new Set(['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai', 'Delhi', 'Kolkata', 'Ahmedabad']);
export const THEMES = [
  { id: 'snow', label: 'Snow treks', test: (f) => f.themes?.includes('snow') },
  { id: 'monsoon', label: 'Monsoon treks', test: (f) => f.months?.includes(7) && f.months?.includes(8) },
  { id: 'waterfall', label: 'Waterfall treks', test: (f) => f.themes?.includes('waterfall') },
  { id: 'fort', label: 'Fort treks', test: (f) => f.themes?.includes('fort') },
  { id: 'night', label: 'Night treks', test: (f) => f.themes?.includes('night') },
  { id: 'sunrise', label: 'Sunrise treks', test: (f) => f.themes?.includes('sunrise') },
  { id: 'easy', label: 'Easy treks for beginners', slug: 'easy-treks', test: (f) => DIFFICULTY_RANK[f.difficulty] <= 1 },
];

const firstState = (s) => String(s || '').split(',')[0].trim();
// Words that do not make two treks the same ("Rajgad Fort" and "Harihar Fort" are different).
const COMMON = new Set(['and', 'the', 'to', 'of', 'fort', 'forts', 'peak', 'hills', 'hill', 'betta', 'trek', 'lake', 'waterfall', 'waterfalls', 'side']);
const words = (name) => new Set(String(name).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !COMMON.has(w)));
/** Same trek under two names ("Rajgad Fort" / "Rajgad to Torna", "Kumara Parvatha" / "Pushpagiri"): never compared. */
export function sameTrek(a, b) {
  if (a.facts.peak && a.facts.peak === b.facts.peak) return true;
  const wa = words(a.name);
  return [...words(b.name)].some((w) => wa.has(w));
}
let metros = [];
const rich = (f) => Boolean(f.altitude_m && f.difficulty && f.months?.length && (f.start || f.district));
const round5 = (n) => Math.round(n / 5) * 5;

/**
 * One entry per real trek, from the listings that may appear on these pages.
 * listings: website API trek objects (already filtered: treks, not review, not thin), each with
 * `facts` ({ key, ...}); geo: { id: {lat, lon} }; places: India towns.
 */
export function trekEntries(listings, geo, places) {
  metros = METROS.map(([name, display]) => {
    const p = places.find((x) => x[0] === name);
    return p ? { name: display, lat: p[2], lon: p[3] } : null;
  }).filter(Boolean);
  const byKey = new Map();
  for (const t of listings) {
    const { key, ...facts } = t.facts;
    const id = t.id || t.slug;
    const e = byKey.get(key) || { key, name: facts.name, facts, state: firstState(t.state), lat: null, lon: null, listings: [], departures: [] };
    const pos = geo[id] || (t.latitude != null ? { lat: Number(t.latitude), lon: Number(t.longitude) } : null);
    if (e.lat == null && pos?.lat && pos?.lon) Object.assign(e, { lat: pos.lat, lon: pos.lon });
    e.listings.push({
      id,
      name: t.name,
      state: t.state || '',
      price: t.price_start ?? null,
      duration: t.duration_days ?? '',
      days: minDays(t.duration_days),
      operating_days: t.operating_days || '',
      operators: organisersOf(t),
      image: t.main_image || t.images?.[0]?.image_url || null,
    });
    for (const d of t.departures || []) if (d && Number(d.price_from) > 0) e.departures.push({ ...d, listing: id });
    byKey.set(key, e);
  }
  for (const e of byKey.values()) {
    e.listings.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    const prices = e.listings.map((l) => l.price).filter((p) => p != null && p > 0);
    e.price = prices.length ? Math.min(...prices) : null;
    const days = e.listings.map((l) => l.days).filter((d) => d != null);
    e.days = days.length ? { min: Math.min(...days), max: Math.max(...days) } : null;
    e.image = e.listings.find((l) => l.image)?.image || null;
    e.organisers = [...new Set(e.listings.flatMap((l) => l.operators))];
    e.city = e.lat == null ? null : metros
      .map((m) => ({ name: m.name, km: round5(km(e.lat, e.lon, m.lat, m.lon)) }))
      .sort((a, b) => a.km - b.km)[0] || null;
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// What a page shows of a trek (not the whole listing objects).
const side = (e) => ({
  key: e.key, name: e.name, state: e.state, facts: e.facts, price: e.price, days: e.days, image: e.image,
  organisers: e.organisers, city: e.city, listings: e.listings.map(({ id, name, price, duration, operating_days, image }) => ({ id, name, price, duration, operating_days, image })),
});

/** "X vs Y" pages and "<trek>: compare organisers" pages. */
export function buildComparePages(entries) {
  const pages = [];
  const seen = new Set();
  // Listings of one summit (Visapur alone / with Lohagad / with Rajmachi) count once per pair.
  const group = (e) => e.facts.peak || e.key;
  const full = entries.filter((e) => rich(e.facts) && e.lat != null);
  for (const a of full) {
    const near = full
      .filter((b) => b !== a && b.state === a.state && !sameTrek(a, b))
      .map((b) => ({ b, d: km(a.lat, a.lon, b.lat, b.lon) }))
      .filter((x) => x.d <= PAIR_MAX_KM)
      .sort((x, y) => x.d - y.d)
      .slice(0, PAIRS_PER_TREK);
    for (const { b, d } of near) {
      const [x, y] = [a, b].sort((p, q) => p.key.localeCompare(q.key));
      const slug = `${x.key}-vs-${y.key}`;
      const pair = [group(a), group(b)].sort().join('|');
      if (seen.has(pair)) continue;
      seen.add(pair);
      pages.push({ kind: 'pair', slug, path: `${COMPARE_BASE}/${slug}`, title: `${x.name} vs ${y.name}`, a: side(x), b: side(y), km: round5(d) });
    }
  }
  // Organisers of the same trek: only from real departures (price, city, days from the admin / app).
  for (const e of entries) {
    const byOrg = new Map();
    for (const d of e.departures) {
      const org = organisersOf({ operators: [d.operator] })[0];
      if (!org) continue;
      const row = byOrg.get(org) || { name: org, price: null, cities: new Set(), days: new Set() };
      row.price = row.price == null ? Number(d.price_from) : Math.min(row.price, Number(d.price_from));
      if (d.city) row.cities.add(d.city);
      for (const day of String(d.days || '').split(',').map((s) => s.trim()).filter(Boolean)) row.days.add(day);
      byOrg.set(org, row);
    }
    if (byOrg.size < 2) continue;
    const slug = `${e.key}-organisers`;
    pages.push({
      kind: 'organisers',
      slug,
      path: `${COMPARE_BASE}/${slug}`,
      title: `${e.name}: compare organisers`,
      a: side(e),
      organisers: [...byOrg.values()].sort((p, q) => p.price - q.price)
        .map((r) => ({ name: r.name, slug: slugify(r.name), price: r.price, cities: [...r.cities].sort(), days: [...r.days] })),
    });
  }
  // Each pair page links to the other comparisons of its two treks.
  for (const p of pages) {
    const keys = new Set([p.a.key, p.b?.key].filter(Boolean));
    p.others = pages.filter((o) => o !== p && (keys.has(o.a.key) || keys.has(o.b?.key))).map((o) => ({ path: o.path, title: o.title }));
  }
  return { pages };
}

// What a collection lists of each trek.
const item = (e) => ({
  key: e.key, name: e.name, state: e.state, link: e.listings[0].id, price: e.price, days: e.days, image: e.image, city: e.city,
  altitude_m: e.facts.altitude_m ?? null, difficulty: e.facts.difficulty ?? null, months: e.facts.months || [], themes: e.facts.themes || [],
  listings: e.listings.map(({ id, name, price, duration, operating_days, image, state }) => ({ id, name, price, duration, operating_days, image, state })),
});

/** Month and theme collections, and the /collections index (which also lists the compare pages). */
export function buildCollectionPages(entries, comparePages = []) {
  const pages = [];
  for (let m = 1; m <= 12; m++) {
    const list = entries.filter((e) => e.facts.months?.includes(m));
    if (list.length < MIN_MONTH) continue;
    const prev = m === 1 ? 12 : m - 1;
    const next = m === 12 ? 1 : m + 1;
    const states = [...new Set(list.map((e) => e.state))];
    const byState = (s) => list.filter((e) => e.state === s).length;
    states.sort((a, b) => byState(b) - byState(a) || a.localeCompare(b));
    pages.push({
      kind: 'month',
      month: m,
      slug: `treks-in-${monthSlug(m)}`,
      path: `${COLLECTION_BASE}/treks-in-${monthSlug(m)}`,
      title: `Treks in ${MONTHS[m - 1]}`,
      states,
      treks: list
        .sort((a, b) => states.indexOf(a.state) - states.indexOf(b.state) || (b.facts.altitude_m || 0) - (a.facts.altitude_m || 0) || a.name.localeCompare(b.name))
        .map(item),
      starting: list.filter((e) => !e.facts.months.includes(prev)).map((e) => e.name),
      ending: list.filter((e) => !e.facts.months.includes(next)).map((e) => e.name),
    });
  }
  for (const theme of THEMES) {
    const byState = new Map();
    for (const e of entries) if (theme.test(e.facts)) byState.set(e.state, [...(byState.get(e.state) || []), e]);
    for (const [state, list] of byState) {
      if (list.length < MIN_THEME || !state) continue;
      // All of them within reach of one big city: named the way people search ("near Bangalore").
      const near = list.every((e) => e.lat != null) ? metros
        .filter((m) => SEARCH_CITIES.has(m.name))
        .map((m) => ({ name: m.name, far: Math.max(...list.map((e) => km(e.lat, e.lon, m.lat, m.lon))) }))
        .filter((m) => m.far <= NEAR_CITY_KM)
        .sort((a, b) => a.far - b.far)[0]?.name || null : null;
      const where = near ? `near ${near}` : `in ${state}`;
      // On a "near <city>" page every distance is from that city.
      const city = near && metros.find((m) => m.name === near);
      const shown = city ? list.map((e) => ({ ...e, city: { name: near, km: round5(km(e.lat, e.lon, city.lat, city.lon)) } })) : list;
      const slug = `${theme.slug || `${theme.id}-treks`}-${slugify(where)}`;
      pages.push({
        kind: 'theme',
        theme: theme.id,
        slug,
        path: `${COLLECTION_BASE}/${slug}`,
        title: `${theme.label} ${where}`,
        state,
        near,
        treks: shown
          .sort((a, b) => (a.city?.km ?? 1e9) - (b.city?.km ?? 1e9) || a.name.localeCompare(b.name))
          .map(item),
      });
    }
  }
  // Links between collections: the months next to a month; the other themes of the same state.
  for (const p of pages) {
    p.related = pages
      .filter((o) => o !== p && (p.kind === 'month' ? o.kind === 'month' : o.kind === 'theme' && o.state === p.state))
      .map((o) => ({ path: o.path, title: o.title, count: o.treks.length }));
  }
  const hub = {
    path: COLLECTION_BASE,
    months: pages.filter((p) => p.kind === 'month').map((p) => ({ path: p.path, title: p.title, count: p.treks.length })),
    themes: pages.filter((p) => p.kind === 'theme').map((p) => ({ path: p.path, title: p.title, count: p.treks.length, state: p.state }))
      .sort((a, b) => a.state.localeCompare(b.state) || a.title.localeCompare(b.title)),
    compare: comparePages.map((p) => ({ path: p.path, title: p.title, state: p.a.state }))
      .sort((a, b) => a.state.localeCompare(b.state) || a.title.localeCompare(b.title)),
  };
  return { pages, hub };
}

/** For each listing id: the compare pages and theme collections it is on (trek page links). */
export function factLinks(entries, comparePages, collectionPages) {
  const out = new Map();
  const add = (key, kind, link) => {
    const e = entries.find((x) => x.key === key);
    for (const l of e?.listings || []) {
      const v = out.get(l.id) || { compare: [], collections: [] };
      if (!v[kind].some((x) => x.path === link.path)) v[kind].push(link);
      out.set(l.id, v);
    }
  };
  for (const p of comparePages) {
    add(p.a.key, 'compare', { path: p.path, title: p.title });
    if (p.b) add(p.b.key, 'compare', { path: p.path, title: p.title });
  }
  for (const p of collectionPages) for (const t of p.treks) add(t.key, 'collections', { path: p.path, title: p.title, kind: p.kind, month: p.month ?? null });
  return out;
}
