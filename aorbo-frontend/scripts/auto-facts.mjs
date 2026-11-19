// The vendor agent's file (seo-bot/bot/vendor_agent.py -> web server data/trek-facts-auto.json,
// env TREK_FACTS_AUTO_FILE): trek facts and trek/trip kinds for organisers' new treks, found
// from open data (Wikidata + OpenStreetMap agreeing, the organiser's own difficulty). The
// team's own files (scripts/data/trek-facts.json, listing-kind.json) always win over it; an
// entry that breaks the rules is dropped with a warning, never fails the build.
import { readFileSync } from 'node:fs';

const EMPTY = { treks: {}, listings: {}, kinds: {} };

export function loadAutoFacts(file = process.env.TREK_FACTS_AUTO_FILE) {
  if (!file) return EMPTY;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return { treks: data.treks || {}, listings: data.listings || {}, kinds: data.kinds || {} };
  } catch (e) {
    console.warn(`auto-facts: ${e.message}; none used`);
    return EMPTY;
  }
}

export const AUTO = loadAutoFacts();
