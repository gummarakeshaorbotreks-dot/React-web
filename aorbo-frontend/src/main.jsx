import './styles/theme.css';
import './styles/ui.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { routerReady } from './router';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initGlobalCrashHandlers } from './utils/crashReporter';

initGlobalCrashHandlers();

// Keeps the site on the visitor's device so repeat visits open instantly
// (see public/sw.js). Production only, so development always sees fresh files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

const container = document.getElementById('root');
const app = (
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// On the home page the HTML was built ahead of time (scripts/prerender.mjs):
// React takes it over in place, so nothing is re-drawn or re-downloaded.
// On other pages the pre-built header/footer stay on screen until that page's
// code has loaded, then React draws the whole page in one go.
if (container.querySelector('#main[data-prerendered] > *')) {
  ReactDOM.hydrateRoot(container, app);
} else {
  routerReady().then(() => ReactDOM.createRoot(container).render(app));
}
