// Text for the compare and collection pages (scripts/fact-pages.mjs), all computed from their
// data: the page, its FAQPage data and its meta description say the same thing, and nothing is
// stated that the facts do not hold. Plain JavaScript (app + build).
import { DIFFICULTY, DIFFICULTY_RANK, MONTHS, monthRange } from './trekFacts.js';

const num = (n) => Number(n).toLocaleString('en-IN');
const rupees = (n) => `₹${num(n)}`;
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const daysText = (d) => (!d ? '' : d.min === d.max ? `${d.min} ${d.min === 1 ? 'day' : 'days'}` : `${d.min} to ${d.max} days`);
export { daysText };

const both = (a, b, k) => a.facts[k] != null && b.facts[k] != null;
const overlap = (a, b) => (a.facts.months || []).filter((m) => (b.facts.months || []).includes(m));
const only = (a, b) => (a.facts.months || []).filter((m) => !(b.facts.months || []).includes(m));

/** Where each of two treks wins, from the facts: { a: [reasons], b: [reasons] }. */
export function compareReasons({ a, b }) {
  const out = { a: [], b: [] };
  const win = (cond, x, text) => cond && out[x].push(text);
  if (both(a, b, 'altitude_m') && Math.abs(a.facts.altitude_m - b.facts.altitude_m) >= 50) {
    const [hi, lo] = a.facts.altitude_m > b.facts.altitude_m ? ['a', 'b'] : ['b', 'a'];
    win(true, hi, 'a higher summit');
    win(true, lo, 'less height to climb');
  }
  if (both(a, b, 'difficulty') && a.facts.difficulty !== b.facts.difficulty) {
    win(true, DIFFICULTY_RANK[a.facts.difficulty] < DIFFICULTY_RANK[b.facts.difficulty] ? 'a' : 'b', 'an easier walk, better for a first trek');
    win(true, DIFFICULTY_RANK[a.facts.difficulty] > DIFFICULTY_RANK[b.facts.difficulty] ? 'a' : 'b', 'more of a challenge');
  }
  if (both(a, b, 'trail_km') && a.facts.trail_km !== b.facts.trail_km) win(true, a.facts.trail_km < b.facts.trail_km ? 'a' : 'b', 'less walking');
  if (a.price && b.price && a.price !== b.price) win(true, a.price < b.price ? 'a' : 'b', 'a lower starting price');
  if (a.city && b.city && a.city.name === b.city.name && Math.abs(a.city.km - b.city.km) >= 20) {
    win(true, a.city.km < b.city.km ? 'a' : 'b', `closer to ${a.city.name}`);
  }
  if (only(a, b).length) out.a.push(`a trip in ${monthRange(only(a, b))}`);
  if (only(b, a).length) out.b.push(`a trip in ${monthRange(only(b, a))}`);
  if (a.facts.themes?.includes('snow') && !b.facts.themes?.includes('snow')) out.a.push('snow in winter');
  if (b.facts.themes?.includes('snow') && !a.facts.themes?.includes('snow')) out.b.push('snow in winter');
  return out;
}

/** The comparison in a few sentences (the page's lead and its meta description). */
export function compareSummary(page) {
  const { a, b } = page;
  if (page.kind === 'organisers') {
    const o = page.organisers;
    return [
      `${o.length} organisers run ${a.name} on Aorbo Treks: ${joinNames(o.map((x) => `${x.name} (from ${rupees(x.price)})`))}.`,
      'Compare their prices, departure cities and days below, then book with the one that suits you.',
    ];
  }
  const s = [];
  if (both(a, b, 'altitude_m')) {
    const d = Math.round(Math.abs(a.facts.altitude_m - b.facts.altitude_m) / 10) * 10;
    const [hi, lo] = a.facts.altitude_m >= b.facts.altitude_m ? [a, b] : [b, a];
    s.push(d < 50
      ? `${a.name} and ${b.name} top out at about the same height, around ${num(hi.facts.altitude_m)} m.`
      : `${hi.name} (${num(hi.facts.altitude_m)} m) goes about ${num(d)} m higher than ${lo.name} (${num(lo.facts.altitude_m)} m).`);
  }
  if (both(a, b, 'difficulty')) {
    s.push(a.facts.difficulty === b.facts.difficulty
      ? `Both are rated ${lower(DIFFICULTY[a.facts.difficulty])}.`
      : `${a.name} is rated ${lower(DIFFICULTY[a.facts.difficulty])} and ${b.name} ${lower(DIFFICULTY[b.facts.difficulty])}.`);
  }
  const common = overlap(a, b);
  if (common.length) s.push(`Both are good from ${monthRange(common)}.`);
  else if (a.facts.months?.length && b.facts.months?.length) s.push(`Their seasons differ: ${a.name} ${monthRange(a.facts.months)}, ${b.name} ${monthRange(b.facts.months)}.`);
  s.push(`They are about ${num(page.km)} km apart in a straight line${a.state === b.state ? `, both in ${a.state}` : ''}.`);
  if (a.price && b.price) s.push(`On Aorbo Treks, ${a.name} starts from ${rupees(a.price)} and ${b.name} from ${rupees(b.price)} per person.`);
  return s;
}

/** Questions a comparison answers (on the page and in its FAQPage data). */
export function compareFaqs(page) {
  const { a, b } = page;
  if (page.kind === 'organisers') {
    const o = page.organisers;
    return [
      { q: `Who runs the ${a.name} trek?`, a: `On Aorbo Treks: ${joinNames(o.map((x) => x.name))}.` },
      { q: `Which organiser is cheapest for ${a.name}?`, a: `${o[0].name}, from ${rupees(o[0].price)} per person.` },
    ];
  }
  const faqs = [];
  if (both(a, b, 'altitude_m')) {
    const [hi, lo] = a.facts.altitude_m >= b.facts.altitude_m ? [a, b] : [b, a];
    faqs.push({ q: `Which is higher, ${a.name} or ${b.name}?`, a: hi.facts.altitude_m === lo.facts.altitude_m ? `They are the same height, about ${num(hi.facts.altitude_m)} m.` : `${hi.name}, at about ${num(hi.facts.altitude_m)} m; ${lo.name} reaches about ${num(lo.facts.altitude_m)} m.` });
  }
  if (both(a, b, 'difficulty')) {
    const ra = DIFFICULTY_RANK[a.facts.difficulty];
    const rb = DIFFICULTY_RANK[b.facts.difficulty];
    faqs.push({
      q: `Which is easier, ${a.name} or ${b.name}?`,
      a: ra === rb ? `They are rated the same: ${lower(DIFFICULTY[a.facts.difficulty])}.` : `${ra < rb ? a.name : b.name} (${lower(DIFFICULTY[(ra < rb ? a : b).facts.difficulty])}). ${ra < rb ? b.name : a.name} is rated ${lower(DIFFICULTY[(ra < rb ? b : a).facts.difficulty])}.`,
    });
  }
  const common = overlap(a, b);
  if (a.facts.months?.length && b.facts.months?.length) {
    faqs.push({ q: `When can I do both ${a.name} and ${b.name}?`, a: common.length ? `${capital(monthRange(common))}.` : `Not in the same months: ${a.name} is best ${monthRange(a.facts.months)}, ${b.name} ${monthRange(b.facts.months)}.` });
  }
  if (a.price && b.price) {
    faqs.push({ q: `Which is cheaper, ${a.name} or ${b.name}?`, a: a.price === b.price ? `Both start from ${rupees(a.price)} per person on Aorbo Treks.` : `${a.price < b.price ? a.name : b.name}, from ${rupees(Math.min(a.price, b.price))} per person on Aorbo Treks (${a.price < b.price ? b.name : a.name} from ${rupees(Math.max(a.price, b.price))}).` });
  }
  faqs.push({ q: `How far apart are ${a.name} and ${b.name}?`, a: `About ${num(page.km)} km in a straight line.` });
  return faqs;
}

/** Months in season for at least half of a list of treks (a collection's "usual season"). */
function usualSeason(treks) {
  const months = [];
  for (let m = 1; m <= 12; m++) if (treks.filter((t) => t.months.includes(m)).length * 2 >= treks.length) months.push(m);
  return monthRange(months);
}

/** A collection in a few sentences (lead + meta description). */
export function collectionSummary(page) {
  const t = page.treks;
  const s = [];
  if (page.kind === 'month') {
    const month = MONTHS[page.month - 1];
    s.push(`${t.length} treks are in season in ${month}, in ${joinNames(page.states)}.`);
    const snow = t.filter((x) => (x.themes || []).includes('snow'));
    if (snow.length && [12, 1, 2, 3].includes(page.month)) s.push(`Snow treks: ${joinNames(snow.slice(0, 4).map((x) => x.name))}.`);
    if ([6, 7, 8, 9].includes(page.month)) {
      const wet = t.filter((x) => x.state === 'Maharashtra');
      if (wet.length) s.push(`Monsoon treks in the Sahyadris: ${joinNames(wet.slice(0, 4).map((x) => x.name))}.`);
    }
    if (page.starting.length) s.push(`Season starts this month for ${joinNames(page.starting.slice(0, 4))}${page.starting.length > 4 ? ` and ${page.starting.length - 4} more` : ''}.`);
    if (page.ending.length) s.push(`Last month of the season for ${joinNames(page.ending.slice(0, 4))}${page.ending.length > 4 ? ` and ${page.ending.length - 4} more` : ''}.`);
  } else {
    s.push(`${t.length} ${lower(page.title)}, with height, difficulty, season and price for each.`);
    const near = t.filter((x) => x.city).sort((x, y) => x.city.km - y.city.km)[0];
    if (near && page.near) s.push(`The nearest is ${near.name}, about ${num(near.city.km)} km from ${near.city.name} in a straight line.`);
    const high = t.filter((x) => x.altitude_m).sort((x, y) => y.altitude_m - x.altitude_m)[0];
    if (high) s.push(`The highest is ${high.name} at about ${num(high.altitude_m)} m.`);
    const season = usualSeason(t);
    if (season) s.push(`Most are best from ${season}.`);
  }
  const prices = t.map((x) => x.price).filter((p) => p > 0);
  if (prices.length) s.push(`Prices on Aorbo Treks start from ${rupees(Math.min(...prices))} per person.`);
  return s;
}

/** Questions a collection answers. */
export function collectionFaqs(page) {
  const t = page.treks;
  const faqs = [];
  const easy = t.filter((x) => DIFFICULTY_RANK[x.difficulty] <= 1).map((x) => x.name);
  const high = t.filter((x) => x.altitude_m).sort((x, y) => y.altitude_m - x.altitude_m)[0];
  if (page.kind === 'month') {
    const month = MONTHS[page.month - 1];
    faqs.push({ q: `Which treks can I do in ${month}?`, a: `On Aorbo Treks, ${t.length} treks are in season: ${joinNames(t.slice(0, 8).map((x) => x.name))}${t.length > 8 ? ' and more' : ''}.` });
    if (easy.length) faqs.push({ q: `Which easy treks can I do in ${month}?`, a: `${joinNames(easy.slice(0, 6))}.` });
    if (high) faqs.push({ q: `Which is the highest trek in season in ${month}?`, a: `${high.name}, at about ${num(high.altitude_m)} m.` });
  } else {
    faqs.push({ q: `Which are the ${lower(page.title)}?`, a: `On Aorbo Treks: ${joinNames(t.slice(0, 8).map((x) => x.name))}${t.length > 8 ? ' and more' : ''}.` });
    const near = t.filter((x) => x.city).sort((x, y) => x.city.km - y.city.km)[0];
    if (near) faqs.push({ q: `Which of these is the nearest to ${near.city.name}?`, a: `${near.name}, about ${num(near.city.km)} km in a straight line.` });
    if (easy.length && page.theme !== 'easy') faqs.push({ q: 'Which of these suit beginners?', a: `${joinNames(easy.slice(0, 6))} ${easy.length === 1 ? 'is' : 'are'} rated easy or easy to moderate.` });
    const season = usualSeason(t);
    if (season) faqs.push({ q: 'When is the season?', a: `Most of them are best from ${season}; each trek's own season is in the table.` });
  }
  return faqs;
}
