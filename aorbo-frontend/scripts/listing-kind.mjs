// Trek or trip/tour, for every website listing (SEO plan, 19 Nov 2026). Treks appear on
// "Treks near <town>" pages; trips and tours (Mathura-Agra-Ayodhya, Goa, Kashmir circuits...)
// never do, so those pages are what their title says. The list is scripts/data/listing-kind.json:
// built by rules, checked by hand, `review: true` = the team should confirm. A listing not in
// the file yet is a trek only when its own activities say trekking or hiking.
import { readFileSync } from 'node:fs';

const FILE = new URL('./data/listing-kind.json', import.meta.url);
let LISTINGS = {};
try {
  LISTINGS = JSON.parse(readFileSync(FILE, 'utf8')).listings || {};
} catch (e) {
  console.warn(`listing-kind: ${e.message}; new rule only`);
}

export function listingKind(t) {
  const id = t?.id || t?.slug;
  const known = id && LISTINGS[id];
  if (known && (known.kind === 'trek' || known.kind === 'trip')) return known.kind;
  return (t?.activities || []).some((a) => /trek|hik/i.test(String(a))) ? 'trek' : 'trip';
}

export const isTrekListing = (t) => listingKind(t) === 'trek';

/** A listing the team still has to confirm (`review: true`): kept off the new page families until then. */
export const needsReview = (t) => Boolean(LISTINGS[t?.id || t?.slug]?.review);

// Quality bar (SEO plan, 19 Nov 2026): a trek page with almost nothing on it (under 30 words of
// description, no places listed, no departures) stays out of Google - no-index, not in the
// sitemap - until it is rebuilt with real facts. Visitors can still open it. A trek with
// MIN_FACTS or more facts from scripts/data/trek-facts.json (height, season, how to reach...)
// has real content of its own (phase 2).
export const MIN_DESCRIPTION_WORDS = 30;
export const MIN_FACTS = 4;
export function isThinListing(t, factCount = 0) {
  const words = String(t?.description || '').trim().split(/\s+/).filter(Boolean).length;
  return words < MIN_DESCRIPTION_WORDS && !(t?.famous_places || []).length && !(t?.departures || []).length && factCount < MIN_FACTS;
}
