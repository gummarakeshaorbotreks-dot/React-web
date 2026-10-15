import { Link } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import '../../styles/TreksNear.css';

const anchor = (state) => state.toLowerCase().replace(/[^a-z]+/g, '-');

// Every destination page, by state.
export default function DestinationHubView({ hub }) {
  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Destinations"
        title="Trek and trip destinations"
        subtitle={`${hub.destinations} places and states with packages on Aorbo Treks. Pick one to compare its packages.`}
      />
      <div className="container">
        <nav className="near-states" aria-label="States">
          {hub.states.map((s) => (
            <a key={s.state} className="chip chip--outline" href={`#${anchor(s.state)}`}>{s.state}</a>
          ))}
        </nav>
        {hub.states.map((s) => (
          <section key={s.state} id={anchor(s.state)} className="near-section">
            <h2 className="section-title">{s.state}</h2>
            <ul className="near-cities">
              {s.page && (
                <li><Link to={`/destinations/${s.page.slug}`}>All treks and trips in {s.state}</Link> <span>({s.page.count})</span></li>
              )}
              {s.places.map((p) => (
                <li key={p.slug}><Link to={`/destinations/${p.slug}`}>{p.name}</Link> <span>({p.count})</span></li>
              ))}
            </ul>
          </section>
        ))}
        <p className="near-note">Looking for treks close to home? See <Link to="/treks-near">treks near your city or town</Link>.</p>
      </div>
    </div>
  );
}
