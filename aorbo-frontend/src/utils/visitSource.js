// Did Google bring bookings? (SEO plan phase 2, 19 Nov 2026). The website never takes payment:
// people book in the app, through a "Book on Aorbo" link (aorbotreks.co.in/t/<code>) or the
// Play Store. So, per visit:
//   - where the visitor came from (google, bing, chatgpt... or direct) and the kind of page they
//     landed on (trek, compare, collection...) are kept for the visit (sessionStorage);
//   - a click on a booking or app link is logged with both (the site's own click log, tag
//     "out:<book|app>;src:<source>;land:<page kind>"), and the Play Store link carries them as
//     its install referrer (utm_source=aorbotreks.com, utm_medium=<source>, utm_campaign=<page
//     kind>), which Play Console reports per install.
// Nothing personal is stored or sent: no address, no query text, no id.
// Plain JavaScript with no app imports (tested in Node); main.jsx passes in the click logger.

const KEY = 'aorbo:landing';
const PLAY = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.aorbotreks\.app/;
const SHARE = /^https:\/\/aorbotreks\.co\.in\/t\/[A-Za-z0-9]{8}$/;
const SOURCES = [
  [/(^|\.)google\./, 'google'], [/(^|\.)bing\.com$/, 'bing'], [/(^|\.)duckduckgo\.com$/, 'duckduckgo'], [/(^|\.)yahoo\./, 'yahoo'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'chatgpt'], [/(^|\.)perplexity\.ai$/, 'perplexity'], [/(^|\.)(instagram|facebook)\.com$/, 'meta'],
  [/(^|\.)youtube\.com$/, 'youtube'],
];

/** "www.google.co.in" -> "google"; our own site or nothing -> "direct"; anything else -> "other". */
export function sourceOf(referrer, ownHost = 'aorbotreks.com') {
  let host = '';
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'direct';
  }
  if (!host || host === ownHost || host.endsWith(`.${ownHost}`)) return 'direct';
  return SOURCES.find(([re]) => re.test(host))?.[1] || 'other';
}

/** "/compare/a-vs-b" -> "compare"; "/" -> "home". */
export function pageKind(pathname) {
  const first = String(pathname || '/').split('/')[1] || '';
  const kinds = { '': 'home', treks: 'trek', compare: 'compare', collections: 'collection', 'treks-near': 'near', destinations: 'destination', organisers: 'organiser', 'winter-treks': 'season', blogs: 'blog', app: 'app' };
  return kinds[first] || 'other';
}

/** The Play Store link with this visit's source as its install referrer. */
export function playStoreWithSource(href, { src, land }) {
  if (!PLAY.test(href) || /[?&]referrer=/.test(href)) return href;
  return `${href}&referrer=${encodeURIComponent(`utm_source=aorbotreks.com&utm_medium=${src}&utm_campaign=${land}`)}`;
}

function landing() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (saved?.src && saved?.land) return saved;
    const fresh = { src: sourceOf(document.referrer, window.location.hostname), land: pageKind(window.location.pathname) };
    sessionStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return { src: sourceOf(document.referrer, window.location.hostname), land: pageKind(window.location.pathname) };
  }
}

/** Call once in the browser with the click logger (api/client logClick): remembers the landing, tags booking / app clicks. */
export function trackVisitSource(logClick) {
  const visit = landing();
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.href;
    const kind = SHARE.test(href) ? 'book' : PLAY.test(href) ? 'app' : null;
    if (!kind) return;
    if (kind === 'app') a.href = playStoreWithSource(href, visit);
    logClick({ tag: `out:${kind};src:${visit.src};land:${visit.land};on:${pageKind(window.location.pathname)}` });
  }, { capture: true });
}
