import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { WEEKEND_MAX_DAYS, WEEKEND_MAX_KM, nearFacts, nearFaqs, organiserCounts } from '../../seo/meta';
import { formatPrice } from '../../utils/format';
import '../../styles/TreksNear.css';

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// The trek list API's shape, so the site's one trek card can show it.
const asCard = (t) => ({
  id: t.id,
  name: t.name,
  state: t.state,
  price_start: t.price,
  duration_days: t.duration,
  operating_days: t.operating_days,
  images: t.image ? [{ image_url: t.image }] : [],
});

// A "Treks near <city>" page. Pure: everything comes from `page` (built by
// scripts/near-pages.mjs), so the build can render it to HTML ahead of time.
export default function NearView({ page }) {
  const { nearest, weekend, minPrice, states } = nearFacts(page);
  const faqs = nearFaqs(page);
  const organisers = organiserCounts(page.treks);

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Treks near you"
        title={`Treks near ${page.name}`}
        subtitle={`${page.total} treks within ${page.radius} km of ${page.name}, ${page.state}, nearest first.`}
        back={{ to: '/treks-near', label: 'All cities and towns' }}
      />
      <div className="container">
        {nearest && (
          <p className="near-lead">
            The nearest is <Link to={`/treks/${nearest.id}`}>{capital(nearest.name)}</Link>
            {nearest.state ? ` in ${nearest.state}` : ''}, about {nearest.km} km away.
            {weekend.length > 0 && ` ${weekend.length} of these can be done over a weekend.`}
            {minPrice != null && ` Prices start from ${formatPrice(minPrice)} per person.`}
            {states.length > 1 && ` You can trek in ${states.length} states from here.`}
          </p>
        )}

        <div className="grid grid-cards">
          {page.treks.map((t) => (
            <TrekCard key={t.id} trek={asCard(t)} tag={`near:${page.slug}`} distance={{ km: t.km, from: page.name }} />
          ))}
        </div>
        {page.total > page.treks.length && (
          <p className="near-note">Showing the {page.treks.length} nearest of {page.total} treks within {page.radius} km.</p>
        )}

        {weekend.length > 0 && (
          <section className="section near-section">
            <SectionHeading
              title={`Weekend treks near ${page.name}`}
              subtitle={`${WEEKEND_MAX_DAYS} days or less, within ${WEEKEND_MAX_KM} km.`}
            />
            <ul className="near-list">
              {weekend.map((t) => (
                <li key={t.id}>
                  <Link to={`/treks/${t.id}`}>{capital(t.name)}</Link>
                  <span>{t.km} km · {t.days} {t.days === 1 ? 'day' : 'days'}{t.price != null ? ` · from ${formatPrice(t.price)}` : ''}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {page.routes?.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`Trips leaving from ${page.name}`} subtitle="Packages with a pickup point in this city." />
            <ul className="chip-list">
              {page.routes.map((r) => (
                <li key={r.path}><Link className="chip chip--outline" to={r.path}>{r.name} · from {formatPrice(r.price)}</Link></li>
              ))}
            </ul>
          </section>
        )}

        {organisers.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`Trek organisers for treks near ${page.name}`} subtitle="The companies that run these treks; you book them on Aorbo Treks." />
            <ul className="near-list">
              {organisers.map((o) => (
                <li key={o.name}><strong>{o.name}</strong><span>{o.count} {o.count === 1 ? 'trek' : 'treks'} listed here</span></li>
              ))}
            </ul>
          </section>
        )}

        <section className="section near-section" aria-labelledby="near-faq-title">
          <h2 id="near-faq-title" className="section-title">Treks near {page.name}: questions</h2>
          {faqs.map((f) => (
            <details key={f.q} className="page-faq__item" open>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        {page.nearby.length > 0 && (
          <section className="section near-section">
            <SectionHeading title="Treks near other towns close by" />
            <ul className="chip-list">
              {page.nearby.map((n) => (
                <li key={n.slug}>
                  <Link className="chip chip--outline" to={`/treks-near/${n.slug}`}>{n.name} · {n.km} km</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="near-note">
          Distances are straight-line distances from {page.name} to each trek area; the road
          distance is longer. Town locations: <a href="https://www.geonames.org/" rel="noopener noreferrer" target="_blank">GeoNames</a> (CC BY 4.0).
        </p>
      </div>
    </div>
  );
}
