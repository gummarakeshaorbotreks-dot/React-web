import { Link } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { routeFacts, routeFaqs, routeHeading } from '../../seo/meta';
import { allDurations, formatPrice } from '../../utils/format';
import '../../styles/TreksNear.css';

// A "<destination> trip from <city>" page. Pure: everything comes from `page`
// (scripts/route-pages.mjs), so the build can pre-render it. Every row is a real
// departure from the admin: pickup point, time, days and the price from this city.
export default function RouteView({ page }) {
  const f = routeFacts(page);
  const faqs = routeFaqs(page);
  const where = page.destination.name;
  const city = page.city.display;

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow={`Trips from ${city}`}
        title={routeHeading(page)}
        subtitle={`${f.count} ${f.count === 1 ? 'package leaves' : 'packages leave'} from ${city} for ${where} on Aorbo Treks.`}
        back={{ to: `/destinations/${page.destination.slug}`, label: `All ${where} trips` }}
      />
      <div className="container">
        <p className="near-lead">
          {f.minPrice != null && `From ${formatPrice(f.minPrice)} per person from ${city}. `}
          {allDurations(page.departures.map((d) => d.duration)).length > 0 && `Durations: ${allDurations(page.departures.map((d) => d.duration)).join(', ')}. `}
          {f.departures.length > 0 && `Leaves on ${f.departures.join(', ')}. `}
          {page.city.km != null && `${where} is about ${page.city.km} km from ${city} in a straight line.`}
        </p>

        <section className="section near-section" aria-labelledby="route-departures">
          <h2 id="route-departures" className="section-title">Departures from {city}</h2>
          <ul className="near-list">
            {page.departures.map((d) => (
              <li key={`${d.trek}-${d.pickup}-${d.time}`}>
                <strong><Link to={`/treks/${d.trek}`}>{d.name}</Link></strong>
                <span>
                  Pickup: {d.pickup} · leaves {d.time}
                  {d.departs ? ` · ${d.departs}` : ''}
                  {d.duration ? ` · ${d.duration}` : ''}
                  {` · from ${formatPrice(d.price)} per person`}
                  {d.operator ? ` · by ${d.operator}` : ''}
                </span>
                {d.book && <a href={d.book} rel="nofollow">Book on Aorbo</a>}
              </li>
            ))}
          </ul>
        </section>

        <section className="section near-section" aria-labelledby="route-faq-title">
          <h2 id="route-faq-title" className="section-title">{routeHeading(page)}: questions</h2>
          {faqs.map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>

        {page.otherCities.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`${where} trips from other cities`} />
            <ul className="chip-list">
              {page.otherCities.map((o) => (
                <li key={o.path}><Link className="chip chip--outline" to={o.path}>From {o.city} · {formatPrice(o.price)}</Link></li>
              ))}
            </ul>
          </section>
        )}

        {page.otherPlaces.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`More trips from ${city}`} />
            <ul className="chip-list">
              {page.otherPlaces.map((o) => (
                <li key={o.path}><Link className="chip chip--outline" to={o.path}>{o.name} · {formatPrice(o.price)}</Link></li>
              ))}
            </ul>
          </section>
        )}

        <p className="near-note">
          Prices are the lowest price per person from {city} for each package.{' '}
          <Link to={`/destinations/${page.destination.slug}`}>See all {where} packages</Link>
          {page.near && <> or <Link to={`/treks-near/${page.near}`}>treks near {page.city.name}</Link></>}.
        </p>
      </div>
    </div>
  );
}
