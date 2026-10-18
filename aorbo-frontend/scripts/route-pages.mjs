// "<destination> trip from <city>" pages (/destinations/<place>/from-<city>), the way
// people search: "gokarna trip from hyderabad", "coorg trip from bangalore" (research
// 18 Oct 2026: Desktop\Aorbo-Search-Research\FINDINGS.md).
//
// Built only from real departures entered in the admin ("Departure cities" on a trek:
// city, pickup point, departure time, price from that city). Every page therefore has
// facts of its own: where to board in that city, when, and what it costs from there.
// No departures, no page: near-identical "trip from X" pages without them are doorway
// pages to Google and would pull the whole site down (playbook, section I).
import { POPULAR_CITY_NAME, organisersOf } from '../src/seo/meta.js';
import { km, minDays, slugify } from './near-pages.mjs';

// The name people type ("Bangalore"): one list for every page, in src/seo/meta.js.
export const POPULAR_NAME = POPULAR_CITY_NAME;
// A "trip from" a town that is (next to) the place itself is not a trip from anywhere.
const MIN_KM = 40;

const key = (s) => String(s || '').trim().toLowerCase();

/**
 * destPages: built destination pages (scripts/destination-pages.mjs, with lat/lon);
 * treks: website API trek details (with `departures`); places: India towns
 * [[name, state, lat, lon, population]]; nearPages: released "Treks near <city>" pages.
 * Returns { pages } and adds `routes` to the destination and city pages they link from.
 */
export function buildRoutePages(destPages, treks, places, nearPages = []) {
  const byId = new Map(treks.map((t) => [t.id || t.slug, t]));
  const town = new Map(places.map((p) => [key(p[0]), p]));
  const nearBySlug = new Map(nearPages.map((p) => [p.slug, p]));
  const pages = [];

  for (const dest of destPages) {
    if (dest.kind === 'state') continue;
    const byCity = new Map();
    for (const item of dest.treks) {
      const trek = byId.get(item.id);
      for (const d of trek?.departures || []) {
        if (!d || !d.city || !d.pickup_point || !d.departure_time || !(Number(d.price_from) > 0)) continue;
        const list = byCity.get(d.city) || [];
        list.push({
          trek: item.id,
          name: item.name,
          duration: item.duration,
          days: item.days,
          image: item.image,
          pickup: d.pickup_point,
          time: d.departure_time,
          price: Number(d.price_from),
          departs: d.days || item.operating_days || '',
          operator: organisersOf({ operators: [d.operator] })[0] || organisersOf({ operators: item.operators })[0] || null,
        });
        byCity.set(d.city, list);
      }
    }
    for (const [city, departures] of byCity) {
      const place = town.get(key(city));
      const distance = place && dest.lat != null ? Math.round(km(dest.lat, dest.lon, place[2], place[3]) / 5) * 5 : null;
      if (distance != null && distance < MIN_KM) continue;
      const display = POPULAR_NAME[city] || city;
      const citySlug = slugify(display);
      departures.sort((a, b) => a.price - b.price || a.time.localeCompare(b.time));
      const nearSlug = slugify(city);
      pages.push({
        slug: `${dest.slug}--${citySlug}`,
        path: `/destinations/${dest.slug}/from-${citySlug}`,
        destination: { slug: dest.slug, name: dest.name, state: dest.state },
        city: { name: city, display, state: place ? place[1] : '', km: distance },
        departures,
        near: nearBySlug.has(nearSlug) ? nearSlug : null,
      });
    }
  }

  // Links between them: other cities to the same place, other places from the same city.
  for (const p of pages) {
    p.otherCities = pages
      .filter((o) => o !== p && o.destination.slug === p.destination.slug)
      .map((o) => ({ path: o.path, city: o.city.display, price: Math.min(...o.departures.map((d) => d.price)) }));
    p.otherPlaces = pages
      .filter((o) => o !== p && o.city.name === p.city.name)
      .map((o) => ({ path: o.path, name: o.destination.name, price: Math.min(...o.departures.map((d) => d.price)) }));
  }
  // The destination page lists its "trip from" pages; a city page lists the trips leaving from it.
  for (const dest of destPages) {
    dest.routes = pages
      .filter((p) => p.destination.slug === dest.slug)
      .map((p) => ({ path: p.path, city: p.city.display, price: Math.min(...p.departures.map((d) => d.price)) }))
      .sort((a, b) => a.city.localeCompare(b.city));
  }
  for (const near of nearPages) {
    near.routes = pages
      .filter((p) => p.near === near.slug)
      .map((p) => ({ path: p.path, name: p.destination.name, price: Math.min(...p.departures.map((d) => d.price)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return { pages };
}

/** Days of the shortest package on a route page (for the FAQ). */
export const routeDays = (page) => {
  const days = page.departures.map((d) => d.days ?? minDays(d.duration)).filter((d) => d != null);
  return days.length ? { min: Math.min(...days), max: Math.max(...days) } : null;
};
