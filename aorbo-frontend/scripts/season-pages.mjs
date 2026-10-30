// Winter treks & snow trips (/winter-treks). Owner, 30 Oct 2026: "build it — this year, next
// year, the year after, it keeps working". Kedarkantha, Auli, Gulmarg, Solang and the rest peak
// every November–January in Google (Desktop\Aorbo-Search-Research). One page, rebuilt with every
// site build from the live trek data, so nobody maintains a list:
//   - on it: a trek with a snow activity (snow, skiing, winter camping) or that visits a place
//     that is snowy in winter;
//   - never on it: trips that close or are cut off in winter (temple yatras, high passes),
//     even when they mention snow ("Kedarnath", "Ladakh").
// The season in the title moves on by itself every July ("2026–27", then "2027–28").
import { minDays } from './near-pages.mjs';

export const WINTER_PATH = '/winter-treks';

const SNOW_ACTIVITY = /\b(snow|ski|skiing|winter)\b/i;
const WINTER_PLACES = /\b(kedarkantha|auli|gulmarg|sonmarg|solang|kufri|narkanda|chopta|tungnath|chandrashila|dayara|brahmatal|nag tibba|sandakphu|tsomgo|changu|yumthang|zero point|pahalgam|betaab)\b/i;
// Closed or cut off in winter (Char Dham temples close in Nov, Hemkund/Valley of Flowers and the
// Ladakh / Spiti / Hampta passes are snowed in).
const CLOSED_IN_WINTER = /\b(kedarnath|badrinath|dham|yamunotri|gangotri|hemkund|valley of flowers|kheerganga|hampta|ladakh|spiti)\b/i;

const text = (v) => (Array.isArray(v) ? v.join(' ') : String(v ?? ''));

/** True when a website trek belongs on the winter page. */
export function isWinterTrek(t) {
  const where = `${text(t.name)} ${text(t.famous_places)}`;
  if (CLOSED_IN_WINTER.test(where)) return false;
  return SNOW_ACTIVITY.test(text(t.activities)) || WINTER_PLACES.test(where);
}

/** The winter season a date falls in: July 2026 – June 2027 is "2026–27". */
export function winterSeason(now = new Date()) {
  const y = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 6 ? y : y - 1;
  return `${start}–${String(start + 1).slice(2)}`;
}

/** treks: website API trek objects (details); destinationPages: built destination pages. */
export function buildWinterPage(treks, destinationPages = [], now = new Date()) {
  const list = treks.filter(isWinterTrek);
  if (!list.length) return { pages: [], hub: null };
  const snowFirst = (t) => (SNOW_ACTIVITY.test(text(t.activities)) ? 0 : 1);
  // Snow TREKS first (Kedarkantha, Auli...), then snow trips, then the rest; cheapest first in each.
  const rank = (t) => (snowFirst(t) === 0 && /\btrek\b/i.test(text(t.name)) ? 0 : snowFirst(t) === 0 ? 1 : 2);
  const items = list
    .sort((a, b) => rank(a) - rank(b) || (a.price_start ?? 1e9) - (b.price_start ?? 1e9) || String(a.name).localeCompare(String(b.name)))
    .map((t) => ({
      id: t.id || t.slug,
      name: t.name,
      state: t.state || '',
      price: t.price_start ?? null,
      duration: t.duration_days ?? '',
      days: minDays(t.duration_days),
      operating_days: t.operating_days || '',
      image: t.main_image || t.images?.[0]?.image_url || null,
      snow: snowFirst(t) === 0,
    }));
  const ids = new Set(items.map((t) => t.id));
  const destinations = destinationPages
    .filter((d) => d.kind !== 'state' && d.treks.some((t) => ids.has(t.id)))
    .map((d) => ({ slug: d.slug, name: d.name, count: d.treks.filter((t) => ids.has(t.id)).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const page = {
    slug: 'winter-treks',
    path: WINTER_PATH,
    name: 'Winter treks & snow trips',
    season: winterSeason(now),
    treks: items,
    states: [...new Set(items.flatMap((t) => t.state.split(',').map((s) => s.trim())).filter(Boolean))].sort(),
    destinations,
  };
  return { pages: [page], hub: null };
}
