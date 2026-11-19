import { useEffect, useState } from 'react';
import '../../styles/Reviews.css';
import Stars from './Stars';

const API = 'https://api.aorbotreks.co.in';

// An organiser's Google rating, asked for live in the visitor's browser and never stored or built into
// the page (Google Maps terms; backend services/vendorGoogleRating.js decides: only while the organiser
// has under 5 Aorbo reviews and has linked their listing). Nothing shows when there is no answer.
export default function LiveGoogleRating({ trekId, compact = false }) {
  const [g, setG] = useState(null);
  useEffect(() => {
    if (!trekId) return undefined;
    let alive = true;
    fetch(`${API}/api/v1/treks/${encodeURIComponent(trekId)}/google-rating`, { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => { if (alive && b?.data && typeof b.data.rating === 'number' && b.data.count > 0) setG(b.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [trekId]);
  if (!g) return null;
  return (
    <span className={compact ? 'rating-line rating-line--compact' : 'rating-line'}>
      <Stars value={g.rating} size={compact ? 13 : 16} />
      <strong>{g.rating.toFixed(1)}</strong>
      <span className="review-muted">({Number(g.count).toLocaleString('en-IN')}) on Google Maps</span>
    </span>
  );
}
