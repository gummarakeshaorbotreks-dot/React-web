import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { destinationFacts, destinationFaqs, destinationHeading } from '../../seo/meta';
import { formatPrice } from '../../utils/format';
import '../../styles/TreksNear.css';

const asCard = (t) => ({
  id: t.id,
  name: t.name,
  state: t.state,
  price_start: t.price,
  duration_days: t.duration,
  operating_days: t.operating_days,
  images: t.image ? [{ image_url: t.image }] : [],
});

const days = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

// A "<destination> trips & treks" page (or a state page). Pure: everything comes
// from `page` (scripts/destination-pages.mjs), so the build can pre-render it.
export default function DestinationView({ page }) {
  const f = destinationFacts(page);
  const faqs = destinationFaqs(page);
  const isState = page.kind === 'state';

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Destinations"
        title={destinationHeading(page)}
        subtitle={`${f.count} packages on Aorbo Treks ${isState ? 'in' : 'that visit'} ${page.name}${!isState && page.state ? `, ${page.state}` : ''}.`}
        back={{ to: '/destinations', label: 'All destinations' }}
      />
      <div className="container">
        <p className="near-lead">
          {f.minDays != null && `Trips take ${f.minDays === f.maxDays ? days(f.minDays) : `${f.minDays} to ${f.maxDays} days`}. `}
          {f.minPrice != null && `Prices start from ${formatPrice(f.minPrice)} per person. `}
          {f.departures.length > 0 && `Departures on ${f.departures.join(', ')}. `}
          {page.statePage && <>See also <Link to={`/destinations/${page.statePage}`}>all treks and trips in {page.state}</Link>.</>}
        </p>

        <div className="grid grid-cards">
          {page.treks.map((t) => <TrekCard key={t.id} trek={asCard(t)} tag={`destination:${page.slug}`} />)}
        </div>

        {page.places.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`What you can see${isState ? ` in ${page.name}` : ` on a ${page.name} trip`}`} />
            <ul className="chip-list">
              {page.places.map((p) => <li key={p} className="chip chip--outline">{p}</li>)}
            </ul>
          </section>
        )}

        {page.from.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`How far is ${page.name}?`} subtitle="Straight-line distance; the road distance is longer." />
            <ul className="near-list">
              {page.from.map((m) => (
                <li key={m.city}>
                  <strong>From {m.city}: about {m.km} km</strong>
                  {m.page && <Link to={`/treks-near/${m.page}`}>All treks near {m.city}</Link>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="section near-section" aria-labelledby="dest-faq-title">
          <h2 id="dest-faq-title" className="section-title">{destinationHeading(page)}: questions</h2>
          {faqs.map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>

        {page.related.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`More destinations in ${page.state}`} />
            <ul className="chip-list">
              {page.related.map((r) => (
                <li key={r.slug}>
                  <Link className="chip chip--outline" to={`/destinations/${r.slug}`}>{r.name} · {r.count}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {f.minPrice != null && <p className="near-note">Prices are the lowest starting price of each package, per person ({formatPrice(f.minPrice)} and up).</p>}
      </div>
    </div>
  );
}
