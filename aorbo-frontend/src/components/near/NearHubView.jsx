import { Link } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import '../../styles/TreksNear.css';

// The list of every "Treks near <city>" page, by state.
export default function NearHubView({ hub }) {
  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Treks near you"
        title="Find treks near your city or town"
        subtitle={`${hub.cities} cities and towns across India, each with its nearest treks, distances and prices.`}
      />
      <div className="container">
        <nav className="near-states" aria-label="States">
          {hub.states.map((s) => (
            <a key={s.state} className="chip chip--outline" href={`#${s.state.toLowerCase().replace(/[^a-z]+/g, '-')}`}>{s.state}</a>
          ))}
        </nav>
        {hub.states.map((s) => (
          <section key={s.state} id={s.state.toLowerCase().replace(/[^a-z]+/g, '-')} className="near-section">
            <h2 className="section-title">{s.state}</h2>
            <ul className="near-cities">
              {s.cities.map((c) => (
                <li key={c.slug}>
                  <Link to={`/treks-near/${c.slug}`}>Treks near {c.name}</Link> <span>({c.total})</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
