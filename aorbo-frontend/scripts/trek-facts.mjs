// Trek facts store (SEO plan phase 2, 19 Nov 2026): scripts/data/trek-facts.json, one entry per
// real trek and each website listing mapped to it. The build refuses a malformed file (a typo
// must never put a wrong height on a page).
import { readFileSync } from 'node:fs';
import { DIFFICULTY } from '../src/seo/trekFacts.js';

export const THEMES = ['snow', 'waterfall', 'fort', 'night', 'sunrise', 'cave', 'temple', 'lake', 'meadow', 'forest', 'summit'];
const FIELDS = new Set(['name', 'peak', 'top', 'altitude_m', 'trail_km', 'trail_note', 'difficulty', 'months', 'start', 'district', 'rail', 'airport', 'themes']);

/** Problems in a facts file ([] = fine). */
export function checkFacts(data) {
  const errors = [];
  const treks = data?.treks || {};
  for (const [key, f] of Object.entries(treks)) {
    const at = `trek-facts ${key}`;
    for (const k of Object.keys(f)) if (!FIELDS.has(k)) errors.push(`${at}: unknown field ${k}`);
    if (!f.name) errors.push(`${at}: no name`);
    if (f.altitude_m != null && !(Number.isInteger(f.altitude_m) && f.altitude_m >= 100 && f.altitude_m <= 8000)) errors.push(`${at}: altitude_m ${f.altitude_m}`);
    if (f.trail_km != null && !(f.trail_km > 0 && f.trail_km <= 200)) errors.push(`${at}: trail_km ${f.trail_km}`);
    if (f.difficulty != null && !DIFFICULTY[f.difficulty]) errors.push(`${at}: difficulty ${f.difficulty}`);
    if (f.months != null && !(Array.isArray(f.months) && f.months.every((m) => Number.isInteger(m) && m >= 1 && m <= 12) && new Set(f.months).size === f.months.length)) errors.push(`${at}: months`);
    if (f.themes != null && !(Array.isArray(f.themes) && f.themes.every((t) => THEMES.includes(t)))) errors.push(`${at}: themes`);
  }
  for (const [id, key] of Object.entries(data?.listings || {})) if (!treks[key]) errors.push(`trek-facts listing ${id}: unknown trek ${key}`);
  return errors;
}

const FILE = new URL('./data/trek-facts.json', import.meta.url);
const DATA = JSON.parse(readFileSync(FILE, 'utf8'));
const problems = checkFacts(DATA);
if (problems.length) throw new Error(`scripts/data/trek-facts.json:\n  ${problems.join('\n  ')}`);

/** The facts of a website listing ({ key, ...facts }), or null. */
export function factsOf(t) {
  const key = DATA.listings[t?.id || t?.slug];
  return key ? { key, ...DATA.treks[key] } : null;
}
