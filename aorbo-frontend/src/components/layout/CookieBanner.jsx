import { useState, useSyncExternalStore } from 'react';
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

const noSubscription = () => () => {};

export default function CookieBanner() {
  // The pre-built HTML has no banner, so it starts hidden and appears right
  // after the page takes over (the "server snapshot" is used for that first pass).
  const hasConsent = useSyncExternalStore(noSubscription, () => Boolean(readConsent()), () => true);
  const [dismissed, setDismissed] = useState(false);

  if (hasConsent || dismissed) return null;

  const choose = (value) => {
    saveConsent(value);
    setDismissed(true);
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
