import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Big image header shared by the trek and destination detail pages.
// badges: small chips above the title; meta: icon + text line under it.
export default function DetailHero({ image, title, badges = [], meta = [], price }) {
  const navigate = useNavigate();
  // Go back if the visitor came from inside the site, otherwise go home.
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'));

  return (
    <header className="detail-hero">
      {image && <img src={image} alt="" className="detail-hero__img" fetchPriority="high" decoding="async" />}
      <div className="detail-hero__shade" />

      <button type="button" className="button button--sm button--ghost-light detail-hero__back" onClick={goBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>

      <div className="detail-hero__content">
        {badges.length > 0 && (
          <ul className="chip-list">
            {badges.map(({ icon: Icon, label }) => (
              <li key={label} className="chip chip--glass">
                {Icon && <Icon aria-hidden="true" />} {label}
              </li>
            ))}
          </ul>
        )}
        <h1 className="detail-hero__title">{title}</h1>
        <div className="detail-hero__meta">
          {meta.filter((m) => m.label).map(({ icon: Icon, label }) => (
            <span key={label}>
              {Icon && <Icon aria-hidden="true" />} {label}
            </span>
          ))}
          {price && <span className="detail-hero__price">{price}</span>}
        </div>
      </div>
    </header>
  );
}
