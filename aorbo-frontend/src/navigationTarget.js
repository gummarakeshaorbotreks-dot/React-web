// Remembers where an in-progress navigation is going, so a failed page load
// (see routes.jsx) can reload straight to that page. Kept separate from
// router.js to avoid a circular import with routes.jsx.
let pending = null;

export function setPendingLocation(location) {
  pending = location || null;
}

export function pendingUrl() {
  return pending ? `${pending.pathname}${pending.search}${pending.hash}` : null;
}
