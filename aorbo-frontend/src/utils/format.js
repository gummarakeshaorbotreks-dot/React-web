export const sentenceCase = (text = '') =>
  text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : '';

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

/** For small spaces (cards, the photo header): one option in full, several as "2 to 5 Days". */
export function formatDurationShort(value) {
  const options = durationOptions(value);
  if (options.length < 2) return options[0] || '';
  const days = options.map((o) => parseInt(o, 10)).filter((d) => !Number.isNaN(d));
  const min = Math.min(...days);
  const max = Math.max(...days);
  return min === max ? options[0] : `${min} to ${max} Days`;
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
