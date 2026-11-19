import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import FactList from '../ui/FactList';
import { driveText, roadFaqs, roadSummary, viaText } from '../../seo/roadPages';
import { factRows } from '../../seo/trekFacts';
import { formatPrice } from '../../utils/format';
import '../../styles/TreksNear.css';
import '../../styles/FactPages.css';

const num = (n) => Number(n).toLocaleString('en-IN');
const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const asCard = (l, state) => ({
  id: l.id, name: l.name, state, price_start: l.price, duration_days: l.duration, operating_days: l.operating_days,
  images: l.image ? [{ image_url: l.image }] : [],
});

// "<city> to <trek>": road distance and driving time (OSRM), how to reach without a car, the trek's
// facts and the trips that leave from that city. Pure: everything comes from `page`
// (scripts/road-pages.mjs), so the build can pre-render it.
export default function RoadView({ page }) {
  const { trek, city, road } = page;
  const via = viaText(road.via);
  const rows = [
    { label: 'Distance by road', value: `About ${num(road.km)} km` },
    { label: 'Driving time', value: `${capital(driveText(road.min))} (average about 50 km/h)` },
    via && { label: 'Main roads', value: via },
    ...factRows(trek.facts),
  ].filter(Boolean);

  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Route guide"
        title={`${page.title}: distance & how to reach`}
        subtitle={`By road, by train and by air, with trips from ${city.name}.`}
        back={{ to: '/routes', label: 'All route guides' }}
      />
      <div className="container">
        <p className="near-lead">{roadSummary(page).join(' ')}</p>

        <div className="fact-table-wrap">
          <FactList plain items={rows} />
        </div>
        <p className="fact-note">Road distance is from OpenStreetMap routing for a car; driving time assumes an average of about 50 km/h and no long stops. Your organiser confirms the pickup and timings.</p>

        {page.departures.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`Trips to ${trek.name} from ${city.name}`} subtitle="Real departures on Aorbo Treks: pickup, time and price from this city." />
            <div className="fact-table-wrap">
              <table className="fact-table fact-table--wide">
                <thead><tr><th scope="col">Organiser</th><th scope="col">Pickup</th><th scope="col">Leaves</th><th scope="col">From</th></tr></thead>
                <tbody>
                  {page.departures.map((d, i) => (
                    <tr key={`${d.listing}-${i}`}>
                      <th scope="row">{d.operator || '—'}</th>
                      <td>{d.pickup || '—'}</td>
                      <td className="nowrap">{d.time || '—'}</td>
                      <td className="nowrap">{formatPrice(d.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {page.trip && <p><Link to={page.trip.path}>{page.trip.title}: pickup points and dates</Link></p>}
          </section>
        )}

        <section className="section near-section">
          <SectionHeading title={`Book ${trek.name}`} subtitle="Packages on Aorbo Treks, from the organisers who run them." />
          <div className="grid grid-cards">
            {trek.listings.map((l) => <TrekCard key={l.id} trek={asCard(l, trek.state)} tag={`route:${page.slug}`} />)}
          </div>
        </section>

        <section className="section near-section" aria-labelledby="road-faq-title">
          <h2 id="road-faq-title" className="section-title">{page.title}: questions</h2>
          {roadFaqs(page).map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>

        {(page.fromCity?.length > 0 || page.toTrek?.length > 0) && (
          <section className="section near-section">
            <SectionHeading title="More route guides" />
            <ul className="chip-list">
              {page.toTrek.map((o) => <li key={o.path}><Link className="chip chip--outline" to={o.path}>{o.city} to {trek.name}</Link></li>)}
              {page.fromCity.map((o) => <li key={o.path}><Link className="chip chip--outline" to={o.path}>{city.name} to {o.name} · {num(o.km)} km</Link></li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** /routes: every route guide, by city. */
export function RoadHubView({ hub }) {
  return (
    <div className="page near-page">
      <PageHeader eyebrow="Route guides" title="How to reach treks from your city" subtitle="Distance by road, driving time, nearest station and airport, and trips with pickup in your city." />
      <div className="container">
        {hub.cities.map((c) => (
          <section key={c.name} className="section near-section">
            <SectionHeading title={`From ${c.name}`} subtitle={`${c.routes.length} treks within a weekend's reach`} />
            <ul className="chip-list">
              {c.routes.map((r) => (
                <li key={r.path}><Link className="chip chip--outline" to={r.path}>{r.name} · {num(r.km)} km · {driveText(r.min)}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
