# Cross-origin cookie fix for /admin-dashboard 403

## Root cause
The four Django settings were already correct. The 403 happens because the React
dashboard fetches RELATIVE URLs (`/api/admin/...`) through the Vite proxy. The
Django session cookie is host-per-port (host-only for `localhost:8000`), so the
browser does NOT send it to `localhost:5173` requests — Django never sees the
session and returns JSON 403 (`is_staff: false`).

## Fix (option 2 approved)
- [x] Add `SESSION_COOKIE_DOMAIN = 'localhost'` and `CSRF_COOKIE_DOMAIN = 'localhost'`
      (DEBUG only) to `aorboweb/aorbo_project/settings.py` so the cookie is shared
      across all localhost ports.
- [x] Confirm `aorbo-frontend/vite.config.js` proxies `/api` and `/supersecretadmin`
      to `http://localhost:8000`.
- [x] Confirm `AdminDashboard.jsx` uses relative `/api/admin/...` paths with
      `credentials: 'include'`.
- [x] Update `ContactSubmissionsManager.jsx` admin POST fetches to use
      `credentials: 'include'` (was `'same-origin'`) so the shared cookie is sent.
- [ ] Restart Django server (so the new session-cookie domain takes effect) and have the user refresh `/admin-dashboard` to verify.

## Admin dashboard brand redesign (visual/CSS only)
- [x] `SearchAnalyticsDashboard.css` — Aorbo brand theme (yellow #facc15 active filter, orange #f97316 accents, dark slate #1e293b text, #f8fafc bg, 12px radius + shadows on stat/chart cards, responsive 2x2 stat cards + stacked charts, 8/16/24px spacing scale)
- [x] `SearchAnalyticsDashboard.jsx` — rebuilt to match original searchlog_changelist.html layout: single column (filter row → 4-col metrics grid → 2-col charts grid → bottom divider); no #dj-header, breadcrumbs, or sidebar; year group = This Year button + dropdown grouped together; Aorbo brand styling retained
- [x] `SearchAnalyticsDashboard.css` — removed #dj-header, .dj-breadcrumbs, #dj-changelist-filter chrome CSS; added .analytics-filter, .year-group, .analytics-divider styles; kept Aorbo brand (yellow #facc15 active, orange #f97316 hover, 12px radius + shadows, responsive 2x2 metrics + stacked charts)
- [x] `ContactSubmissionsManager.css` — same Aorbo brand theme applied to header, toolbar, table, badges, buttons, filter panel, toast
- [x] `VisitorStats.jsx` — converted inline styles → class-based using new `VisitorStats.css` (same Aorbo brand theme, no component structure changed)
- [x] Verify build still passes (`npm run build` in aorbo-frontend) — passed, 1819 modules, CSS 275.34 kB
