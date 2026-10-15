import { Link } from 'react-router-dom';
import { BadgeCheck, BookOpen, CalendarDays, Clock, Compass, Info, MapPin, Route, Zap } from 'lucide-react';
import { mediaUrl } from '../../api/client';
import { formatDuration, formatPrice } from '../../utils/format';
import { destinationHeading, isPlaceholderOperator, trekFaqs } from '../../seo/meta';
import DetailHero from './DetailHero';
import InfoCard from '../ui/InfoCard';
import FactList from '../ui/FactList';
import '../../styles/Details.css';

const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const list = (v) => (Array.isArray(v) ? v : []);

// A trek page. Pure: `trek` is the website API's trek object and `links` (built
// by scripts/seo-pages.mjs) the destination and city pages it belongs to, so the
// build can render it to HTML ahead of time.
export default function TrekView({ trek, links = null }) {
  const duration = formatDuration(trek.duration_days);
  const price = trek.price_start != null ? formatPrice(trek.price_start) : null;
  const related = list(trek.related_treks);
  const operators = list(trek.operators).filter((op) => !isPlaceholderOperator(op));
  const places = list(trek.famous_places);
  const destinations = links?.destinations || [];
  const near = links?.near || [];
  const faqs = trekFaqs(trek, links);

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

            {list(trek.activities).length > 0 && (
              <InfoCard icon={Zap} title="Activities">
                <ul className="chip-list">
                  {trek.activities.map((activity) => <li key={activity} className="chip">{activity}</li>)}
                </ul>
              </InfoCard>
            )}

            <InfoCard icon={MapPin} title="Famous Places">
              {places.length > 0 ? (
                <ul className="place-list">
                  {places.map((place) => <li key={place}>{place}</li>)}
                </ul>
              ) : (
                <p className="muted-note">Coming soon...</p>
              )}
            </InfoCard>

            {(destinations.length > 0 || near.length > 0) && (
              <InfoCard icon={Compass} title="Plan your trip">
                <ul className="link-list">
                  {destinations.map((d) => (
                    <li key={d.slug}>
                      <Link to={`/destinations/${d.slug}`}>
                        <span>{destinationHeading(d)}</span>
                        <small>{d.count} packages</small>
                      </Link>
                    </li>
                  ))}
                  {near.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/treks-near/${c.slug}`}>
                        <span>Treks near {c.name}</span>
                        <small>{trek.name} is about {c.km} km away</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            )}

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

            {faqs.length > 0 && (
              <section className="surface" aria-labelledby="trek-faq-title">
                <h2 id="trek-faq-title" className="surface-title">{trek.name}: questions</h2>
                {faqs.map((f) => (
                  <details key={f.q} className="page-faq__item" open>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </section>
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
              {operators.length > 0 ? (
                <ul className="operator-list">
                  {operators.map((op) => (
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
