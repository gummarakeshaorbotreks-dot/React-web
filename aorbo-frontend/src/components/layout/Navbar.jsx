import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../../styles/Navbar.css';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About us' },
  { to: '/blogs', label: 'Blogs' },
  { to: '/safety', label: 'Safety' },
  { to: '/contact', label: 'Contact us' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="navbar navbar-expand-lg site-nav sticky-top">
      <div className="container site-nav__inner">
        <Link className="navbar-brand" to="/" onClick={closeMenu}>
          <img src="/images/updated_logo.webp" alt="Aorbo Treks" className="nav-logo" />
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${isOpen ? ' show' : ''}`}>
          <ul className="navbar-nav site-nav__links">
            {NAV_LINKS.map(({ to, label }) => (
              <li className="nav-item" key={to}>
                <NavLink className="nav-link" to={to} end={to === '/'} onClick={closeMenu}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <span className="chip site-nav__cta">App coming soon</span>
        </div>
      </div>
    </nav>
  );
}
