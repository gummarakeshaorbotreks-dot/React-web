import { Link } from 'react-router-dom';
import { BadgeCheck, BookOpen, CalendarDays, Clock, Compass, Info, Layers, MapPin, Mountain, Route, Zap } from 'lucide-react';
import { mediaUrl } from '../../api/client';
import { durationOptions, formatDepartureDays, formatPrice } from '../../utils/format';
import { destinationHeading, isPlaceholderOperator, trekFaqs } from '../../seo/meta';
import { factRows } from '../../seo/trekFacts';
import DetailHero from './DetailHero';
import InfoCard from '../ui/InfoCard';
import FactList from '../ui/FactList';
import '../../styles/Details.css';

const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const list = (v) => (Array.isArray(v) ? v : []);

// A trek page. Pure: `trek` is the website API's trek object, `links` (built
// by scripts/seo-pages.mjs) the destination, city, compare and collection pages it
// belongs to, and `facts` its height / season / how to reach (scripts/data/trek-facts.json),
// so the build can render it to HTML ahead of time.
export default function TrekView({ trek, links = null, facts = null }) {
  const options = durationOptions(trek.duration_days);
  const duration = options.join(' · ');
  const departures = formatDepartureDays(trek.operating_days);
  const price = trek.price_start != null ? formatPrice(trek.price_start) : null;
  const related = list(trek.related_treks);
  const operators = list(trek.operators).filter((op) => !isPlaceholderOperator(op));
  const places = list(trek.famous_places);
  const destinations = links?.destinations || [];
  const near = links?.near || [];
  const faqs = trekFaqs(trek, links, facts);
  const rows = factRows(facts);
  const compare = links?.compare || [];
  const collections = links?.collections || [];
  const roads = links?.roads || [];

  return (
    <div className="page detail-page">
      <div className="container">
        <DetailHero
          image={mediaUrl(trek.main_image)}
          title={trek.name}
          badges={trek.state ? [{ icon: MapPin, label: trek.state }] : []}
          meta={[
            { icon: Clock, label: duration },
            { icon: CalendarDays, label: departures },
          ]}
          price={price && `${price} onwards`}
        />

        <div className="detail-grid">
          <div className="stack">
            <InfoCard icon={BookOpen} title="About this Trek">
              <p>{trek.description || trek.summary || `Explore ${trek.name}, a wonderful destination waiting for you.`}</p>
            </InfoCard>

            {rows.length > 0 && (
              <InfoCard icon={Mountain} title={`${facts.name}: trek facts`}>
                <FactList plain items={rows.map((r) => ({ label: r.label, value: r.value }))} />
                <p className="muted-note">Approximate, from public sources. Your organiser confirms the exact route and timings.</p>
              </InfoCard>
            )}

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

            {roads.length > 0 && (
              <InfoCard icon={Layers} title="How to reach">
                <ul className="link-list">
                  {roads.map((r) => (
                    <li key={r.path}>
                      <Link to={r.path}>
                        <span>{r.title}</span>
                        <small>About {Number(r.km).toLocaleString('en-IN')} km · station, airport, trips</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            )}

            {(compare.length > 0 || collections.length > 0) && (
              <InfoCard icon={Layers} title="Compare and explore">
                <ul className="link-list">
                  {compare.map((c) => (
                    <li key={c.path}>
                      <Link to={c.path}>
                        <span>{c.title}</span>
                        <small>Height, difficulty, season and price side by side</small>
                      </Link>
                    </li>
                  ))}
                  {collections.filter((c) => c.kind === 'theme').map((c) => (
                    <li key={c.path}>
                      <Link to={c.path}>
                        <span>{c.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {collections.some((c) => c.kind === 'month') && (
                  <p className="muted-note">
                    In season:{' '}
                    {collections.filter((c) => c.kind === 'month').map((c, i) => (
                      <span key={c.path}>{i > 0 && ', '}<Link to={c.path}>{c.title.replace('Treks in ', '')}</Link></span>
                    ))}
                  </p>
                )}
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
                  { icon: Clock, label: 'Duration', value: options.join(' · ') },
                  { icon: CalendarDays, label: 'Departure', value: departures },
                  { icon: MapPin, label: 'Location', value: trek.state },
                ]}
              />
            </InfoCard>

            <InfoCard icon={BadgeCheck} title="Trusted Operators" as="h3">
              {operators.length > 0 ? (
                <ul className="operator-list">
                  {operators.map((op) => {
                    // Each organiser has a profile page with all its treks (marketplace).
                    const profile = links?.organisers?.find((o) => o.name.toLowerCase() === op.toLowerCase());
                    return (
                      <li key={op}>
                        <span className="operator-avatar" aria-hidden="true">{initials(op)}</span>
                        {profile ? <Link to={`/organisers/${profile.slug}`}>{profile.name}</Link> : op}
                      </li>
                    );
                  })}
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
