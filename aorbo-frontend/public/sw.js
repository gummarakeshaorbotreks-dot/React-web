/* Aorbo Treks service worker: keeps the site's files, photos and trek data
   on the visitor's phone so repeat visits open instantly, even on a slow or
   flaky connection. Registered from src/main.jsx (production builds only).

   Emergency switch-off: replace this file's contents with
     self.addEventListener('install', () => self.skipWaiting());
     self.addEventListener('activate', (e) => e.waitUntil(caches.keys()
       .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
       .then(() => self.registration.unregister())));
   and deploy; every visitor's cache is cleared on their next visit. */

const VERSION = 'v1';
const CACHES = {
  pages: `pages-${VERSION}`,
  code: `code-${VERSION}`,
  images: `images-${VERSION}`,
  data: `data-${VERSION}`,
};
const MAX_ENTRIES = { [CACHES.code]: 60, [CACHES.images]: 150, [CACHES.data]: 80 };

// API responses worth keeping (lists and details). Search, contact form,
// click logging etc. always go to the network.
const CACHEABLE_API = /^\/api\/(treks\/(\?|[^/]+\/$)|blogs\/|travel-your-way\/|safety-tips\/|contact-info\/|social-media\/|content-sections\/)/;
const SUPABASE_HOST = 'xsconhhzyaiowokwsqne.supabase.co';

// Pages Django serves itself (admin, password reset, API, uploads). nginx sends
// these to Django, so they must never be answered with the React index.html.
const DJANGO_PAGES = /^\/(api|supersecretadmin|accounts|static|media)(\/|$)/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = Object.values(CACHES);
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function trim(cacheName) {
  const max = MAX_ENTRIES[cacheName];
  if (!max) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function put(cacheName, key, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(cacheName);
  await cache.put(key, response);
  await trim(cacheName);
}

// Files whose names never change (hashed bundles, Supabase uploads):
// use the saved copy if there is one.
async function cacheFirst(event, cacheName) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  event.waitUntil(put(cacheName, event.request, response.clone()));
  return response;
}

// Everything else we keep: answer from the saved copy immediately and
// refresh it in the background for next time.
async function staleWhileRevalidate(event, cacheName, key = event.request) {
  const cached = await caches.match(key);
  const fresh = fetch(event.request).then((response) => {
    event.waitUntil(put(cacheName, key, response.clone()));
    return response;
  });
  if (cached) {
    event.waitUntil(fresh.catch(() => {}));
    return cached;
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Every page of the site is the same index.html, so one saved copy serves all URLs.
  if (url.origin === self.location.origin && DJANGO_PAGES.test(url.pathname) && request.mode === 'navigate') return;

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event, CACHES.pages, new Request('/')));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(event, CACHES.code));
    else if (url.pathname.startsWith('/images/')) event.respondWith(staleWhileRevalidate(event, CACHES.images));
    return;
  }

  if (url.hostname === SUPABASE_HOST && url.pathname.startsWith('/storage/') && request.mode === 'cors') {
    event.respondWith(cacheFirst(event, CACHES.images));
    return;
  }

  if (url.pathname.startsWith('/api/') && CACHEABLE_API.test(url.pathname + url.search)) {
    event.respondWith(staleWhileRevalidate(event, CACHES.data));
  }
});
