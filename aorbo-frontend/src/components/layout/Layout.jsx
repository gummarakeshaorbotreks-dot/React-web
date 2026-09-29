import { Outlet, ScrollRestoration, useNavigation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import EmptyState from '../ui/EmptyState';

// The frame around every page.
export default function Layout() {
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

// Shown inside the normal header/footer if a page fails to load or crashes.
export function PageError() {
  return (
    <div className="container section">
      <EmptyState
        title="This page didn't load"
        text="Please check your connection and try again."
        action={<button type="button" className="button button--brand" onClick={() => window.location.reload()}>Try again</button>}
      />
    </div>
  );
}
