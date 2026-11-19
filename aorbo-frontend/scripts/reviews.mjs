// Customers' reviews on the website (19 Nov 2026). The backend's feed (/api/v1/website/reviews: approved,
// shown reviews; one rating per organiser, the same number as the app) reaches the web server through
// the SEO bot's vendor agent (data/reviews.json, REVIEWS_FILE). Here they are matched to the website's
// organiser pages by name - the website spells names its own way ("AT Adventures and Travels" for the
// app's "AT Adventure And Travels"), so case, punctuation and a plural "s" are ignored, the same rule as
// the backend's badge lookup (services/websiteOrganiserPage.js nameKey).
// A missing or broken file = no ratings shown, never a failed build. Google's rating is never in here:
// pages ask for it live in the browser (src/components/reviews/LiveGoogleRating.jsx).
import { readFile } from 'node:fs/promises';

/** "AT Adventure And Travels" and "AT Adventures and Travels" -> the same key. */
export function nameKey(name) {
  return String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(Boolean).map((w) => (w.length > 3 ? w.replace(/s$/, '') : w)).join(' ');
}

export async function loadReviews(file) {
  if (!file) return { organisers: [] };
  try {
    const d = JSON.parse(await readFile(file, 'utf8'));
    return Array.isArray(d?.organisers) ? d : { organisers: [] };
  } catch (e) {
    console.warn(`reviews: none (${e.code || e.message}); pages built without ratings`);
    return { organisers: [] };
  }
}

/** nameKey -> { rating, count, google, reviews } (only organisers with something to show). */
export function reviewIndex(data) {
  const out = new Map();
  for (const o of data?.organisers || []) {
    const count = Number(o.count) || 0;
    const google = o.google?.trekId && count < 5 ? { trekId: o.google.trekId } : null;
    if (!count && !google) continue;
    out.set(nameKey(o.name), {
      rating: count ? Math.round(Number(o.rating) * 10) / 10 : 0,
      count,
      google,
      reviews: count ? (o.reviews || []).filter((r) => r && r.text && r.rating >= 1 && r.rating <= 5).slice(0, 6) : [],
    });
  }
  return out;
}

/** Adds `reviews` to the organiser pages that have ratings (and to the hub rows). */
export function attachReviews(organisers, index) {
  for (const p of organisers.pages || []) {
    const r = index.get(nameKey(p.name));
    if (r) p.reviews = r;
  }
  for (const h of organisers.hub?.organisers || []) {
    const r = index.get(nameKey(h.name));
    if (r?.count) h.rating = { value: r.rating, count: r.count };
  }
}

/** A trek page's organisers with their rating: [{ name, slug, rating, count, google }]. */
export function trekRatings(operatorNames, organiserPages, index) {
  const bySlugName = new Map((organiserPages || []).map((p) => [nameKey(p.name), p.slug]));
  return operatorNames
    .map((name) => {
      const r = index.get(nameKey(name));
      return r ? { name, slug: bySlugName.get(nameKey(name)) || null, rating: r.rating, count: r.count, google: r.google } : null;
    })
    .filter(Boolean);
}
