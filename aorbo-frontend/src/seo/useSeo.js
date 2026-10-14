import { useEffect } from 'react';
import { applyHead } from './head';

/**
 * Sets this page's title, description, canonical address and structured data
 * while the page is on screen. Pass null while data is loading: the tags the
 * page's own HTML file already carries stay in place.
 */
export default function useSeo(meta) {
  const key = meta ? JSON.stringify(meta) : '';
  useEffect(() => {
    if (meta) applyHead(meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the meta itself
  }, [key]);
}
