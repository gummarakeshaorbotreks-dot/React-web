import { Link } from 'react-router-dom';
import { MapPin, Clock, CalendarDays, WifiOff } from 'lucide-react';
import { logClick, mediaUrl } from '../../api/client';
import { formatDuration, formatPrice, sentenceCase } from '../../utils/format';
import EmptyState from '../ui/EmptyState';
import '../../styles/TrekCard.css';

// The one trek card used everywhere treks are listed.
// `tag` is passed through to click analytics when the list is filtered.
export default function TrekCard({ trek, tag = '' }) {
  const image = mediaUrl(trek.images?.[0]?.image_url);

  return (
    <Link
      to={`/treks/${trek.id}`}
      className="trek-card"
      onClick={() => logClick({ trekId: trek.id, tag })}
    >
      <div className="trek-card__media">
        <img src={image} alt={trek.name} loading="lazy" />
        {trek.price_start != null && (
          <span className="trek-card__price">
            {formatPrice(trek.price_start)}
            <small>onwards*</small>
          </span>
        )}
      </div>

      <div className="trek-card__body">
        <h3 className="trek-card__title">{sentenceCase(trek.name)}</h3>
        {trek.state && (
          <p className="trek-card__location">
            <MapPin aria-hidden="true" /> {trek.state}
          </p>
        )}
        <ul className="trek-card__meta">
          {trek.duration_days && (
            <li><Clock aria-hidden="true" /> {formatDuration(trek.duration_days)}</li>
          )}
          {trek.operating_days && (
            <li><CalendarDays aria-hidden="true" /> {trek.operating_days}</li>
          )}
        </ul>
      </div>
    </Link>
  );
}

export function TrekCardSkeleton() {
  return (
    <div className="trek-card trek-card--skeleton" aria-hidden="true">
      <div className="trek-card__media skeleton" />
      <div className="trek-card__body">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--short" />
        <span className="skeleton skeleton--meta" />
      </div>
    </div>
  );
}

// Grid of trek cards with its own loading / empty / error states, so every
// trek list on the site behaves the same way.
export function TrekGrid({ treks, loading, error, tag, skeletons = 8, emptyTitle, emptyText, emptyAction }) {
  if (loading) {
    return (
      <div className="grid grid-cards" role="status" aria-label="Loading treks">
        {Array.from({ length: skeletons }, (_, i) => <TrekCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={WifiOff}
        title="We couldn't load treks right now"
        text="Please check your connection and try again in a moment."
      />
    );
  }

  if (!treks?.length) {
    return (
      <EmptyState
        title={emptyTitle || 'No treks here yet'}
        text={emptyText || 'New treks are added regularly — check back soon.'}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid grid-cards">
      {treks.map((trek) => <TrekCard key={trek.id} trek={trek} tag={tag} />)}
    </div>
  );
}
