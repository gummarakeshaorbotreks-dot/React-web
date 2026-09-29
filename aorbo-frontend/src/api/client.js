// Single place that knows where the Django API lives and how to talk to it.
// Pages import these helpers instead of building fetch() calls by hand.

export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const PLACEHOLDER_IMAGE = '/images/placeholder.svg';

// GET a JSON endpoint. Throws on network errors and non-2xx responses so
// callers can show an error state instead of rendering half-empty pages.
export async function getJSON(path, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

// POST JSON and return { ok, data } without throwing on 4xx, so forms can
// show the server's validation message.
export async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// Fire-and-forget POST for analytics-style calls; failures are ignored so
// they can never block navigation.
function sendBeaconJSON(path, body) {
  fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

// Records a trek/tag/search click for the admin analytics.
// trekId must be a real trek id (or empty) — the API looks it up by id.
export function logClick({ trekId = '', query = '', tag = '' } = {}) {
  sendBeaconJSON('/api/treks/log-click/', { trek_id: trekId, query, tag });
}

// Saves an OpenStreetMap destination as a draft trek for the team to review.
export function saveOsmDraft({ name, display_name, lat, lon, category }) {
  sendBeaconJSON('/api/treks/create-from-osm/', { name, display_name, lat, lon, category });
}

// Media fields come back either absolute or relative to the API host.
export function mediaUrl(url, fallback = PLACEHOLDER_IMAGE) {
  if (!url) return fallback;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

export const qs = (params) => new URLSearchParams(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
).toString();
