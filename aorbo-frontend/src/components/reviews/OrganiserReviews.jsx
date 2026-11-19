import Stars from './Stars';
import LiveGoogleRating from './LiveGoogleRating';
import SectionHeading from '../ui/SectionHeading';
import '../../styles/Reviews.css';

const DATE = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

// Ratings from Aorbo Treks travellers for one organiser (scripts/reviews.mjs; the same number as the
// app), and their Google rating live while they have under 5 Aorbo reviews. Pure apart from the live
// Google part, so the build pre-renders the reviews.
export default function OrganiserReviews({ name, reviews }) {
  if (!reviews) return null;
  const { rating, count, google, reviews: items = [] } = reviews;
  return (
    <section className="section near-section" aria-labelledby="org-reviews-title">
      <SectionHeading title={`${name}: traveller ratings`} subtitle="From customers who booked and travelled with them on Aorbo Treks." />
      {count > 0 && (
        <p className="rating-line rating-line--big">
          <Stars value={rating} size={20} />
          <strong>{rating.toFixed(1)}</strong>
          <span className="review-muted">from {count} {count === 1 ? 'review' : 'reviews'} on Aorbo Treks</span>
        </p>
      )}
      {google && <p><LiveGoogleRating trekId={google.trekId} /></p>}
      {items.length > 0 && (
        <ul className="review-list">
          {items.map((r, i) => (
            <li key={`${r.name}-${r.date}-${i}`} className="review-card">
              <div className="review-card__head">
                <Stars value={r.rating} size={14} />
                <span className="review-card__who">{r.name}</span>
                {r.date && <span className="review-muted">{DATE.format(new Date(`${r.date}T00:00:00Z`))}</span>}
              </div>
              <p className="review-card__text">{r.text}</p>
              {r.place && <p className="review-muted">Trip: {r.place}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
