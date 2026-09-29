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
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint — must pass with 0 problems |
| `npm run test:e2e` | Playwright end-to-end tests (needs the Django API running) |

## Project structure

```
src/
  api/client.js        The only place that talks to the API (base URL, getJSON, logClick…)
  hooks/useApi.js      Data loading for pages: { data, loading, error }
  data/                Static content shared by several pages (travel categories)
  components/
    layout/            Navbar, Footer, CookieBanner, ScrollToTop
    ui/                Building blocks: PageHeader, SectionHeading, InfoCard, FactList,
                       Pagination, Loader, EmptyState
    trek/              TrekCard + TrekGrid, DetailHero
    blog/  home/  legal/
  pages/               One file per route (see App.jsx)
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
7. Breakpoints match Bootstrap: 576 / 768 / 992 / 1200px.
8. No `console.log` in `src/` — errors surface in the UI or go to `utils/crashReporter.js`.
