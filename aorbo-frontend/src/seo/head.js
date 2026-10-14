// Writes a page's tags into <head>, editing the tags index.html already has
// (React 19 would ADD a second <title>, and browsers use the first one).
// Pure DOM so it is cheap and testable; useSeo calls it on every page.
import { DEFAULT_IMAGE, SITE_NAME, absoluteUrl } from './meta';

function upsert(selector, create, set) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  set(el);
  return el;
}

function meta(attr, key, content) {
  upsert(
    `meta[${attr}="${key}"]`,
    () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      return m;
    },
    (m) => m.setAttribute('content', content),
  );
}

export function applyHead({ title, description, path, image, type = 'website', noindex = false, jsonLd = null }) {
  if (typeof document === 'undefined') return;
  const url = absoluteUrl(path || window.location.pathname);
  const img = image || DEFAULT_IMAGE;
  document.title = title;
  meta('name', 'description', description);
  meta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  meta('property', 'og:site_name', SITE_NAME);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:type', type);
  meta('property', 'og:url', url);
  meta('property', 'og:image', img);
  meta('property', 'og:locale', 'en_IN');
  meta('name', 'twitter:card', 'summary_large_image');
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  meta('name', 'twitter:image', img);
  upsert(
    'link[rel="canonical"]',
    () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    },
    (l) => l.setAttribute('href', url),
  );
  const ld = document.head.querySelector('script#ld-json');
  if (jsonLd) {
    upsert(
      'script#ld-json',
      () => {
        const s = document.createElement('script');
        s.id = 'ld-json';
        s.type = 'application/ld+json';
        return s;
      },
      (s) => {
        s.textContent = JSON.stringify(jsonLd);
      },
    );
  } else if (ld) {
    ld.remove();
  }
}
