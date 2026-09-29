import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// The header every inner page starts with: optional back link, eyebrow,
// title, subtitle, and an optional slot (e.g. filter chips) underneath.
export default function PageHeader({ eyebrow, title, subtitle, back, children }) {
  return (
    <header className="page-header">
      <div className="container">
        {back && (
          <Link to={back.to} className="page-header__back">
            <ArrowLeft size={16} aria-hidden="true" /> {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {children && <div className="page-header__extra">{children}</div>}
      </div>
    </header>
  );
}
