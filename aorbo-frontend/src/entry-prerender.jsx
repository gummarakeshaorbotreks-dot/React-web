// Build-time only (see scripts/prerender.mjs): renders a page to plain HTML
// so the browser can paint it before the JavaScript has downloaded.
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouter, StaticRouterProvider } from 'react-router-dom';
import { routes } from './routes';
import NearView from './components/near/NearView';
import NearHubView from './components/near/NearHubView';

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
