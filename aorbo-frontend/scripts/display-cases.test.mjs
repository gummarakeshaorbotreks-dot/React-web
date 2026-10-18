// npm run test:unit  — the website's formatters give the same text as the API's
// display.py (aorboweb/treks_app/display_cases.json), which the mobile app shows as is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { durationOptions, formatDepartureDays, formatPrice } from '../src/utils/format.js';

const file = new URL('../../aorboweb/treks_app/display_cases.json', import.meta.url);
let cases = null;
try {
  cases = JSON.parse(await readFile(file, 'utf8'));
} catch {
  // Only the website's folder is on the web server; the check runs where both are.
}

test('same price text as the API', { skip: !cases }, () => {
  for (const [value, expected] of cases.price) assert.equal(formatPrice(value), expected, String(value));
});

test('same durations as the API: every option in full', { skip: !cases }, () => {
  for (const [value, expected] of cases.durations) assert.deepEqual(durationOptions(value), expected, value);
});

test('same departure days as the API', { skip: !cases }, () => {
  for (const [value, expected] of cases.days) assert.equal(formatDepartureDays(value), expected, value);
});
