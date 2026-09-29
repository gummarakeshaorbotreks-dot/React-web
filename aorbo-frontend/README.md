# Aorbo Treks — website frontend

React 19 + Vite single-page app for [aorbotreks.com](https://www.aorbotreks.com). Content and trek data come from the Django API in `../aorboweb`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

The API base URL comes from `VITE_API_URL` (see `.env.production`). In development it falls back to `http://127.0.0.1:8000`, so run the Django server locally.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/`, then pre-renders the home page (see below) |
| `npm run lint` | ESLint — must pass with 0 problems |
| `npm run test:e2e` | Playwright end-to-end tests (needs the Django API running) |

## Project structure

```
src/
  api/client.js        The only place that talks to the API (base URL, getJSON, logClick…)
  hooks/useApi.js      Data loading for pages: { data, loading, error }
  data/                Static content shared by several pages (travel categories)
  components/
    layout/            Navbar, Footer, CookieBanner
    ui/                Building blocks: PageHeader, SectionHeading, InfoCard, FactList,
                       Pagination, Loader, EmptyState
    trek/              TrekCard + TrekGrid, DetailHero
    blog/  home/  legal/
  pages/               One file per route (see routes.jsx)
  routes.jsx           Route list; every page except Home is loaded on demand
  entry-prerender.jsx  Build-time render of the home page (used by scripts/prerender.mjs)
  styles/
    theme.css          Design tokens: colours, type scale, spacing, radius, shadows
    ui.css             Shared classes: .page, .section, .surface, .button, .chip, .grid…
    <Page>.css         Only layout that is unique to that page
  utils/               Formatting, slugs, form validation, crash reporting
tests/                 Playwright specs, with page objects in tests/pages
```

## Design rules

The site has one theme. Keep it that way:

1. **Colours, sizes, radii and shadows come from `theme.css` variables.** No hex values in page CSS or JSX, no `style={{…}}` objects.
2. **Every inner page starts with `<PageHeader>`** (eyebrow, title, subtitle) and wraps its content in `.container`.
3. **Content lives in cards** (`.surface` / `<InfoCard>`). Lists of treks use `<TrekGrid>`; paginated lists use `<Pagination>`.
4. **Every data-driven view handles three states**: `<Loader>` while loading, `<EmptyState>` when empty or failed, then the content. Messages are written for travellers, not developers.
5. **Icons are [lucide-react](https://lucide.dev/icons)** — no emoji in the UI.
6. **Only clickable things move on hover.**
7. Breakpoints: 576 / 768 / 992 / 1200px (no CSS framework — don't add Bootstrap back).
8. No `console.log` in `src/` — errors surface in the UI or go to `utils/crashReporter.js`.

## How the site stays fast

Most visitors are on phones, often on slow connections, and the server is in Europe. The build is set up so the first screen needs as little as possible:

- **Pre-rendered home page.** `npm run build` renders the home page to HTML and inlines all CSS into `dist/index.html` (`scripts/prerender.mjs`). The page appears as soon as that one ~10 KB file arrives; React then takes over the same HTML (`hydrateRoot` in `main.jsx`). Because of this, **components must not read `window`, `localStorage` etc. while rendering** — do it in `useEffect` — or the build breaks / the page flickers.
- **Early data.** On the home page, `index.html` starts the treks request before the JavaScript arrives; `useApi` picks it up.
- **Code per page.** Only Home is in the main bundle; other pages load when opened (`routes.jsx`).
- **Images.** Use AVIF/WebP at the size they're shown, give `<img>` a `width`/`height`, and `loading="lazy"` for anything below the first screen. The hero has separate wide (desktop) and narrow (phone) files in `public/images/hero/`.
- **Service worker** (`public/sw.js`, production only). Repeat visits load the site, photos and trek data from the phone, then refresh in the background, so the site opens instantly and even works offline. After a deploy, visitors get the new version on their next visit; a page whose code has changed reloads itself once. If you change what it caches, bump `VERSION` in `sw.js`. The file contains an emergency switch-off.

Recommended server settings (nginx):

```nginx
location /assets/  { expires 1y;  add_header Cache-Control "public, immutable"; }
location /images/  { expires 30d; add_header Cache-Control "public"; }
location = /sw.js  { add_header Cache-Control "no-cache"; }
location = /index.html { add_header Cache-Control "no-cache"; }
```
