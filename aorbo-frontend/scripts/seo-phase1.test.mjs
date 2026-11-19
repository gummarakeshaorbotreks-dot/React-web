// npm run test:unit - SEO plan phase 1 (19 Nov 2026): blog pages carry their own safe text;
// "Treks near <town>" lists treks only (scripts/listing-kind.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeBlogHtml, blogArticleHtml, blogListHtml } from './blog-html.mjs';
import { listingKind, isTrekListing } from './listing-kind.mjs';

test('blog HTML: text tags kept, anything that can run code removed', () => {
  const out = sanitizeBlogHtml(`<h1>CONTENT</h1><h2 onclick="x()">Why</h2><p style="color:red">Hi <a href="javascript:alert(1)">bad</a>
    <a href="https://aorbotreks.com/treks/kedarkantha-trek">good</a></p><script>alert(1)</script><iframe src="//evil"></iframe>
    <img src="https://cdn.example.com/a.jpg" onerror="x()" alt="view"><img src="data:image/png;base64,AAA"><table><tr><td>t</td></tr></table>`);
  assert.doesNotMatch(out, /<h1|onclick|onerror|style=|javascript:|<script|<iframe|data:image|<table|<td/i);
  assert.match(out, /<h2>Why<\/h2>/);
  assert.match(out, /<a href="https:\/\/aorbotreks.com\/treks\/kedarkantha-trek" rel="noopener">good<\/a>/);
  assert.match(out, /<img src="https:\/\/cdn.example.com\/a.jpg" alt="view" loading="lazy">/);
  assert.match(out, /<a>bad<\/a>/);
});

test('blog article page: own heading, author, date and body; list links every post', () => {
  const html = blogArticleHtml({ title: 'The Trek That Made Me Build Aorbo', author: 'Abhishek', created_at: '2026-10-01T10:00:00Z', content: '<p>Story <b>here</b></p>', image_url: 'https://x.supabase.co/a.jpg' });
  assert.match(html, /<h1>The Trek That Made Me Build Aorbo<\/h1>/);
  assert.match(html, /By Abhishek · <time/);
  assert.match(html, /<article class="blog-post__body"><p>Story <b>here<\/b><\/p><\/article>/);
  const list = blogListHtml([{ slug: 'a-b', title: 'A & B', excerpt: 'x' }]);
  assert.match(list, /<a href="\/blogs\/a-b"><strong>A &amp; B<\/strong><\/a><p>x<\/p>/);
});

test('treks vs trips: tours never count as treks', () => {
  const data = JSON.parse(readFileSync(new URL('./data/listing-kind.json', import.meta.url), 'utf8')).listings;
  const kindOf = (name) => Object.entries(data).find(([, v]) => v.name === name)?.[1].kind;
  for (const trip of ['Mathura-Agra-Ayodhya-Nepal', 'Kashmir-Jammu-Amritsar', 'Udaipur Chittorgarh', 'Goa', 'Char Dham Yatra', 'Pondicherry']) {
    assert.equal(kindOf(trip), 'trip', trip);
  }
  for (const trek of ['Kedarkantha Trek', 'Siddara Betta', 'Tadiandamol', 'Kurinjal Peak', 'Rajmachi Trek', 'Netravathi']) {
    assert.equal(kindOf(trek), 'trek', trek);
  }
  // a listing not in the file yet: only its own trekking / hiking activity makes it a trek
  assert.equal(listingKind({ id: 'new-one', activities: ['Hiking', 'Camping'] }), 'trek');
  assert.equal(isTrekListing({ id: 'new-two', activities: ['Beach hopping'] }), false);
});

test('quality bar: a near-empty trek page stays out of Google until rebuilt', async () => {
  const { isThinListing } = await import('./listing-kind.mjs');
  assert.equal(isThinListing({ description: 'Short text only.' }), true);
  assert.equal(isThinListing({ description: 'Short.', famous_places: ['Summit'] }), false);
  assert.equal(isThinListing({ description: 'Short.', departures: [{ date: '2026-12-01' }] }), false);
  assert.equal(isThinListing({ description: 'word '.repeat(30) }), false);
});
