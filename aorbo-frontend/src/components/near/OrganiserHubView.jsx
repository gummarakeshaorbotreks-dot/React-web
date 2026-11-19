import { Link } from 'react-router-dom';
import Stars from '../reviews/Stars';
import '../../styles/Reviews.css';
import PageHeader from '../ui/PageHeader';
import '../../styles/TreksNear.css';

// Every trek organiser on Aorbo Treks.
export default function OrganiserHubView({ hub }) {
  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Trek organisers"
        title="Trek organisers on Aorbo Treks"
        subtitle={`${hub.organisers.length} organisers. See each one's treks, places and prices, compare them and book in one place.`}
      />
      <div className="container">
        <ul className="near-list">
          {hub.organisers.map((o) => (
            <li key={o.slug}>
              <Link to={`/organisers/${o.slug}`}>{o.name}</Link>
              <span>{o.count} {o.count === 1 ? 'trek' : 'treks'}{o.states.length ? ` · ${o.states.slice(0, 3).join(', ')}${o.states.length > 3 ? '…' : ''}` : ''}</span>
              {o.rating && <span className="rating-line rating-line--compact"><Stars value={o.rating.value} size={13} /> {o.rating.value.toFixed(1)} · {o.rating.count} {o.rating.count === 1 ? 'review' : 'reviews'}</span>}
            </li>
          ))}
        </ul>
        <p className="near-note">Run treks yourself? <Link to="/contact">Get in touch to list them on Aorbo Treks</Link>.</p>
      </div>
    </div>
  );
}
