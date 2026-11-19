// Build-time only (see scripts/prerender.mjs): renders a page to plain HTML
// so the browser can paint it before the JavaScript has downloaded.
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouter, StaticRouterProvider } from 'react-router-dom';
import { routes } from './routes';
import NearView from './components/near/NearView';
import NearHubView from './components/near/NearHubView';
import DestinationView from './components/near/DestinationView';
import DestinationHubView from './components/near/DestinationHubView';
import RouteView from './components/near/RouteView';
import TrekView from './components/trek/TrekView';
import AppView from './components/AppView';
import About from './pages/About';
import OrganiserView from './components/near/OrganiserView';
import OrganiserHubView from './components/near/OrganiserHubView';
import WinterView from './components/near/WinterView';
import CompareView from './components/near/CompareView';
import CollectionView from './components/near/CollectionView';
import CollectionHubView from './components/near/CollectionHubView';
import RoadView, { RoadHubView } from './components/near/RoadView';
import TeluguTrekView, { TeluguHubView } from './components/lang/TeluguTrekView';

export async function render(path) {
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(`http://prerender.local${path}`));
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(<StaticRouterProvider router={router} context={context} hydrate={false} />);
}

// "Treks near <city>" pages and their index (scripts/seo-pages.mjs): the page
// content only; it goes inside the site frame's <main>.
export function renderNear(page) {
  return renderToString(<StaticRouter location={page.path}><NearView page={page} /></StaticRouter>);
}

export function renderNearHub(hub) {
  return renderToString(<StaticRouter location={hub.path}><NearHubView hub={hub} /></StaticRouter>);
}

// Trek pages (data: the API's trek object + destination / city links).
export function renderTrek({ trek, links, facts = null }, path) {
  return renderToString(<StaticRouter location={path}><TrekView trek={trek} links={links} facts={facts} /></StaticRouter>);
}

// Compare pages, collections and their index (scripts/fact-pages.mjs).
export function renderCompare(page) {
  return renderToString(<StaticRouter location={page.path}><CompareView page={page} /></StaticRouter>);
}

export function renderCollection(page) {
  return renderToString(<StaticRouter location={page.path}><CollectionView page={page} /></StaticRouter>);
}

export function renderCollectionHub(hub) {
  return renderToString(<StaticRouter location={hub.path}><CollectionHubView hub={hub} /></StaticRouter>);
}

// Route guides and their index (scripts/road-pages.mjs).
export function renderRoad(page) {
  return renderToString(<StaticRouter location={page.path}><RoadView page={page} /></StaticRouter>);
}

export function renderRoadHub(hub) {
  return renderToString(<StaticRouter location={hub.path}><RoadHubView hub={hub} /></StaticRouter>);
}

// Telugu trek guides and their index (scripts/lang-pages.mjs).
export function renderTelugu(page) {
  return renderToString(<StaticRouter location={page.path}><TeluguTrekView page={page} /></StaticRouter>);
}

export function renderTeluguHub(hub) {
  return renderToString(<StaticRouter location={hub.path}><TeluguHubView hub={hub} /></StaticRouter>);
}

// The /app page (no data).
export function renderApp() {
  return renderToString(<StaticRouter location="/app"><AppView /></StaticRouter>);
}

// The About page (static text; SEO plan 19 Nov 2026: its file used to carry the home page's body).
export function renderAbout() {
  return renderToString(<StaticRouter location="/about"><About /></StaticRouter>);
}

// Organiser profile pages and their index.
export function renderOrganiser(page) {
  return renderToString(<StaticRouter location={page.path}><OrganiserView page={page} /></StaticRouter>);
}

export function renderOrganiserHub(hub) {
  return renderToString(<StaticRouter location={hub.path}><OrganiserHubView hub={hub} /></StaticRouter>);
}

// Winter treks & snow trips (scripts/season-pages.mjs).
export function renderWinter(page) {
  return renderToString(<StaticRouter location={page.path}><WinterView page={page} /></StaticRouter>);
}

// "<destination> trips & treks" pages and their index.
export function renderDestination(page) {
  return renderToString(<StaticRouter location={page.path}><DestinationView page={page} /></StaticRouter>);
}

export function renderDestinationHub(hub) {
  return renderToString(<StaticRouter location={hub.path}><DestinationHubView hub={hub} /></StaticRouter>);
}

// "<destination> trip from <city>" pages (no index page: the destination page lists them).
export function renderRoute(page) {
  return renderToString(<StaticRouter location={page.path}><RouteView page={page} /></StaticRouter>);
}
