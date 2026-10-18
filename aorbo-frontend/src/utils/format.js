const SMALL_WORDS = new Set(['and', 'of', 'the', 'to', 'in', 'at', 'by', 'with', 'for', 'on', 'a', 'an', 'or', 'via', 'from']);

/**
 * Names with a capital at the start of each word ("Ananthagiri hills" -> "Ananthagiri Hills",
 * "gokarna-dandeli" -> "Gokarna-Dandeli"); small words stay small inside, and words that
 * already have capitals are kept (RK, McLeod). Same rule as the admin (aorboweb trek_rules.py).
 */
export const titleCase = (text = '') =>
  String(text || '').trim().split(/(\s+)/).map((word, i) => word.split(/([-/(])/).map((part, j) => {
    if (!part || /[-/(]/.test(part) || /[A-Z]/.test(part)) return part;
    if (i > 0 && j === 0 && SMALL_WORDS.has(part.toLowerCase())) return part.toLowerCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('')).join('');

export const formatPrice = (value) =>
  `₹${Number(value).toLocaleString('en-IN')}`;

const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Durations are typed in the admin as "3D/2N", "2D/1N, 3D/2N", "3D / 2N", "2D-1N",
// "1D", "6 Days" or a plain number. Each option becomes "3 Days / 2 Nights".
export function durationOptions(value) {
  const text = String(value ?? '').trim();
  if (!text) return [];
  if (/^\d+$/.test(text)) return [count(Number(text), 'Day')];
  const options = [...text.matchAll(/(\d+)\s*D(?:ays?)?\b\s*(?:[/-]\s*(\d+)\s*N(?:ights?)?\b)?/gi)]
    .map(([, d, n]) => (n != null ? `${count(Number(d), 'Day')} / ${count(Number(n), 'Night')}` : count(Number(d), 'Day')));
  return options.length ? [...new Set(options)].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) : [text];
}

/** Every option in full: "2 Days / 1 Night, 3 Days / 2 Nights". */
export const formatDuration = (value) => durationOptions(value).join(', ');

/**
 * Every distinct duration of several packages, shortest first:
 * ["2D/1N, 3D/2N", "3D/2N"] -> ["2 Days / 1 Night", "3 Days / 2 Nights"].
 * Durations are always shown as the real options, never as "2 to 5 Days".
 */
export function allDurations(values) {
  const seen = new Set();
  for (const v of values) for (const o of durationOptions(v)) seen.add(o);
  return [...seen].sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "THU, FRI, SAT" / "fri,sat" / "Wed, Thu, Fri ,Sat" -> "Thu, Fri, Sat" (week order); other text unchanged. */
export function formatDepartureDays(value) {
  const text = String(value ?? '').trim();
  const found = new Set(text.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3)
    .map((w) => WEEKDAYS.find((d) => d.toLowerCase() === w.slice(0, 3))).filter(Boolean));
  return found.size ? WEEKDAYS.filter((d) => found.has(d)).join(', ') : text;
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
