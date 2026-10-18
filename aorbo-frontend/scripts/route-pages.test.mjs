// npm run test:unit  — "<destination> trip from <city>" pages (route-pages.mjs + meta.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoutePages } from './route-pages.mjs';
import { routeFaqs, routeHeading, routeMeta } from '../src/seo/meta.js';

const places = [
  ['Hyderabad', 'Telangana', 17.384, 78.4564, 6809970],
  ['Bengaluru', 'Karnataka', 12.9719, 77.5937, 8443675],
  ['Gokarna', 'Karnataka', 14.55, 74.317, 20000],
];
const dest = () => ({
  slug: 'gokarna', name: 'Gokarna', state: 'Karnataka', kind: 'place', lat: 14.55, lon: 74.317, routes: [],
  treks: [
    { id: 'gokarna-dandeli', name: 'Gokarna Dandeli', duration: '3D/2N', days: 3, operating_days: 'Fri', operators: ['Smart Travel Hub'], image: null },
    { id: 'gokarna-beach-trek', name: 'Gokarna Beach Trek', duration: '2D/1N', days: 2, operating_days: 'Sat', operators: [], image: null },
  ],
});
const dep = (city, extra = {}) => ({ city, pickup_point: 'Ameerpet Metro Station', departure_time: '08:30 PM', price_from: 5499, days: 'Fri', operator: 'Smart Travel Hub', ...extra });

test('no departures, no page (no doorway pages)', () => {
  const d = dest();
  const { pages } = buildRoutePages([d], [{ id: 'gokarna-dandeli', departures: [] }], places);
  assert.equal(pages.length, 0);
  assert.deepEqual(d.routes, []);
});

test('a page per destination and city, from real departures only', () => {
  const d = dest();
  const near = [{ slug: 'hyderabad', name: 'Hyderabad' }];
  const treks = [
    { id: 'gokarna-dandeli', departures: [dep('Hyderabad'), dep('Bengaluru', { pickup_point: 'Majestic Bus Stand', price_from: 3999 })] },
    { id: 'gokarna-beach-trek', departures: [dep('Hyderabad', { pickup_point: 'LB Nagar', departure_time: '09:00 PM', price_from: 4999, operator: null }),
      dep('Hyderabad', { pickup_point: '' }) /* incomplete: skipped */] },
  ];
  const { pages } = buildRoutePages([d], treks, places, near);
  assert.equal(pages.length, 2);
  const hyd = pages.find((p) => p.city.name === 'Hyderabad');
  assert.equal(hyd.path, '/destinations/gokarna/from-hyderabad');
  assert.equal(hyd.slug, 'gokarna--hyderabad');
  assert.equal(hyd.departures.length, 2);
  assert.equal(hyd.departures[0].price, 4999); // cheapest first
  assert.equal(hyd.departures[0].operator, null); // no organiser given, none of the trek's real ones either
  assert.equal(hyd.near, 'hyderabad');
  assert.ok(hyd.city.km > 400);
  // Bengaluru is shown the way people search it, and the URL uses that name.
  const blr = pages.find((p) => p.city.name === 'Bengaluru');
  assert.equal(blr.city.display, 'Bangalore');
  assert.equal(blr.path, '/destinations/gokarna/from-bangalore');
  assert.equal(routeHeading(blr), 'Gokarna trip from Bangalore (Bengaluru)');
  // Links both ways.
  assert.deepEqual(hyd.otherCities.map((o) => o.city), ['Bangalore']);
  assert.deepEqual(d.routes.map((r) => r.city), ['Bangalore', 'Hyderabad']);
  assert.deepEqual(near[0].routes.map((r) => r.name), ['Gokarna']);
});

test('a "trip from" the place itself is not made', () => {
  const d = dest();
  const { pages } = buildRoutePages([d], [{ id: 'gokarna-dandeli', departures: [dep('Gokarna')] }], places);
  assert.equal(pages.length, 0);
});

test('title, description and questions say the real facts', () => {
  const d = dest();
  const { pages } = buildRoutePages([d], [{ id: 'gokarna-dandeli', departures: [dep('Hyderabad')] }], places);
  const meta = routeMeta(pages[0]);
  assert.equal(meta.title, 'Gokarna Trip from Hyderabad: 1 Package from ₹5,499 | Aorbo Treks');
  assert.match(meta.description, /Pickup at Ameerpet Metro Station/);
  assert.ok(meta.title.length <= 70);
  const faqs = routeFaqs(pages[0]);
  assert.match(faqs.find((f) => /pickup/.test(f.q)).a, /Ameerpet Metro Station at 08:30 PM \(Smart Travel Hub\)/);
  assert.match(faqs.find((f) => /How far/.test(f.q)).a, /About \d+ km/);
  const ld = JSON.stringify(meta.jsonLd);
  assert.match(ld, /FAQPage/);
  assert.match(ld, /\/destinations\/gokarna\/from-hyderabad/);
});

test('state pages get no "trip from" pages', () => {
  const s = { ...dest(), kind: 'state', slug: 'karnataka', name: 'Karnataka' };
  const { pages } = buildRoutePages([s], [{ id: 'gokarna-dandeli', departures: [dep('Hyderabad')] }], places);
  assert.equal(pages.length, 0);
});
