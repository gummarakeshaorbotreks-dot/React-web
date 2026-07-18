import React from 'react';

// Converted from aorboweb/templates/admin/base_site.html
// This one just customizes Django admin's branding header — there's no
// real "page" here to route to. Kept as a component in case a future
// custom dashboard wants the same header/logo treatment.
export default function AdminBranding() {
  return (
    <h1 id="site-name" style={{ margin: 0 }}>
      <a href="/supersecretadmin/" style={{ color: 'inherit', textDecoration: 'none' }}>
        🏔️ Aorbo Treks Admin
      </a>
    </h1>
  );
}
