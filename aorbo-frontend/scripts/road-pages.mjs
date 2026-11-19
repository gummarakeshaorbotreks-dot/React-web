// Route guides (SEO plan phase 3, 19 Nov 2026): /routes/<city>-to-<trek>, the way people search
// ("bangalore to kudremukh distance", "pune to rajgad fort distance" - both seen in Search Console).
//
// Only real road data: the distance and driving time come from OSRM (OpenStreetMap routing, free),
// fetched by the SEO bot (seo-bot/bot/roads.py) for the pairs this build lists in
// /data/road-candidates.json, and saved on the web server (data/road-routes.json, ROAD_ROUTES_FILE).
// A pair without a road answer - or whose trek point is more than 5 km from any road, so the route
// would end somewhere else - gets no page. Treks only (same rules as compare pages: no tours, no
// listings the team must still confirm, no thin pages), with 4+ facts, within a weekend's reach of
// one of the big cities people travel from.
import { readFile } from 'node:fs/promises';
import { organisersOf } from '../src/seo/meta.js';
import { factCount } from '../src/seo/trekFacts.js';
import { km, slugify } from './near-pages.mjs';

export const ROAD_BASE = '/routes';
// [name in the places file, the name people type]
export const ROAD_CITIES = [['Bengaluru', 'Bangalore'], ['Mumbai', 'Mumbai'], ['Pune', 'Pune'], ['Hyderabad', 'Hyderabad'],
  ['Chennai', 'Chennai'], ['Delhi', 'Delhi'], ['Kolkata', 'Kolkata'], ['Ahmedabad', 'Ahmedabad']];
const MAX_LINE_KM = 400;   // straight line: a weekend's reach
const MAX_ROAD_KM = 650;
const MAX_SNAP_KM = 5;     // trek point -> nearest road
const PER_CITY = 20;
const MIN_FACTS = 4;
const round5 = (n) => Math.round(n / 5) * 5;
// Names a departure city can carry in the listings.
const CITY_NAMES = { Bangalore: ['bangalore', 'bengaluru'], Mumbai: ['mumbai', 'bombay'], Delhi: ['delhi', 'new delhi'] };

export const roadKey = (citySlug, trekKey) => `${citySlug}|${trekKey}`;

// OSRM's car times assume free-flowing roads and come out far too short in India (Bangalore to
// Kudremukh: 4.7 h vs about 7 h in practice). Shown: the slower of OSRM's time and the distance at an
// average 50 km/h - highways, ghat roads and traffic - and the page says so.
export const AVG_KMPH = 50;
export const driveMinutes = (r) => Math.round(Math.max(r.min, (r.km / AVG_KMPH) * 60));

/** The bot's road data (web server data/road-routes.json); missing or broken = no route pages, never a failed build. */
export async function loadRoads(file) {
  if (!file) return { pairs: {} };
  try {
    const d = JSON.parse(await readFile(file, 'utf8'));
    return d && typeof d.pairs === 'object' && d.pairs ? d : { pairs: {} };
  } catch (e) {
    console.warn(`road-pages: no road data (${e.code || e.message}); route guides skipped`);
    return { pairs: {} };
  }
}

function cityList(places) {
  return ROAD_CITIES.map(([name, display]) => {
    const p = places.find((x) => x[0] === name);
    return p ? { name, display, slug: slugify(display), lat: p[2], lon: p[3] } : null;
  }).filter(Boolean);
}

const eligible = (e) => e.lat != null && factCount(e.facts) >= MIN_FACTS;

/**
 * One route per summit: listings of one peak ("Visapur Fort", "Visapur and Lohagad", "Rajmachi and
 * Visapur") are one trip to drive to. The shortest name leads (the one people search); the page
 * offers every package of the group.
 */
export function summitGroups(entries) {
  const groups = new Map();
  for (const e of entries.filter(eligible)) {
    const g = e.facts.peak || e.key;
    const list = groups.get(g) || [];
    list.push(e);
    groups.set(g, list);
  }
  return [...groups.values()].map((list) => {
    const [lead, ...rest] = [...list].sort((a, b) => a.name.length - b.name.length || a.key.localeCompare(b.key));
    if (!rest.length) return lead;
    const prices = list.map((e) => e.price).filter((p) => p != null);
    return {
      ...lead,
      listings: list.flatMap((e) => e.listings),
      departures: list.flatMap((e) => e.departures),
      organisers: [...new Set(list.flatMap((e) => e.organisers || []))],
      price: prices.length ? Math.min(...prices) : lead.price,
      groupKeys: list.map((e) => e.key),
    };
  });
}

/** The city -> trek pairs a route could be shown for (the bot fetches their road data). */
export function roadCandidates(entries, places) {
  const out = [];
  for (const c of cityList(places)) {
    for (const e of summitGroups(entries)) {
      const line = km(c.lat, c.lon, e.lat, e.lon);
      if (line > MAX_LINE_KM || line < 30) continue;
      out.push({ key: roadKey(c.slug, e.key), from: [round6(c.lat), round6(c.lon)], to: [round6(e.lat), round6(e.lon)] });
    }
  }
  return out;
}
const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** A road answer that can be shown: a real distance, and a trek point close to a road. */
export function usableRoad(r) {
  return Boolean(r && r.km > 0 && r.km <= MAX_ROAD_KM && r.min > 0 && (r.snap_km ?? 99) <= MAX_SNAP_KM);
}

const side = (e) => ({
  key: e.key, name: e.name, state: e.state, facts: e.facts, price: e.price, days: e.days, image: e.image, organisers: e.organisers,
  link: e.listings[0]?.id || null,
  listings: e.listings.map(({ id, name, price, duration, operating_days, image }) => ({ id, name, price, duration, operating_days, image })),
});

/**
 * entries: trekEntries() (scripts/fact-pages.mjs); places: India towns; roads: { pairs: { key: {km, min, via, snap_km} } };
 * tripPages: "<destination> trip from <city>" pages (scripts/route-pages.mjs), linked when they exist.
 */
export function buildRoadPages(entries, places, roads, tripPages = []) {
  const pairs = roads?.pairs || {};
  const cities = cityList(places);
  const pages = [];
  for (const c of cities) {
    const names = CITY_NAMES[c.display] || [c.display.toLowerCase()];
    const list = [];
    for (const e of summitGroups(entries)) {
      const r = pairs[roadKey(c.slug, e.key)];
      if (!usableRoad(r)) continue;
      const line = km(c.lat, c.lon, e.lat, e.lon);
      if (line > MAX_LINE_KM) continue;
      const ids = new Set(e.listings.map((l) => l.id));
      const departures = e.departures
        .filter((d) => names.includes(String(d.city || '').trim().toLowerCase()))
        .map((d) => ({ listing: d.listing, pickup: d.pickup_point || '', time: d.departure_time || '', price: Number(d.price_from), operator: organisersOf({ operators: [d.operator] })[0] || null }))
        .sort((a, b) => a.price - b.price);
      const trip = tripPages.find((p) => names.includes(String(p.city.name).toLowerCase()) && p.departures.some((d) => ids.has(d.trek)));
      list.push({
        slug: `${c.slug}-to-${slugify(e.name)}`,
        city: { name: c.display, slug: c.slug },
        trek: side(e),
        road: { km: round5(r.km), min: driveMinutes(r), via: r.via || '' },
        line_km: round5(line),
        departures: departures.slice(0, 8),
        trip: trip ? { path: trip.path, title: `${trip.destination.name} trip from ${trip.city.display}` } : null,
      });
    }
    list.sort((a, b) => a.road.km - b.road.km);
    for (const p of list.slice(0, PER_CITY)) pages.push({ ...p, path: `${ROAD_BASE}/${p.slug}`, title: `${c.display} to ${p.trek.name}` });
  }
  // Same slug twice (two treks with one name): keep the nearer.
  const seen = new Set();
  const unique = pages.filter((p) => (seen.has(p.slug) ? false : seen.add(p.slug)));
  for (const p of unique) {
    p.fromCity = unique.filter((o) => o !== p && o.city.slug === p.city.slug)
      .sort((a, b) => Math.abs(a.road.km - p.road.km) - Math.abs(b.road.km - p.road.km))
      .slice(0, 6).map((o) => ({ path: o.path, name: o.trek.name, km: o.road.km }));
    p.toTrek = unique.filter((o) => o !== p && o.trek.key === p.trek.key)
      .map((o) => ({ path: o.path, city: o.city.name, km: o.road.km }));
  }
  const hub = unique.length ? {
    path: ROAD_BASE,
    cities: cities.map((c) => ({
      name: c.display,
      routes: unique.filter((p) => p.city.slug === c.slug).map((p) => ({ path: p.path, name: p.trek.name, km: p.road.km, min: p.road.min })),
    })).filter((c) => c.routes.length),
  } : null;
  return { pages: unique, hub };
}

/** Links from a trek page to its route guides: listing id -> [{ path, title }]. */
export function roadLinks(pages) {
  const out = new Map();
  for (const p of pages) {
    for (const l of p.trek.listings) {
      const v = out.get(l.id) || [];
      v.push({ path: p.path, title: `${p.title} by road`, km: p.road.km });
      out.set(l.id, v);
    }
  }
  return out;
}
