import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
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
    <nav className="navbar site-nav" aria-label="Main">
      <div className="container site-nav__inner">
        <Link className="site-nav__brand" to="/" onClick={closeMenu}>
          <img src="/images/updated_logo.webp" alt="Aorbo Treks" className="nav-logo" width="156" height="61" />
        </Link>

        <button
          className="site-nav__toggle"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="site-menu"
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <div id="site-menu" className={`site-nav__menu${isOpen ? ' is-open' : ''}`}>
          <ul className="site-nav__links">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
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
