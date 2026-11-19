// npm run test:unit - SEO plan phase 3 (19 Nov 2026): route guides /routes/<city>-to-<trek>.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadPages, driveMinutes, roadCandidates, roadKey, roadLinks, summitGroups, usableRoad } from './road-pages.mjs';
import { driveText, roadFaqs, roadSummary, viaText } from '../src/seo/roadPages.js';

const places = [['Bengaluru', 'Karnataka', 12.9716, 77.5946, 8e6], ['Mumbai', 'Maharashtra', 19.076, 72.8777, 1.2e7]];
const facts = { name: 'Kudremukh', altitude_m: 1894, difficulty: 'moderate', months: [10, 11, 12, 1], start: 'Mullodi', rail: 'Mangaluru Central', airport: 'Mangaluru International Airport' };
const entry = (key, name, lat, lon, f = facts, departures = []) => ({
  key, name, facts: { ...f, name }, state: 'Karnataka', lat, lon, price: 3999, days: { min: 2, max: 2 }, image: null, organisers: ['Blue Ridge'],
  listings: [{ id: `${key}-trek`, name: `${name} Trek`, price: 3999, duration: '2D/1N', operating_days: 'Fri', image: null }], departures,
});
const kud = entry('kudremukh', 'Kudremukh', 13.2208, 75.2524, facts, [
  { listing: 'kudremukh-trek', city: 'Bengaluru', pickup_point: 'Majestic', departure_time: '21:30', price_from: 4299, operator: 'Blue Ridge' },
  { listing: 'kudremukh-trek', city: 'Mysuru', pickup_point: 'Bus stand', departure_time: '22:00', price_from: 3999, operator: 'Blue Ridge' },
]);
const thin = entry('thin', 'Thin Hill', 13.3, 77.7, { name: 'Thin Hill', difficulty: 'easy' });
const off = entry('offroad', 'Off Road Peak', 13.0, 76.0);

test('candidates: big cities within a weekend, treks with 4+ facts only', () => {
  const keys = roadCandidates([kud, thin, off], places).map((c) => c.key);
  assert.deepEqual(keys.sort(), ['bangalore|kudremukh', 'bangalore|offroad']);  // Mumbai is > 400 km; thin has 1 fact
});

test('a page only with a real road answer near the trek; departures from that city; links', () => {
  const roads = { pairs: {
    [roadKey('bangalore', 'kudremukh')]: { km: 331.2, min: 381, via: 'NH75, NH73', snap_km: 0.8 },
    [roadKey('bangalore', 'offroad')]: { km: 210, min: 250, via: '', snap_km: 9.5 },   // trek point 9.5 km off a road
  } };
  const trip = { path: '/destinations/kudremukh/from-bangalore', city: { name: 'Bengaluru', display: 'Bangalore' }, destination: { name: 'Kudremukh' }, departures: [{ trek: 'kudremukh-trek' }] };
  const { pages, hub } = buildRoadPages([kud, thin, off], places, roads, [trip]);
  assert.equal(pages.length, 1);
  const p = pages[0];
  assert.equal(p.path, '/routes/bangalore-to-kudremukh');
  assert.deepEqual(p.road, { km: 330, min: 397, via: 'NH75, NH73' });  // 331 km at 50 km/h beats OSRM's 381 min
  assert.equal(p.departures.length, 1);          // the Bengaluru pickup, not Mysuru
  assert.equal(p.departures[0].pickup, 'Majestic');
  assert.equal(p.trip.path, trip.path);
  assert.equal(hub.cities[0].routes[0].name, 'Kudremukh');
  assert.equal(roadLinks(pages).get('kudremukh-trek')[0].path, p.path);
  assert.equal(usableRoad({ km: 900, min: 600, snap_km: 1 }), false);
  assert.deepEqual(buildRoadPages([kud], places, { pairs: {} }).pages, []);
});

test('text says only what the data holds', () => {
  assert.equal(driveText(381), 'about 6 h 20 min');
  assert.equal(driveText(44), 'about 40 min');
  assert.equal(driveText(120), 'about 2 h');
  assert.equal(viaText('NH75, NH73'), 'NH 75 and NH 73');
  assert.equal(viaText(''), '');
  const page = buildRoadPages([kud], places, { pairs: { 'bangalore|kudremukh': { km: 331, min: 381, via: 'NH75', snap_km: 1 } } }).pages[0];
  const s = roadSummary(page).join(' ');
  assert.match(s, /about 330 km from Bangalore by road, about 6 h 40 min of driving via NH 75/);
  assert.match(s, /Mangaluru Central/);
  assert.match(s, /₹4,299/);
  const qs = roadFaqs(page).map((f) => f.q);
  assert.ok(qs.includes('How far is Kudremukh from Bangalore?'));
  assert.ok(qs.includes('Is there a trek package to Kudremukh from Bangalore?'));
  assert.ok(!/bus|train timing/i.test(roadFaqs(page).map((f) => f.a).join(' ')));
});

test('driving time is never faster than 50 km/h; one route per summit', () => {
  assert.equal(driveMinutes({ km: 100, min: 90 }), 120);
  assert.equal(driveMinutes({ km: 95, min: 186 }), 186);   // a slow track: OSRM's own time
  const peak = { ...facts, peak: 'visapur' };
  const groups = summitGroups([entry('visapur-lohagad', 'Visapur and Lohagad', 18.7, 73.5, peak), entry('visapur', 'Visapur Fort', 18.7, 73.5, peak), kud]);
  assert.deepEqual(groups.map((g) => g.name).sort(), ['Kudremukh', 'Visapur Fort']);
  assert.equal(groups.find((g) => g.name === 'Visapur Fort').listings.length, 2);
});
