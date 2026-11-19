// Text for the route guides (/routes/<city>-to-<trek>, scripts/road-pages.mjs), computed from the page's
// own data: the lead, the FAQs, their FAQPage data and the meta description say the same thing. The
// road distance is OpenStreetMap routing (OSRM); the driving time is the slower of OSRM's estimate and
// the distance at an average 50 km/h (scripts/road-pages.mjs driveMinutes), so the text says "about";
// nothing is said that the data does not hold (no bus or train timings). Plain JavaScript (app + build).
import { DIFFICULTY, monthRange } from './trekFacts.js';

const num = (n) => Number(n).toLocaleString('en-IN');
const rupees = (n) => `₹${num(n)}`;
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** 383 -> "about 6 h 20 min" (to the nearest 10 minutes; "about 45 min" under an hour). */
export function driveText(min) {
  const m = Math.max(10, Math.round(min / 10) * 10);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `about ${r} min`;
  return `about ${h} h${r ? ` ${r} min` : ''}`;
}

/** "NH 75 and NH 73" from OSRM's road summary ("NH75, NH73" / "Bengaluru - Mangaluru Highway"). */
export function viaText(via) {
  const roads = String(via || '').split(',').map((s) => s.trim().replace(/^(NH|SH|MDR)\s*-?\s*(\d)/i, (_, a, d) => `${a.toUpperCase()} ${d}`)).filter(Boolean).slice(0, 3);
  return roads.length < 2 ? roads.join('') : `${roads.slice(0, -1).join(', ')} and ${roads.at(-1)}`;
}

const cheapest = (page) => (page.departures.length ? Math.min(...page.departures.map((d) => d.price)) : null);
const organisers = (page) => [...new Set(page.departures.map((d) => d.operator).filter(Boolean))];

/** The route in a few sentences (lead + meta description). */
export function roadSummary(page) {
  const { trek, city, road } = page;
  const f = trek.facts;
  const via = viaText(road.via);
  const s = [`${trek.name} is about ${num(road.km)} km from ${city.name} by road, ${driveText(road.min)} of driving${via ? ` via ${via}` : ''}.`];
  if (f.start) s.push(`The trek starts from ${f.start}${f.district && !f.start.includes(f.district) ? ` in ${f.district} district` : ''}.`);
  const reach = [f.rail && `the nearest railway station is ${f.rail}`, f.airport && `the nearest airport is ${f.airport}`].filter(Boolean);
  if (reach.length) s.push(`${capital(reach.join(' and '))}.`);
  if (f.months?.length) s.push(`Best time: ${monthRange(f.months)}.`);
  const from = cheapest(page);
  if (from) s.push(`Trips from ${city.name} on Aorbo Treks start at ${rupees(from)} per person.`);
  return s;
}

/** Questions the route answers (page + FAQPage data). */
export function roadFaqs(page) {
  const { trek, city, road } = page;
  const f = trek.facts;
  const via = viaText(road.via);
  const faqs = [
    { q: `How far is ${trek.name} from ${city.name}?`, a: `About ${num(road.km)} km by road${via ? `, mostly via ${via}` : ''}.` },
    { q: `How long does it take to reach ${trek.name} from ${city.name}?`, a: `${capital(driveText(road.min))} of driving, at an average of about 50 km/h; plan more for breaks, traffic and ghat roads.` },
  ];
  const reach = [
    f.rail && `By train: the nearest railway station is ${f.rail}.`,
    f.airport && `By air: the nearest airport is ${f.airport}.`,
    f.start && `The walk starts from ${f.start}.`,
  ].filter(Boolean);
  if (reach.length) faqs.push({ q: `How to reach ${trek.name} from ${city.name} without a car?`, a: reach.join(' ') });
  if (page.departures.length) {
    const orgs = organisers(page);
    faqs.push({
      q: `Is there a trek package to ${trek.name} from ${city.name}?`,
      a: `Yes. ${orgs.length ? `${orgs.join(', ')} ${orgs.length === 1 ? 'runs' : 'run'}` : 'Organisers run'} trips from ${city.name}, from ${rupees(cheapest(page))} per person, with pickup in ${city.name}.`,
    });
  }
  if (f.months?.length) faqs.push({ q: `When is the best time to go to ${trek.name}?`, a: `${capital(monthRange(f.months))}.` });
  if (f.difficulty) faqs.push({ q: `Is ${trek.name} a difficult trek?`, a: `${DIFFICULTY[f.difficulty]}${f.trail_km ? `, about ${num(f.trail_km)} km of walking` : ''}.` });
  return faqs;
}
