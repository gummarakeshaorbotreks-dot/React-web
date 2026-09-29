import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/CookieBanner.css';

const STORAGE_KEY = 'cookieConsent';

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return 'unavailable'; // storage blocked: don't nag on every page
  }
}

function saveConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage blocked — the banner simply hides for this visit
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !readConsent());

  if (!visible) return null;

  const choose = (value) => {
    saveConsent(value);
    setVisible(false);
  };

  return (
    <div id="cookie-banner" className="cookie-banner" role="region" aria-label="Cookie consent">
      <p className="cookie-banner__text">
        We use cookies to personalize your experience.{' '}
        <Link to="/privacy-policy">Learn more</Link>
      </p>
      <div className="cookie-banner__actions">
        <button type="button" onClick={() => choose('declined')} className="button button--sm button--ghost-light">
          Decline
        </button>
        <button type="button" onClick={() => choose('accepted')} className="button button--sm button--brand">
          Accept
        </button>
      </div>
    </div>
  );
}
