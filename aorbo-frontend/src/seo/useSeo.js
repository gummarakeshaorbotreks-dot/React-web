import { useEffect } from 'react';
import { API_BASE } from '../api/client';
import { applyHead } from './head';
import { loadOverrides, withOverride } from './overrides';

/**
 * Sets this page's title, description, canonical address and structured data
 * while the page is on screen. Pass null while data is loading: the tags the
 * page's own HTML file already carries stay in place. A page override from the
 * admin / SEO bot (/api/seo-overrides/) wins, exactly as in the built HTML.
 */
export default function useSeo(meta) {
  const key = meta ? JSON.stringify(meta) : '';
  useEffect(() => {
    if (!meta) return undefined;
    let current = true;
    applyHead(meta);
    loadOverrides(API_BASE).then((overrides) => {
      const override = overrides[meta.path || window.location.pathname];
      if (current && override) applyHead(withOverride(meta, override));
    });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the meta itself
  }, [key]);
}
