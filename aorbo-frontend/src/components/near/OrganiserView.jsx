import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { organiserFacts, organiserFaqs } from '../../seo/meta';
import { allDurations, formatPrice } from '../../utils/format';
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

// A trek organiser's profile page. Pure: everything comes from `page`
// (scripts/organiser-pages.mjs), so the build can pre-render it.
export default function OrganiserView({ page }) {
  const f = organiserFacts(page);
  const faqs = organiserFaqs(page);

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Trek organiser"
        title={page.name}
        subtitle={`${f.count} ${f.count === 1 ? 'trek' : 'treks and trips'} on Aorbo Treks${page.states.length ? ` in ${page.states.join(', ')}` : ''}.`}
        back={{ to: '/organisers', label: 'All trek organisers' }}
      />
      <div className="container">
        <p className="near-lead">
          {f.minPrice != null && `Prices start from ${formatPrice(f.minPrice)} per person. `}
          {allDurations(page.treks.map((t) => t.duration)).length > 0 && `Durations: ${allDurations(page.treks.map((t) => t.duration)).join(', ')}. `}
          {f.departures.length > 0 && `Departures on ${f.departures.join(', ')}. `}
          Book any of these on Aorbo Treks, or compare them with other organisers&apos; treks for the same place.
        </p>

        <div className="grid grid-cards">
          {page.treks.map((t) => <TrekCard key={t.id} trek={asCard(t)} tag={`organiser:${page.slug}`} />)}
        </div>

        {page.destinations.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`Where ${page.name} goes`} subtitle="Compare with other organisers for the same place." />
            <ul className="chip-list">
              {page.destinations.map((d) => (
                <li key={d.slug}>
                  <Link className="chip chip--outline" to={`/destinations/${d.slug}`}>{d.name} · {d.count}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="section near-section" aria-labelledby="org-faq-title">
          <h2 id="org-faq-title" className="section-title">{page.name}: questions</h2>
          {faqs.map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>

        {page.others.length > 0 && (
          <section className="section near-section">
            <SectionHeading title="Other trek organisers on Aorbo Treks" />
            <ul className="chip-list">
              {page.others.map((o) => (
                <li key={o.slug}>
                  <Link className="chip chip--outline" to={`/organisers/${o.slug}`}>{o.name} · {o.count}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
