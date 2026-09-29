import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Start every new page at the top. If the URL has #anchor, scroll to that
// element instead (used by paginated sections further down a page).
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
  }, [pathname, search, hash]);

  return null;
}
