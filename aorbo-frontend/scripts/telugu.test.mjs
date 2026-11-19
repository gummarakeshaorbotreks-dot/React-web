// npm run test:unit - Telugu trek guides (scripts/lang-pages.mjs, src/seo/telugu.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTeluguPages, teluguAlternates } from './lang-pages.mjs';
import { teFactRows, teFaqs, teMonthRange, teSummary } from '../src/seo/telugu.js';
import { teTrekMeta } from '../src/seo/meta.js';

const names = JSON.parse(readFileSync(new URL('./data/names-te.json', import.meta.url), 'utf8')).names;
const facts = JSON.parse(readFileSync(new URL('./data/trek-facts.json', import.meta.url), 'utf8')).treks;
const entry = (key, extra = {}) => ({ key, name: facts[key]?.name || key, facts: facts[key] || {}, state: 'Karnataka', price: 3999, image: null,
  listings: [{ id: `${key}-trek`, name: `${key} trek`, price: 3999, duration: '2D/1N', operating_days: 'Fri', image: null }], ...extra });

test('every trek in the facts file has a Telugu name, in Telugu script', () => {
  for (const key of Object.keys(facts)) {
    assert.ok(names[key], `no Telugu name for ${key}`);
    assert.match(names[key], /[ఀ-౿]/, `${key}: not Telugu script`);
  }
});

test('a page per trek with a Telugu name and 3+ facts; paired with its English page', () => {
  const { pages, hub } = buildTeluguPages([entry('kudremukh'), entry('nope'), entry('kalsubai', { state: 'Maharashtra' })], names);
  assert.deepEqual(pages.map((p) => p.path), ['/te/treks/kalsubai', '/te/treks/kudremukh']);
  assert.equal(hub.states.length, 2);
  assert.equal(teluguAlternates(pages).get('kudremukh-trek'), '/te/treks/kudremukh');
  const meta = teTrekMeta(pages[1]);
  assert.equal(meta.lang, 'te');
  assert.deepEqual(meta.alternates.map((a) => a.hreflang), ['te', 'en', 'x-default']);
  assert.match(meta.title, /^కుద్రేముఖ్ ట్రెక్ \(Kudremukh\)/);
});

test('Telugu text from the facts only', () => {
  assert.equal(teMonthRange([10, 11, 12, 1, 2]), 'అక్టోబర్ నుండి ఫిబ్రవరి వరకు');
  assert.equal(teMonthRange([6, 7, 12]), 'జూన్ నుండి జూలై వరకు మరియు డిసెంబర్');
  const page = buildTeluguPages([entry('kudremukh')], names).pages[0];
  const s = teSummary(page).join(' ');
  assert.match(s, /కుద్రేముఖ్ ఎత్తు సుమారు 1,894 మీటర్లు/);
  assert.match(s, /₹3,999/);
  assert.ok(teFactRows(page.facts).some((r) => r.label === 'దగ్గరి రైల్వే స్టేషన్'));
  assert.ok(teFaqs(page).some((f) => f.q === 'కుద్రేముఖ్ ఎత్తు ఎంత?'));
  assert.deepEqual(teFactRows({}), []);
});
