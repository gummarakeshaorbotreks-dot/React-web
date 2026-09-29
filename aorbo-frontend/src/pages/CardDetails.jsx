import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, BookOpen, CalendarDays, Clock, Info, MapPin, MapPinOff, Route, Zap } from 'lucide-react';
import { mediaUrl } from '../api/client';
import useApi from '../hooks/useApi';
import { formatDuration, formatPrice } from '../utils/format';
import DetailHero from '../components/trek/DetailHero';
import InfoCard from '../components/ui/InfoCard';
import FactList from '../components/ui/FactList';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import '../styles/Details.css';

const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function CardDetails() {
  const { id } = useParams();
  const { data: trek, loading, error } = useApi(`/api/treks/${encodeURIComponent(id)}/`);

  if (loading) return <Loader label="Loading trek details…" />;

  if (error || !trek) {
    return (
      <div className="container section">
        <EmptyState
          icon={MapPinOff}
          title="Trek not found"
          text="Please go back and try again, or explore our other treks."
          action={<Link to="/" className="button button--brand">Browse treks</Link>}
        />
      </div>
    );
  }

  const duration = formatDuration(trek.duration_days);
  const price = trek.price_start != null ? formatPrice(trek.price_start) : null;
  const related = trek.related_treks || [];

  return (
    <div className="page detail-page">
      <div className="container">
        <DetailHero
          image={mediaUrl(trek.main_image)}
          title={trek.name}
          badges={trek.state ? [{ icon: MapPin, label: trek.state }] : []}
          meta={[
            { icon: Clock, label: duration },
            { icon: CalendarDays, label: trek.operating_days },
          ]}
          price={price && `${price} onwards`}
        />

        <div className="detail-grid">
          <div className="stack">
            <InfoCard icon={BookOpen} title="About this Trek">
              <p>{trek.description || trek.summary || `Explore ${trek.name}, a wonderful destination waiting for you.`}</p>
            </InfoCard>

            {trek.activities?.length > 0 && (
              <InfoCard icon={Zap} title="Activities">
                <ul className="chip-list">
                  {trek.activities.map((activity) => <li key={activity} className="chip">{activity}</li>)}
                </ul>
              </InfoCard>
            )}

            <InfoCard icon={MapPin} title="Famous Places">
              {trek.famous_places?.length > 0 ? (
                <ul className="place-list">
                  {trek.famous_places.map((place) => <li key={place}>{place}</li>)}
                </ul>
              ) : (
                <p className="muted-note">Coming soon...</p>
              )}
            </InfoCard>

            {related.length > 0 && (
              <InfoCard icon={Route} title="Related Treks">
                <ul className="link-list">
                  {related.map((rel) => (
                    <li key={rel.id}>
                      <Link to={`/treks/${rel.id}`}>
                        <span>{rel.name}</span>
                        {rel.state && <small>{rel.state}</small>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            )}
          </div>

          <aside className="stack">
            {price && (
              <section className="surface surface--dark">
                <p className="price-card__label">Starting from</p>
                <p className="price-card__value">{price}</p>
                <p className="price-card__note">per person onwards*</p>
              </section>
            )}

            <InfoCard icon={Info} title="Trip Info" as="h3">
              <FactList
                items={[
                  { icon: Clock, label: 'Duration', value: duration },
                  { icon: CalendarDays, label: 'Departure', value: trek.operating_days },
                  { icon: MapPin, label: 'Location', value: trek.state },
                ]}
              />
            </InfoCard>

            <InfoCard icon={BadgeCheck} title="Trusted Operators" as="h3">
              {trek.operators?.length > 0 ? (
                <ul className="operator-list">
                  {trek.operators.map((op) => (
                    <li key={op}>
                      <span className="operator-avatar" aria-hidden="true">{initials(op)}</span>
                      {op}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-note">Coming soon...</p>
              )}
            </InfoCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
