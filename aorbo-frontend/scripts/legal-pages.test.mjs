// npm run test:unit — customer legal pages (18 Nov 2026). The four pages must stay true to the
// code and to the owner's rules: Aorbo is the medium, no insurance offered, no arbitration for
// customers, one Grievance Officer on every page, and no claims about features or data we do not
// have. When a page's text changes, bump its "updated" date AND the same document's `version`
// in Backend config/legalDocuments.js (customers re-accept in the app).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (name) => readFileSync(new URL(`../src/pages/${name}.jsx`, import.meta.url), 'utf8');
const PAGES = ['Terms', 'PrivacyPolicy', 'UserAgreement', 'RefundPolicy'];
const flat = (s) => s.replace(/\s+/g, ' ');

test('every legal page names the Grievance Officer with the 24 h / 15 day promise', () => {
  for (const name of PAGES) {
    const s = flat(page(name));
    assert.match(s, /Grievance Officer:?<\/strong>|Grievance Officer:/, name);
    assert.match(s, /Abhishek Sakunam/, name);
    assert.match(s, /within 24 hours and resolve it within 15 ?days/, name);
    assert.match(s, /500036/, name);
  }
});

test('every legal page has an "updated" date', () => {
  for (const name of PAGES) assert.match(page(name), /updated="\d{1,2} [A-Z][a-z]+ 20\d\d"/, name);
});

test('no page offers or advises insurance; Terms says Aorbo does not provide it', () => {
  for (const name of PAGES) {
    const s = flat(page(name));
    assert.doesNotMatch(s, /advised to obtain adequate health and travel insurance/i, name);
    assert.doesNotMatch(s, /insurance (cover|plan|add-on) (is|are) (included|provided)/i, name);
  }
  assert.match(flat(page('Terms')), /Aorbo Treks does not provide insurance/);
});

test('customers keep courts + Consumer Commission; no arbitration clause', () => {
  for (const name of ['Terms', 'UserAgreement']) {
    const s = flat(page(name));
    assert.doesNotMatch(s, /resolved through arbitration|decision of the arbitrator/i, name);
    assert.match(s, /Consumer Commission under the Consumer Protection Act, 2019/, name);
  }
});

test('organiser fault refund wording = all but the ₹10 fee (operatorOverrideRefund)', () => {
  assert.match(flat(page('RefundPolicy')), /any payment gateway fee, except the ₹10 platform fee/);
  assert.match(flat(page('Terms')), /except the ₹10 platform fee/);
  for (const name of ['Terms', 'UserAgreement', 'RefundPolicy']) {
    assert.doesNotMatch(flat(page(name)), /If the organizer cancels, the User is refunded the amount paid, less the ₹10 platform fee and any/, name);
  }
});

test('no features or payment modes that do not exist', () => {
  const all = PAGES.map(page).map(flat).join(' ');
  for (const banned of [/Personalized Treks/i, /Pay at Site/i, /facilitation fee/i, /signed undertaking/i, /affiliated Vendors/i]) {
    assert.doesNotMatch(all, banned, String(banned));
  }
});

test('privacy policy makes no false data claims', () => {
  const s = flat(page('PrivacyPolicy'));
  for (const banned of [/fax/i, /call cent(er|re)s/i, /Facebook/i, /friend list/i, /subsidiaries/i, /co-branded/i,
    /card number[^.]*(stored|encrypted)/i, /cannot (personally )?identify you/i, /Read SMS|Device ID and call information|access your calendar/i]) {
    assert.doesNotMatch(s, banned, String(banned));
  }
  assert.match(s, /We do not sell personal data/);
  assert.match(s, /Data Protection Board of India/);
});
