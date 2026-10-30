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
import OrganiserView from './components/near/OrganiserView';
import OrganiserHubView from './components/near/OrganiserHubView';
import WinterView from './components/near/WinterView';

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
export function renderTrek({ trek, links }, path) {
  return renderToString(<StaticRouter location={path}><TrekView trek={trek} links={links} /></StaticRouter>);
}

// The /app page (no data).
export function renderApp() {
  return renderToString(<StaticRouter location="/app"><AppView /></StaticRouter>);
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
