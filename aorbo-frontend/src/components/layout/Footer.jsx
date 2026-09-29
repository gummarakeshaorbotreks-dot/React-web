import { Link } from 'react-router-dom';
import '../../styles/Footer.css';

const COLUMNS = [
  {
    title: 'About Aorbo',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/contact', label: 'Contact us' },
    ],
  },
  {
    title: 'Information',
    links: [
      { to: '/terms', label: 'T&C' },
      { to: '/privacy-policy', label: 'Privacy Policy' },
      { to: '/blogs', label: 'Blogs' },
      { to: '/user-agreement', label: 'User Agreement' },
      { href: '#', label: 'Insurance Partner' },
    ],
  },
];

const SOCIALS = [
  { name: 'Instagram', icon: '/images/Instagram.webp', href: 'https://www.instagram.com/aorbo_treks_official?igsh=MWFlYXo4eGUzeDRoeQ==' },
  { name: 'Quora', icon: '/images/Quora.webp', href: 'https://www.quora.com/profile/Aorbo-Treks?ch=3&oid=2916133467&share=ad038b63&srid=uPcJFO&target_type=user' },
  { name: 'Facebook', icon: '/images/Facebook.webp', href: 'https://www.facebook.com/share/1EdiBukgY4/' },
  { name: 'X', icon: '/images/X.webp', href: 'https://x.com/Aorbo_treks?t=PeDDeVp4OHZ6qvESNbsWbg&s=08' },
];

const STORES = [
  { name: 'Get it on Google Play', img: '/images/Vector.webp', href: 'https://play.google.com/store' },
  { name: 'Download on the App Store', img: '/images/Vector-1.webp', href: 'https://www.apple.com/app-store/' },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo">
              <img src="/images/updated_logo.webp" alt="Aorbo Treks" width="156" height="61" loading="lazy" />
            </Link>
            <p>
              Aorbo Treks helps travellers find and book treks easily by connecting them with trusted trek
              organizers. Whether you're going solo or with a group, we make trekking simple and hassle-free.
            </p>
            <div className="site-footer__stores">
              {STORES.map((store) => (
                <a key={store.name} href={store.href} target="_blank" rel="noopener noreferrer">
                  <img src={store.img} alt={store.name} width="150" height="45" loading="lazy" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="site-footer__heading">{column.title}</h2>
              <ul className="site-footer__links">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? <Link to={link.to}>{link.label}</Link> : <a href={link.href}>{link.label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="site-footer__heading">Follow our socials</h2>
            <div className="site-footer__socials">
              {SOCIALS.map((social) => (
                <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.name}>
                  <img src={social.icon} alt="" width="18" height="18" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="site-footer__legal" suppressHydrationWarning>© {new Date().getFullYear()} Aorbo Treks. All rights reserved.</p>
      </div>
    </footer>
  );
}
