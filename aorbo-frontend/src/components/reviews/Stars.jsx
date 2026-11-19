import { Star } from 'lucide-react';

// Five stars for a 0-5 rating (halves rounded to the nearer whole star), with the number for screen readers.
export default function Stars({ value, size = 16 }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="stars" role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} aria-hidden="true" className={i <= full ? 'stars__on' : 'stars__off'} />
      ))}
    </span>
  );
}
