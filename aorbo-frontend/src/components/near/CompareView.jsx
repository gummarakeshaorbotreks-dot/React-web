import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import { compareFaqs, compareReasons, compareSummary, daysText } from '../../seo/factPages';
import { DIFFICULTY, feet, monthRange } from '../../seo/trekFacts';
import { formatPrice } from '../../utils/format';
import '../../styles/TreksNear.css';
import '../../styles/FactPages.css';

const num = (n) => Number(n).toLocaleString('en-IN');
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const asCard = (l, state) => ({
  id: l.id, name: l.name, state, price_start: l.price, duration_days: l.duration, operating_days: l.operating_days,
  images: l.image ? [{ image_url: l.image }] : [],
});

// One row per fact; a row neither trek has is left out.
const ROWS = [
  ['Highest point', (s) => s.facts.altitude_m && `About ${num(s.facts.altitude_m)} m (${num(feet(s.facts.altitude_m))} ft)${s.facts.top ? `, ${s.facts.top}` : ''}`],
  ['Trail', (s) => s.facts.trail_km && `About ${num(s.facts.trail_km)} km${s.facts.trail_note ? ` (${s.facts.trail_note})` : ''}`],
  ['Difficulty', (s) => DIFFICULTY[s.facts.difficulty]],
  ['Best time', (s) => s.facts.months?.length && capital(monthRange(s.facts.months))],
  ['Starts from', (s) => s.facts.start],
  ['District', (s) => s.facts.district],
  ['Nearest railway station', (s) => s.facts.rail],
  ['Nearest airport', (s) => s.facts.airport],
  ['Nearest big city', (s) => s.city && `${s.city.name}, about ${num(s.city.km)} km (straight line)`],
  ['Days', (s) => daysText(s.days)],
  ['Price on Aorbo Treks', (s) => s.price && `From ${formatPrice(s.price)} per person`],
  ['Organisers', (s) => s.organisers?.length && s.organisers.join(', ')],
];

function Faqs({ page }) {
  return (
    <section className="section near-section" aria-labelledby="compare-faq-title">
      <h2 id="compare-faq-title" className="section-title">{page.title}: questions</h2>
      {compareFaqs(page).map((q) => (
        <details key={q.q} className="page-faq__item" open>
          <summary>{q.q}</summary>
          <p>{q.a}</p>
        </details>
      ))}
    </section>
  );
}

// "<trek> vs <trek>" and "<trek>: compare organisers" pages. Pure: everything comes from
// `page` (scripts/fact-pages.mjs), so the build can pre-render it.
export default function CompareView({ page }) {
  const { a, b } = page;
  const summary = compareSummary(page);

  if (page.kind === 'organisers') {
    return (
      <div className="page near-page">
        <PageHeader eyebrow="Compare organisers" title={page.title} subtitle="Prices, departure cities and days, side by side." back={{ to: '/collections', label: 'Collections & comparisons' }} />
        <div className="container">
          <p className="near-lead">{summary.join(' ')}</p>
          <div className="fact-table-wrap">
            <table className="fact-table fact-table--wide">
              <thead><tr><th scope="col">Organiser</th><th scope="col">From</th><th scope="col">Departure cities</th><th scope="col">Days</th></tr></thead>
              <tbody>
                {page.organisers.map((o) => (
                  <tr key={o.name}>
                    <th scope="row"><Link to={`/organisers/${o.slug}`}>{o.name}</Link></th>
                    <td>{formatPrice(o.price)}</td>
                    <td>{o.cities.join(', ') || '—'}</td>
                    <td>{o.days.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cards">
            {a.listings.map((l) => <TrekCard key={l.id} trek={asCard(l, a.state)} tag={`compare:${page.slug}`} />)}
          </div>
          <Faqs page={page} />
        </div>
      </div>
    );
  }

  const why = compareReasons(page);
  const rows = ROWS.map(([label, get]) => [label, get(a) || '', get(b) || '']).filter(([, x, y]) => x || y);

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Compare treks"
        title={`${page.title}: which trek to choose?`}
        subtitle="Height, trail, difficulty, season, how to get there and price, side by side."
        back={{ to: '/collections', label: 'Collections & comparisons' }}
      />
      <div className="container">
        <p className="near-lead">{summary.join(' ')}</p>

        <div className="fact-table-wrap">
          <table className="fact-table">
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Fact</span></th>
                <th scope="col"><Link to={`/treks/${a.listings[0].id}`}>{a.name}</Link></th>
                <th scope="col"><Link to={`/treks/${b.listings[0].id}`}>{b.name}</Link></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, x, y]) => (
                <tr key={label}><th scope="row">{label}</th><td>{x || '—'}</td><td>{y || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fact-note">Heights and distances are approximate, from public sources. Your organiser confirms the exact route.</p>

        {(why.a.length > 0 || why.b.length > 0) && (
          <div className="compare-why">
            {[[a, why.a], [b, why.b]].map(([s, reasons]) => reasons.length > 0 && (
              <div key={s.key}>
                <h3>Choose {s.name} for</h3>
                <ul>{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            ))}
          </div>
        )}

        <section className="section near-section">
          <SectionHeading title={`Book ${a.name} or ${b.name}`} subtitle="Packages on Aorbo Treks, from the organisers who run them." />
          <div className="grid grid-cards">
            {[...a.listings.map((l) => asCard(l, a.state)), ...b.listings.map((l) => asCard(l, b.state))].map((t) => (
              <TrekCard key={t.id} trek={t} tag={`compare:${page.slug}`} />
            ))}
          </div>
        </section>

        <Faqs page={page} />

        {page.others?.length > 0 && (
          <section className="section near-section">
            <SectionHeading title="More comparisons" />
            <ul className="chip-list">
              {page.others.map((o) => <li key={o.path}><Link className="chip chip--outline" to={o.path}>{o.title}</Link></li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
