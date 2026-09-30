import Layout, { PageError } from './components/layout/Layout';
import Loader from './components/ui/Loader';
import Home from './pages/Home';
import { pendingUrl } from './navigationTarget';

const RELOAD_FLAG = 'aorbo:reloaded-for-new-version';

// Every page except Home is its own bundle, downloaded only when opened.
// The router loads a page's code *before* rendering it (instead of
// <Suspense>), so images on the page are requested once, not twice.
// If a bundle is missing because a new version was deployed while this tab
// was open (or a cached page is older than the server), reload once to pick
// up the new version instead of showing a broken page.
const page = (load) => async () => {
  try {
    const module = await load();
    sessionStorage.removeItem(RELOAD_FLAG);
    return { Component: module.default };
  } catch (error) {
    if (typeof window !== 'undefined' && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      // Go to the page the visitor was opening (the address bar hasn't changed yet).
      window.location.assign(pendingUrl() || window.location.href);
      return new Promise(() => {}); // wait for the reload
    }
    throw error;
  }
};

export const routes = [
  {
    path: '/',
    Component: Layout,
    HydrateFallback: Loader,
    children: [
      {
        ErrorBoundary: PageError,
        children: [
          { index: true, Component: Home },
          { path: 'about', lazy: page(() => import('./pages/About')) },
          { path: 'blogs', lazy: page(() => import('./pages/Blogs')) },
          { path: 'blogs/:slug', lazy: page(() => import('./pages/BlogDetail')) },
          { path: 'contact', lazy: page(() => import('./pages/Contact')) },
          { path: 'safety', lazy: page(() => import('./pages/Safety')) },
          { path: 'terms', lazy: page(() => import('./pages/Terms')) },
          { path: 'privacy-policy', lazy: page(() => import('./pages/PrivacyPolicy')) },
          { path: 'user-agreement', lazy: page(() => import('./pages/UserAgreement')) },
          { path: 'refund-policy', lazy: page(() => import('./pages/RefundPolicy')) },
          { path: 'treks/:id', lazy: page(() => import('./pages/CardDetails')) },
          { path: 'treks/:id/details', lazy: page(() => import('./pages/CardDetails')) },
          { path: 'destination/:slug', lazy: page(() => import('./pages/DestinationDetails')) },
          { path: 'travel-your-way', lazy: page(() => import('./pages/TravelYourWay')) },
          { path: '*', lazy: page(() => import('./pages/NotFound')) },
        ],
      },
    ],
  },
];
