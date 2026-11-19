// Trek facts as people read them (SEO plan phase 2, 19 Nov 2026): height, trail, difficulty,
// season, how to get there. The facts themselves live in scripts/data/trek-facts.json; the
// build puts a trek's facts into its page data, and this file turns them into rows, questions
// and short sentences. Plain JavaScript: the app and the build (scripts/*.mjs) share it.

export const DIFFICULTY = {
  easy: 'Easy',
  'easy-moderate': 'Easy to moderate',
  moderate: 'Moderate',
  'moderate-difficult': 'Moderate to difficult',
  difficult: 'Difficult',
};
export const DIFFICULTY_RANK = { easy: 0, 'easy-moderate': 1, moderate: 2, 'moderate-difficult': 3, difficult: 4 };
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthSlug = (m) => MONTHS[m - 1].toLowerCase();

const num = (n) => Number(n).toLocaleString('en-IN');
export const feet = (m) => Math.round((m * 3.28084) / 10) * 10;
export const altitudeText = (m) => `about ${num(m)} m (${num(feet(m))} ft)`;

/** [12, 1, 2, 3, 4] -> "December to April"; [4, 5, 6, 9, 10, 11] -> "April to June and September to November". */
export function monthRange(months) {
  const set = new Set((months || []).filter((m) => m >= 1 && m <= 12));
  if (!set.size) return '';
  if (set.size === 12) return 'all year';
  const runs = [];
  for (let m = 1; m <= 12; m++) {
    const prev = m === 1 ? 12 : m - 1;
    if (!set.has(m) || set.has(prev)) continue;
    let end = m;
    while (set.has(end === 12 ? 1 : end + 1)) end = end === 12 ? 1 : end + 1;
    runs.push(end === m ? MONTHS[m - 1] : `${MONTHS[m - 1]} to ${MONTHS[end - 1]}`);
  }
  return runs.length < 2 ? runs.join('') : `${runs.slice(0, -1).join(', ')} and ${runs.at(-1)}`;
}

const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Rows for the facts box: [{ key, label, value }], only the facts we have. */
export function factRows(f) {
  if (!f) return [];
  return [
    f.altitude_m && { key: 'altitude', label: 'Highest point', value: `${f.top ? `${f.top}, ` : ''}${altitudeText(f.altitude_m)}` },
    f.trail_km && { key: 'trail', label: 'Trail', value: `About ${num(f.trail_km)} km${f.trail_note ? ` (${f.trail_note})` : ''}` },
    f.difficulty && { key: 'difficulty', label: 'Difficulty', value: DIFFICULTY[f.difficulty] },
    f.months?.length && { key: 'season', label: 'Best time', value: sentence(monthRange(f.months)) },
    (f.start || f.district) && {
      key: 'start',
      label: f.start ? 'Starts from' : 'District',
      value: f.start ? `${f.start}${f.district && !f.start.includes(f.district) ? `, ${f.district} district` : ''}` : f.district,
    },
    f.rail && { key: 'rail', label: 'Nearest railway station', value: f.rail },
    f.airport && { key: 'airport', label: 'Nearest airport', value: f.airport },
  ].filter(Boolean);
}

/** "3,800 m · Easy to moderate · December to April": a trek's facts in one line. */
export function factLine(f) {
  if (!f) return '';
  return [
    f.altitude_m && `${num(f.altitude_m)} m`,
    f.difficulty && DIFFICULTY[f.difficulty],
    f.months?.length && sentence(monthRange(f.months)),
  ].filter(Boolean).join(' · ');
}

/** Questions a trek's facts answer (shown on the trek page and in its FAQPage data). */
export function factFaqs(name, f) {
  if (!f) return [];
  const faqs = [];
  if (f.altitude_m) faqs.push({ q: `How high is ${name}?`, a: `${f.top ? `The highest point, ${f.top}, is at ` : 'The highest point is at '}${altitudeText(f.altitude_m)}.` });
  if (f.difficulty) {
    faqs.push({
      q: `How difficult is the ${name} trek?`,
      a: `${DIFFICULTY[f.difficulty]}${f.trail_km ? `, with about ${num(f.trail_km)} km of walking${f.trail_note ? ` (${f.trail_note})` : ''}` : ''}.`
        + (f.difficulty === 'easy' || f.difficulty === 'easy-moderate' ? ' It suits first-time trekkers who are reasonably fit.' : ''),
    });
  }
  if (f.months?.length) faqs.push({ q: `What is the best time for ${name}?`, a: `${sentence(monthRange(f.months))}.` });
  const reach = [
    f.start && `The trek starts from ${f.start}${f.district && !f.start.includes(f.district) ? ` in ${f.district} district` : ''}.`,
    f.rail && `The nearest railway station is ${f.rail}.`,
    f.airport && `The nearest airport is ${f.airport}.`,
  ].filter(Boolean);
  if (reach.length) faqs.push({ q: `How do I reach ${name}?`, a: reach.join(' ') });
  return faqs;
}

/** How many of the main facts a trek has (the build counts a trek with 4+ as having real content). */
export const factCount = (f) => (f ? ['altitude_m', 'trail_km', 'difficulty', 'months', 'start', 'rail', 'airport']
  .filter((k) => (Array.isArray(f[k]) ? f[k].length : f[k] != null && f[k] !== '')).length : 0);
