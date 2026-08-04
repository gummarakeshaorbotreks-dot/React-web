import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';


// Global Layout Components
import Footer from './components/Footer';
import Navbar from './components/Navbar';

// Page Components
import About from './pages/About';
import BlogDetail from './pages/BlogDetail';
import Blogs from './pages/Blogs';
import CardDetails from './pages/CardDetails';
import Contact from './pages/Contact';
import DestinationDetails from './pages/DestinationDetails';
import Home from './pages/Home';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Safety from './pages/Safety';
import Terms from './pages/Terms';
import TravelYourWay from './pages/TravelYourWay';
import UserAgreement from './pages/UserAgreement';

// Auth + password reset pages (Django auth endpoints)
import Success from './pages/Success';
import ForgotPassword from './pages/auth/ForgotPassword';
import Lockout from './pages/auth/Lockout';
import ResetPasswordComplete from './pages/auth/ResetPasswordComplete';
import ResetPasswordConfirm from './pages/auth/ResetPasswordConfirm';
import ResetPasswordSent from './pages/auth/ResetPasswordSent';

// Admin dashboard (React conversion)
import AdminDashboard from './pages/AdminDashboard';

export default function App() {

  return (
    <Router>
      {/* Dynamic Global Header */}
      <Navbar />

      {/* Main App Page Routing Blueprint */}
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
        <Route path="/treks/:id" element={<CardDetails key={window.location.pathname} />} />   
        <Route path="/treks/:id/details" element={<CardDetails />} />
        <Route path="/destination/:slug" element={<DestinationDetails />} />
        <Route path="/travel-your-way" element={<TravelYourWay />} />

        {/* Auth + password reset routes */}
        <Route path="/success" element={<Success />} />

        {/* Staff-protected admin React dashboard (Django admin-backed JSON) */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        <Route path="/accounts/lockout" element={<Lockout />} />
        <Route path="/accounts/password_reset" element={<ForgotPassword />} />
        <Route path="/accounts/password_reset/done" element={<ResetPasswordSent />} />
        <Route path="/accounts/reset/:uidb64/:token" element={<ResetPasswordConfirm />} />
        <Route path="/accounts/reset/done" element={<ResetPasswordComplete />} />
      </Routes>

      {/* Dynamic Global Footer */}
      <Footer />
    </Router>
  );
}