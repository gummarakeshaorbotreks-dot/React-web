import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useNavigation } from 'react-router-dom';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CookieBanner from './components/layout/CookieBanner';
import Loader from './components/ui/Loader';
import Home from './pages/Home';

// Every page except Home is its own bundle, downloaded only when opened.
// The router loads a page's code *before* rendering it (instead of
// <Suspense>), so images on the page are requested once, not twice.
const page = (load) => async () => ({ Component: (await load()).default });

function Layout() {
  const navigation = useNavigation();

  return (
    <>
      <ScrollRestoration />
      {navigation.state === 'loading' && <div className="route-progress" role="progressbar" aria-label="Loading page" />}
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    HydrateFallback: Loader,
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
      { path: 'treks/:id', lazy: page(() => import('./pages/CardDetails')) },
      { path: 'treks/:id/details', lazy: page(() => import('./pages/CardDetails')) },
      { path: 'destination/:slug', lazy: page(() => import('./pages/DestinationDetails')) },
      { path: 'travel-your-way', lazy: page(() => import('./pages/TravelYourWay')) },
      { path: '*', lazy: page(() => import('./pages/NotFound')) },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
