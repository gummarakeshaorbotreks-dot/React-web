// npm run test:unit — destination pages (destination-pages.mjs), 30 Oct 2026: the SEO bot had put
// the Kedarnath yatra under /destinations/kedarkantha; removing that wrong link left Kedarkantha
// with one package, and a published page must not turn into a 404 when that happens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDestinationPages } from './destination-pages.mjs';
import { destinationMeta } from '../src/seo/meta.js';

const trek = (id, name, price) => ({ id, name, state: 'Uttarakhand', price_start: price, duration_days: '5D/4N', operating_days: 'Fri', operators: '[]' });
const TREKS = [trek('kedarkantha-trek', 'Kedarkantha Trek', 15000), trek('chopta-trek', 'Chopta Trek', 8000), trek('tungnath', 'Tungnath', 7000)];
const dest = (slug, name, treks, extra = {}) => ({ slug, name, state: 'Uttarakhand', kind: 'place', lat: null, lon: null, treks, places: [], ...extra });

test('a new destination needs 2 packages; one package is already its own trek page', () => {
  const { pages } = buildDestinationPages([dest('kedarkantha', 'Kedarkantha', ['kedarkantha-trek'])], TREKS, []);
  assert.deepEqual(pages, []);
});

test('a published page ("keep") stays with one package left, with singular wording', () => {
  const { pages } = buildDestinationPages([dest('kedarkantha', 'Kedarkantha', ['kedarkantha-trek'], { keep: true })], TREKS, []);
  assert.deepEqual(pages.map((p) => p.path), ['/destinations/kedarkantha']);
  const m = destinationMeta(pages[0]);
  assert.match(m.title, /: 1 Package from /);
  assert.match(m.description, /^1 Kedarkantha trip and trek package on Aorbo Treks/);
});

test('a kept page with no package left is not built (nothing to show)', () => {
  const { pages } = buildDestinationPages([dest('kedarkantha', 'Kedarkantha', ['gone'], { keep: true })], TREKS, []);
  assert.deepEqual(pages, []);
});

test('2+ packages: plural wording as before', () => {
  const { pages } = buildDestinationPages([dest('chopta', 'Chopta', ['chopta-trek', 'tungnath'])], TREKS, []);
  assert.match(destinationMeta(pages[0]).title, /: 2 Packages from /);
});
