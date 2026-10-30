// npm run test:unit — winter treks & snow trips page (season-pages.mjs + meta.js), 30 Oct 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildWinterPage, isWinterTrek, winterSeason, WINTER_PATH } from './season-pages.mjs';
import { winterFaqs, winterMeta } from '../src/seo/meta.js';

// Shapes and words as the live website API sends them (30 Oct 2026).
const trek = (id, name, state, price, duration, activities, famous_places = []) => ({
  id, name, state, price_start: price, duration_days: duration, operating_days: 'Fri, Sat', activities: String(activities), famous_places: String(famous_places), main_image: null,
});
const TREKS = [
  trek('kedarkantha-trek', 'Kedarkantha Trek', 'Uttarakhand', 15000, '3D/2N, 4D/3N, 5D/4N', ['Trekking', 'Snow adventure'], ['Kedarkantha Base Camp', 'Sankri Village']),
  trek('auli-trek', 'Auli Trek', 'Uttarakhand', 12000, '2D', ['Trekking', 'Skiing', 'Winter camping']),
  trek('manali', 'Manali', 'Himachal Pradesh', 1150, '3D/2N, 4D/3N', ['Paragliding', 'Snow activities'], ['Atal Tunnel', 'Rohtang Pass', 'Solang Valley']),
  trek('chopta-trek', 'Chopta Trek', 'Uttarakhand', 8000, '2D/1N', ['Trekking', 'Camping'], ['Tungnath Temple', 'Chandrashila Peak']),
  // mention snow, but close or are cut off in winter
  trek('kedarnath-yatra', 'Kedarnath', 'Uttarakhand', 12900, '5D/4N', ['Temple darshan', 'Snow trekking'], ['Kedarnath Trek Route']),
  trek('himalayas', 'Himalayas', 'Multiple States', 12999, '6D/5N', ['Camping', 'Snow adventure'], ['Kedarnath Trek', 'Ladakh Passes']),
  trek('do-dam-yatra', 'Do Dham Yatra', 'Uttarakhand', 12000, '5D/4N', ['Temple darshan'], ['Snow-capped peaks']),
  trek('manali-kasol-kheerganga', 'Manali-Kasol-Kheerganga', 'Himachal Pradesh', 9100, '6D/5N', ['Snow activities'], ['Solang Valley', 'Kheerganga Trek']),
  // no snow at all
  trek('gokarna', 'Gokarna', 'Karnataka', 2999, '2D/1N', ['Beach trek'], ['Om Beach']),
];

test('on the page: a snow activity or a snowy winter place; never a trip that closes in winter', () => {
  const on = TREKS.filter(isWinterTrek).map((t) => t.id);
  assert.deepEqual(on, ['kedarkantha-trek', 'auli-trek', 'manali', 'chopta-trek']);
});

test('the season moves on by itself every July', () => {
  assert.equal(winterSeason(new Date('2026-10-30')), '2026–27');
  assert.equal(winterSeason(new Date('2027-01-15')), '2026–27');
  assert.equal(winterSeason(new Date('2027-06-30')), '2026–27');
  assert.equal(winterSeason(new Date('2027-07-01')), '2027–28');
});

test('snow treks first, then snow trips, then the rest; cheapest first in each', () => {
  const { pages } = buildWinterPage(TREKS, [], new Date('2026-11-01'));
  assert.equal(pages.length, 1);
  const p = pages[0];
  assert.equal(p.path, WINTER_PATH);
  assert.equal(p.season, '2026–27');
  assert.deepEqual(p.treks.map((t) => t.id), ['auli-trek', 'kedarkantha-trek', 'manali', 'chopta-trek']);
  assert.deepEqual(p.states, ['Himachal Pradesh', 'Uttarakhand']);
});

test('the title, description and questions come from the data (no trek named that is not on the page)', () => {
  const p = buildWinterPage(TREKS, [], new Date('2027-08-01')).pages[0];
  const m = winterMeta(p);
  assert.equal(m.title, 'Winter Treks & Snow Trips 2027–28 | Aorbo Treks');
  assert.match(m.description, /^4 winter treks and snow trips for 2027–28 in Himachal Pradesh and Uttarakhand, from ₹1,150 per person: /);
  const faqs = winterFaqs(p);
  assert.equal(faqs[0].a, '4 for the 2027–28 season, including Auli Trek, Kedarkantha Trek, Manali and Chopta Trek.');
  assert.equal(faqs.find((f) => /cost/.test(f.q)).a, 'Starting prices range from ₹1,150 to ₹15,000 per person on Aorbo Treks.');
  // owner's words: no "best / guaranteed / seat"
  assert.doesNotMatch(JSON.stringify(m) + JSON.stringify(faqs), /\b(best|guaranteed|No\.1|seat)\b/i);
});

test('no winter treks → no page (never an empty one)', () => {
  assert.deepEqual(buildWinterPage([TREKS.at(-1)]), { pages: [], hub: null });
});

test('wired in: built, pre-rendered, routed and linked from the footer', () => {
  const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
  assert.match(read('./seo-pages.mjs'), /winter = buildWinterPage\(treks, destinations\.pages\);/);
  assert.match(read('./seo-pages.mjs'), /writeDataPages\('seasons', winter, winterMeta, ssr\.renderWinter, null, null\)/);
  assert.match(read('../src/entry-prerender.jsx'), /export function renderWinter\(page\)/);
  assert.match(read('../src/routes.jsx'), /path: 'winter-treks'/);
  assert.match(read('../src/components/layout/Footer.jsx'), /to: '\/winter-treks'/);
});
