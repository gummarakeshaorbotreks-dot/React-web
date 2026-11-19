import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { collectionFaqs, collectionSummary } from '../../seo/factPages';
import { DIFFICULTY, MONTHS, monthRange } from '../../seo/trekFacts';
import { monthNotes } from '../../seo/monthNotes';
import { formatPrice } from '../../utils/format';
import '../../styles/TreksNear.css';
import '../../styles/FactPages.css';

const num = (n) => Number(n).toLocaleString('en-IN');
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const asCard = (l) => ({
  id: l.id, name: l.name, state: l.state, price_start: l.price, duration_days: l.duration, operating_days: l.operating_days,
  images: l.image ? [{ image_url: l.image }] : [],
});

// A month or theme collection ("Treks in December", "Fort treks near Mumbai"). Pure: everything
// comes from `page` (scripts/fact-pages.mjs), so the build can pre-render it.
export default function CollectionView({ page }) {
  const month = page.kind === 'month';
  const listings = page.treks.flatMap((t) => t.listings);

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow={month ? 'Treks by month' : 'Trek collection'}
        title={page.title}
        subtitle={`${page.treks.length} treks with height, difficulty, season and price.`}
        back={{ to: '/collections', label: 'Collections & comparisons' }}
      />
      <div className="container">
        <p className="near-lead">{collectionSummary(page).join(' ')}</p>

        {month && (
          <section className="month-notes" aria-labelledby="month-notes-title">
            <h2 id="month-notes-title" className="section-title">What {MONTHS[page.month - 1]} is like for trekking</h2>
            <dl>
              {monthNotes(page.month, page.states).map((n) => (
                <div key={n.region}><dt>{n.name}</dt><dd>{n.note}</dd></div>
              ))}
            </dl>
          </section>
        )}

        <div className="fact-table-wrap">
          <table className="fact-table fact-table--wide">
            <thead>
              <tr>
                <th scope="col">Trek</th>
                {month && <th scope="col">State</th>}
                <th scope="col">Height</th>
                <th scope="col">Difficulty</th>
                <th scope="col">Best time</th>
                <th scope="col">Nearest big city</th>
                <th scope="col">From</th>
              </tr>
            </thead>
            <tbody>
              {page.treks.map((t) => (
                <tr key={t.key}>
                  <th scope="row"><Link to={`/treks/${t.link}`}>{t.name}</Link></th>
                  {month && <td>{t.state}</td>}
                  <td className="nowrap">{t.altitude_m ? `${num(t.altitude_m)} m` : '—'}</td>
                  <td>{DIFFICULTY[t.difficulty] || '—'}</td>
                  <td>{t.months.length ? capital(monthRange(t.months)) : '—'}</td>
                  <td>{t.city ? `${t.city.name}, ${num(t.city.km)} km` : '—'}</td>
                  <td className="nowrap">{t.price ? formatPrice(t.price) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fact-note">Heights are approximate, from public sources; distances are in a straight line. Prices are per person on Aorbo Treks.</p>

        <section className="section near-section">
          <SectionHeading title={month ? `Book a trek for ${MONTHS[page.month - 1]}` : `Book ${page.title.charAt(0).toLowerCase()}${page.title.slice(1)}`} />
          <div className="grid grid-cards">
            {listings.map((l) => <TrekCard key={l.id} trek={asCard(l)} tag={`collection:${page.slug}`} />)}
          </div>
        </section>

        <section className="section near-section" aria-labelledby="collection-faq-title">
          <h2 id="collection-faq-title" className="section-title">{page.title}: questions</h2>
          {collectionFaqs(page).map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>

        {page.related?.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={month ? 'Other months' : `More treks in ${page.state}`} />
            <ul className="chip-list">
              {page.related.map((o) => <li key={o.path}><Link className="chip chip--outline" to={o.path}>{o.title} · {o.count}</Link></li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
