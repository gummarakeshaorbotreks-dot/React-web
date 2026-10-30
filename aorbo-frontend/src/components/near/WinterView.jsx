import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { winterFacts, winterFaqs } from '../../seo/meta';
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

// Winter treks & snow trips (/winter-treks). Pure: everything comes from `page`
// (scripts/season-pages.mjs), so the build can pre-render it.
export default function WinterView({ page }) {
  const f = winterFacts(page);
  const faqs = winterFaqs(page);
  const durations = allDurations(page.treks.map((t) => t.duration));
  // From the data, so the text never names a trek that has left the site.
  const named = page.treks.slice(0, 4).map((t) => t.name);
  const like = named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : named.join('');

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow={`Winter ${page.season}`}
        title="Winter treks & snow trips"
        subtitle={`${f.count} snow treks and trips${page.states.length ? ` in ${page.states.join(', ')}` : ''}, from verified trek organisers.`}
      />
      <div className="container">
        <p className="near-lead">
          Winter treks and snow trips like {like} run from November to March.
          {f.minPrice != null && ` Prices start from ${formatPrice(f.minPrice)} per person.`}
          {durations.length > 0 && ` Durations: ${durations.join(', ')}.`}
          {' '}Compare organisers and book on Aorbo Treks.
        </p>

        <div className="grid grid-cards">
          {page.treks.map((t) => <TrekCard key={t.id} trek={asCard(t)} tag="season:winter" />)}
        </div>

        {page.destinations.length > 0 && (
          <section className="section near-section">
            <SectionHeading title="Winter destinations" subtitle="All treks and trips for each place." />
            <ul className="chip-list">
              {page.destinations.map((d) => (
                <li key={d.slug}>
                  <Link className="chip chip--outline" to={`/destinations/${d.slug}`}>{d.name} · {d.count}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="section near-section" aria-labelledby="winter-faq-title">
          <h2 id="winter-faq-title" className="section-title">Winter treks: questions</h2>
          {faqs.map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
