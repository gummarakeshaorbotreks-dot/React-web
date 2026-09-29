import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CookieBanner from './components/layout/CookieBanner';
import ScrollToTop from './components/layout/ScrollToTop';
import Loader from './components/ui/Loader';

// Each page is its own bundle, so visitors only download what they open.
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const Contact = lazy(() => import('./pages/Contact'));
const Safety = lazy(() => import('./pages/Safety'));
const Terms = lazy(() => import('./pages/Terms'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const UserAgreement = lazy(() => import('./pages/UserAgreement'));
const CardDetails = lazy(() => import('./pages/CardDetails'));
const DestinationDetails = lazy(() => import('./pages/DestinationDetails'));
const TravelYourWay = lazy(() => import('./pages/TravelYourWay'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Navbar />

      <main id="main">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/:slug" element={<BlogDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/user-agreement" element={<UserAgreement />} />
            <Route path="/treks/:id" element={<CardDetails />} />
            <Route path="/treks/:id/details" element={<CardDetails />} />
            <Route path="/destination/:slug" element={<DestinationDetails />} />
            <Route path="/travel-your-way" element={<TravelYourWay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <CookieBanner />
    </Router>
  );
}
