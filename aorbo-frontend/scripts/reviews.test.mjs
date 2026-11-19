// npm run test:unit - customers' reviews on the website (19 Nov 2026): scripts/reviews.mjs + review markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachReviews, nameKey, reviewIndex, trekRatings } from './reviews.mjs';
import { organiserFaqs, organiserMeta, organiserRatingLd } from '../src/seo/meta.js';

const feed = { organisers: [
  { name: 'AT Adventure And Travels', rating: 4.62, count: 3, google: { trekId: 9 }, reviews: [
    { name: 'Ravi K.', rating: 5, text: 'Great guides', date: '2026-11-02', place: 'Kudremukh' },
    { name: 'Bad', rating: 9, text: 'x' },
  ] },
  { name: 'Peak Co', rating: 0, count: 0, google: { trekId: 12 }, reviews: [] },
  { name: 'Quiet Co', rating: 0, count: 0, google: null, reviews: [] },
  { name: 'Big Co', rating: 4.1, count: 40, google: { trekId: 3 }, reviews: [] },
] };

test('names match the website spelling; only organisers with something to show; Google only under 5', () => {
  assert.equal(nameKey('AT Adventures and Travels'), nameKey('AT Adventure And Travels'));
  const idx = reviewIndex(feed);
  assert.deepEqual([...idx.keys()].sort(), [nameKey('AT Adventure And Travels'), nameKey('Big Co'), nameKey('Peak Co')].sort());
  const at = idx.get(nameKey('AT Adventures and Travels'));
  assert.equal(at.rating, 4.6);
  assert.equal(at.reviews.length, 1);              // the bad rating dropped
  assert.equal(idx.get(nameKey('Big Co')).google, null);   // 40 Aorbo reviews: no Google
  assert.deepEqual(idx.get(nameKey('Peak Co')), { rating: 0, count: 0, google: { trekId: 12 }, reviews: [] });
});

test('organiser pages, the hub and trek pages get them', () => {
  const idx = reviewIndex(feed);
  const organisers = { pages: [{ name: 'AT Adventures and Travels', slug: 'at-adventures-and-travels' }, { name: 'Nobody', slug: 'nobody' }],
    hub: { organisers: [{ name: 'AT Adventures and Travels' }, { name: 'Peak Co' }] } };
  attachReviews(organisers, idx);
  assert.equal(organisers.pages[0].reviews.count, 3);
  assert.equal(organisers.pages[1].reviews, undefined);
  assert.deepEqual(organisers.hub.organisers[0].rating, { value: 4.6, count: 3 });
  assert.equal(organisers.hub.organisers[1].rating, undefined);   // Google-only: no Aorbo stars in the list
  assert.deepEqual(trekRatings(['AT Adventures and Travels', 'Someone'], organisers.pages, idx),
    [{ name: 'AT Adventures and Travels', slug: 'at-adventures-and-travels', rating: 4.6, count: 3, google: { trekId: 9 } }]);
});

test('star markup only for real Aorbo reviews; FAQ says the same number', () => {
  assert.deepEqual(organiserRatingLd(null), {});
  assert.deepEqual(organiserRatingLd({ rating: 0, count: 0, google: { trekId: 1 }, reviews: [] }), {});
  const r = reviewIndex(feed).get(nameKey('AT Adventure And Travels'));
  const ld = organiserRatingLd(r);
  assert.deepEqual(ld.aggregateRating, { '@type': 'AggregateRating', ratingValue: 4.6, reviewCount: 3, bestRating: 5, worstRating: 1 });
  assert.equal(ld.review[0].author.name, 'Ravi K.');
  const page = { name: 'AT Adventures and Travels', slug: 'at', path: '/organisers/at', treks: [{ id: 'kud', name: 'Kudremukh', price: 3999, duration: '2D/1N', operating_days: 'Fri', state: 'Karnataka' }], states: ['Karnataka'], destinations: [], others: [], reviews: r };
  assert.ok(organiserFaqs(page).some((f) => f.a === 'AT Adventures and Travels is rated 4.6 out of 5 from 3 reviews by customers who booked on Aorbo Treks.'));
  const json = JSON.stringify(organiserMeta(page).jsonLd);
  assert.match(json, /"aggregateRating"/);
  assert.doesNotMatch(JSON.stringify(organiserMeta({ ...page, reviews: undefined }).jsonLd), /aggregateRating/);
});
