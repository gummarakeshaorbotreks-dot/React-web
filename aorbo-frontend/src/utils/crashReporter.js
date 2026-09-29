import { API_BASE as BACKEND_URL } from '../api/client';

// Fire-and-forget by design: a failure reporting a crash must never itself
// throw or block the page from continuing to render its fallback UI.
export function reportCrash({ error_message, stack_trace = '', severity = 'error', extra_context = null }) {
  if (!error_message) return;
  try {
    fetch(`${BACKEND_URL}/api/crash-report/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_message: String(error_message).slice(0, 5000),
        stack_trace: String(stack_trace || '').slice(0, 10000),
        severity,
        platform: 'web',
        route: window.location.pathname,
        app_version: import.meta.env.VITE_APP_VERSION || '',
        extra_context,
      }),
    }).catch(() => {});
  } catch {
    // no-op — crash reporting must never crash the crash reporter
  }
}

let installed = false;

// Catches errors React's error boundary can't: async code, event handlers,
// timers, and rejected promises. Call once at app startup (main.jsx) — this
// covers every page, since it's a window-level listener, not per-component.
export function initGlobalCrashHandlers() {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    reportCrash({
      error_message: event.message || 'Unknown window error',
      stack_trace: event.error?.stack || '',
      severity: 'error',
      extra_context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportCrash({
      error_message: reason?.message || String(reason) || 'Unhandled promise rejection',
      stack_trace: reason?.stack || '',
      severity: 'error',
      extra_context: { type: 'unhandledrejection' },
    });
  });
}
