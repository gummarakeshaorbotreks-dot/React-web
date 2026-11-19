import { Link } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import '../../styles/TreksNear.css';
import '../../styles/FactPages.css';

const byState = (items) => {
  const groups = new Map();
  for (const i of items) groups.set(i.state, [...(groups.get(i.state) || []), i]);
  return [...groups];
};

// /collections: treks by month, by theme, and the side-by-side comparisons.
export default function CollectionHubView({ hub }) {
  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Plan your trek"
        title="Trek collections and comparisons"
        subtitle="Treks by month and by theme, and two treks side by side: height, difficulty, season and price."
      />
      <div className="container">
        <section className="near-section">
          <h2 className="section-title">Treks by month</h2>
          <ul className="chip-list">
            {hub.months.map((m) => <li key={m.path}><Link className="chip chip--outline" to={m.path}>{m.title.replace('Treks in ', '')} · {m.count}</Link></li>)}
          </ul>
        </section>

        {byState(hub.themes).map(([state, items]) => (
          <section key={state} className="section near-section">
            <h2 className="section-title">{state}</h2>
            <ul className="near-cities">
              {items.map((t) => <li key={t.path}><Link to={t.path}>{t.title}</Link> <span>({t.count})</span></li>)}
            </ul>
          </section>
        ))}

        {hub.compare.length > 0 && (
          <section className="section near-section">
            <h2 className="section-title">Compare two treks</h2>
            {byState(hub.compare).map(([state, items]) => (
              <div key={state}>
                <h3 className="collection-hub__state">{state}</h3>
                <ul className="near-cities">
                  {items.map((c) => <li key={c.path}><Link to={c.path}>{c.title}</Link></li>)}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
