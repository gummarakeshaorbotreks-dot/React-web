// npm run test:unit - SEO plan phase 2 (19 Nov 2026): trek facts, compare pages, collections,
// and the booking-click source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkFacts, factsOf } from './trek-facts.mjs';
import { buildCollectionPages, buildComparePages, sameTrek } from './fact-pages.mjs';
import { isThinListing } from './listing-kind.mjs';
import { factCount, factFaqs, factLine, factRows, monthRange } from '../src/seo/trekFacts.js';
import { compareFaqs, compareReasons, compareSummary, collectionSummary } from '../src/seo/factPages.js';
import { pageKind, playStoreWithSource, sourceOf } from '../src/utils/visitSource.js';

const data = JSON.parse(readFileSync(new URL('./data/trek-facts.json', import.meta.url), 'utf8'));
const kinds = JSON.parse(readFileSync(new URL('./data/listing-kind.json', import.meta.url), 'utf8')).listings;

test('facts file: valid, and only treks carry facts (never a tour)', () => {
  assert.deepEqual(checkFacts(data), []);
  for (const id of Object.keys(data.listings)) assert.equal(kinds[id]?.kind, 'trek', `${id} is not a trek listing`);
  assert.match(checkFacts({ treks: { x: { name: 'X', altitude_m: 38000 } }, listings: {} })[0], /altitude_m/);
  assert.match(checkFacts({ treks: { x: { name: 'X', difficulty: 'hard' } }, listings: {} })[0], /difficulty/);
  assert.match(checkFacts({ treks: {}, listings: { a: 'nope' } })[0], /unknown trek/);
  // Well-known heights, so a slip in the file is caught.
  assert.equal(factsOf({ id: 'kedarkantha-trek' }).altitude_m, 3800);
  assert.equal(factsOf({ id: 'kalsubai-trek' }).altitude_m, 1646);
  assert.equal(factsOf({ id: 'mullyanagiri-peak' }).altitude_m, 1930);
  assert.equal(factsOf({ id: 'sandakphu-trek' }).altitude_m, 3636);
});

test('facts text: months, rows, one line, questions', () => {
  assert.equal(monthRange([12, 1, 2, 3, 4]), 'December to April');
  assert.equal(monthRange([4, 5, 6, 9, 10, 11]), 'April to June and September to November');
  assert.equal(monthRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), 'all year');
  const f = factsOf({ id: 'kedarkantha-trek' });
  const rows = factRows(f);
  assert.equal(rows.find((r) => r.key === 'altitude').value, 'Kedarkantha summit, about 3,800 m (12,470 ft)');
  assert.equal(rows.find((r) => r.key === 'season').value, 'December to April');
  assert.equal(factLine(f), '3,800 m · Easy to moderate · December to April');
  const qs = factFaqs('Kedarkantha', f).map((x) => x.q);
  assert.deepEqual(qs, ['How high is Kedarkantha?', 'How difficult is the Kedarkantha trek?', 'What is the best time for Kedarkantha?', 'How do I reach Kedarkantha?']);
  // Facts are real content: a short description no longer makes the page thin.
  assert.equal(isThinListing({ description: 'Short.' }, factCount(f)), false);
  assert.equal(isThinListing({ description: 'Short.' }, 2), true);
});

const entry = (key, facts, extra = {}) => ({
  key, name: facts.name, facts, state: 'Uttarakhand', lat: 31, lon: 78, price: 10000, days: { min: 3, max: 3 }, image: null,
  organisers: [], city: { name: 'Delhi', km: 300 }, departures: [], listings: [{ id: `${key}-trek`, name: facts.name, price: 10000, duration: '3D/2N', operators: [] }], ...extra,
});

test('compare pages: nearby treks of one state, never the same summit twice', () => {
  const k = entry('kedarkantha', data.treks.kedarkantha, { lat: 31.04, lon: 78.17 });
  const d = entry('dayara-bugyal', data.treks['dayara-bugyal'], { lat: 30.86, lon: 78.55 });
  const far = entry('far', { ...data.treks.auli, name: 'Far' }, { lat: 20, lon: 78 });
  const other = entry('kalsubai', data.treks.kalsubai, { state: 'Maharashtra', lat: 31.05, lon: 78.18 });
  const { pages } = buildComparePages([k, d, far, other]);
  assert.deepEqual(pages.map((p) => p.path), ['/compare/dayara-bugyal-vs-kedarkantha']);
  assert.equal(sameTrek({ name: 'Rajgad Fort', facts: {} }, { name: 'Rajgad to Torna', facts: {} }), true);
  assert.equal(sameTrek({ name: 'Kumara Parvatha', facts: { peak: 'pushpagiri' } }, { name: 'Pushpagiri', facts: { peak: 'pushpagiri' } }), true);
  assert.equal(sameTrek({ name: 'Harihar Fort', facts: {} }, { name: 'Kalsubai', facts: {} }), false);
  // Organiser comparison only with 2+ organisers that have real departures.
  const withDeps = entry('triund', data.treks.triund, { departures: [
    { operator: 'Sparrow Adventures', price_from: 3000, city: 'Delhi', days: 'Fri' },
    { operator: 'we will update soon', price_from: 1000, city: 'Delhi', days: 'Fri' },
  ] });
  assert.equal(buildComparePages([withDeps]).pages.length, 0);
  withDeps.departures.push({ operator: 'Cute Voyages', price_from: 2800, city: 'Chandigarh', days: 'Sat' });
  const org = buildComparePages([withDeps]).pages[0];
  assert.equal(org.path, '/compare/triund-organisers');
  assert.deepEqual(org.organisers.map((o) => o.name), ['Cute Voyages', 'Sparrow Adventures']);
});

test('compare text: stated only from the facts', () => {
  const a = { ...entry('kedarkantha', data.treks.kedarkantha), price: 15000 };
  const b = { ...entry('dayara-bugyal', data.treks['dayara-bugyal']), price: 18000 };
  const page = { kind: 'pair', title: 'Dayara Bugyal vs Kedarkantha', a: b, b: a, km: 45 };
  const s = compareSummary(page).join(' ');
  assert.match(s, /Kedarkantha \(3,800 m\) goes about 200 m higher than Dayara Bugyal \(3,600 m\)/);
  assert.match(s, /Both are rated easy to moderate/);
  assert.match(s, /Both are good from December to April/);
  assert.match(compareFaqs(page).find((f) => /cheaper/.test(f.q)).a, /^Kedarkantha, from ₹15,000/);
  const why = compareReasons(page);
  assert.ok(why.b.includes('a higher summit') && why.b.includes('a lower starting price'));
  assert.ok(why.a.some((r) => /May/.test(r)), 'Dayara Bugyal also runs in May-June and Sep-Nov');
});

test('collections: month pages need 6 treks, themes 4; named the way people search', () => {
  const blr = (key, f, lat, lon) => entry(key, f, { state: 'Karnataka', lat, lon, city: { name: 'Bangalore', km: 50 } });
  const hills = ['skandagiri', 'makalidurga', 'shivagange', 'savandurga', 'madhugiri', 'kunti-betta']
    .map((k, i) => blr(k, data.treks[k], 13.0 + i * 0.1, 77.5));
  const places = JSON.parse(readFileSync(new URL('./data/india-places.json', import.meta.url), 'utf8')).places;
  // trekEntries sets the city list used for "near"; buildCollectionPages reads it from there.
  return import('./fact-pages.mjs').then(({ trekEntries }) => {
    trekEntries([], {}, places);
    const { pages, hub } = buildCollectionPages(hills);
    const dec = pages.find((p) => p.path === '/collections/treks-in-december');
    assert.equal(dec.treks.length, 6);
    assert.equal(pages.some((p) => p.path === '/collections/treks-in-june'), false);
    const fort = pages.find((p) => p.theme === 'fort');
    assert.equal(fort.path, '/collections/fort-treks-near-bangalore');
    assert.equal(fort.title, 'Fort treks near Bangalore');
    assert.match(collectionSummary(dec).join(' '), /^6 treks are in season in December, in Karnataka\./);
    assert.ok(hub.months.length >= 6);
  });
});

test('visit source: search engine and page kind, no personal data', () => {
  assert.equal(sourceOf('https://www.google.co.in/'), 'google');
  assert.equal(sourceOf('https://chatgpt.com/'), 'chatgpt');
  assert.equal(sourceOf('https://aorbotreks.com/treks/x'), 'direct');
  assert.equal(sourceOf(''), 'direct');
  assert.equal(sourceOf('https://example.org/a'), 'other');
  assert.equal(pageKind('/compare/a-vs-b'), 'compare');
  assert.equal(pageKind('/'), 'home');
  assert.equal(
    playStoreWithSource('https://play.google.com/store/apps/details?id=com.aorbotreks.app', { src: 'google', land: 'trek' }),
    'https://play.google.com/store/apps/details?id=com.aorbotreks.app&referrer=utm_source%3Daorbotreks.com%26utm_medium%3Dgoogle%26utm_campaign%3Dtrek',
  );
  assert.equal(playStoreWithSource('https://example.org/', { src: 'google', land: 'trek' }), 'https://example.org/');
});

test('month pages: each month says what it is like, per region on the page', async () => {
  const { monthNotes, regionOf } = await import('../src/seo/monthNotes.js');
  assert.equal(regionOf('Uttarakhand'), 'himalaya');
  assert.equal(regionOf('Goa'), 'sahyadri');
  assert.equal(regionOf('Karnataka'), 'south');
  const notes = new Set();
  for (let m = 1; m <= 12; m++) {
    const n = monthNotes(m, ['Uttarakhand', 'Maharashtra', 'Karnataka']);
    assert.equal(n.length, 3);
    for (const x of n) { assert.ok(x.note.length > 40); notes.add(x.note); }
  }
  assert.equal(notes.size, 36, 'no two months say the same');
  assert.deepEqual(monthNotes(7, ['Maharashtra']).map((x) => x.region), ['sahyadri']);
});

test('position fixes: the facts file corrects a wrong map position', async () => {
  const { positionFixes } = await import('./trek-facts.mjs');
  const fix = positionFixes()['channagiri-hills'];
  assert.ok(fix && fix.lat > 13.3 && fix.lat < 13.5 && fix.lon > 77.6 && fix.lon < 77.7, 'Channagiri Betta is next to Nandi Hills');
  assert.match(checkFacts({ treks: { x: { name: 'X', pos: [51.5, -0.1] } }, listings: {} })[0], /pos/);
});
