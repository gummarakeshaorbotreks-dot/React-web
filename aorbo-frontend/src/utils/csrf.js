// Reads Django's csrftoken cookie so React can safely POST to Django's
// built-in auth endpoints (django.contrib.auth.urls) from the SPA.
//
// Requirements on the Django side for this to work cross-origin in dev:
//   - CORS_ALLOWED_ORIGINS includes the Vite dev origin (e.g. http://localhost:5173)
//   - CORS_ALLOW_CREDENTIALS = True
//   - CSRF_TRUSTED_ORIGINS includes the same origin
// In production, if the React build is served from the same domain as
// Django, none of this cross-origin setup is needed.
export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
