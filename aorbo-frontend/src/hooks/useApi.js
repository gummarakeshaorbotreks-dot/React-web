import { useEffect, useState } from 'react';
import { getJSON } from '../api/client';

const memoryCache = new Map();

// Warm the cache for a page the user is likely to open next.
export function prefetch(path) {
  if (memoryCache.has(path)) return;
  getJSON(path).then((data) => memoryCache.set(path, data)).catch(() => {});
}

// Loads `path` from the API and re-fetches whenever it changes.
// Pass `null` to skip. Returns { data, loading, error }.
// With { cache: true } responses are kept in memory for the session, so
// going back to a list you've already seen is instant.
export default function useApi(path, { cache = false } = {}) {
  const [result, setResult] = useState({ path: null, data: null, error: null });
  const cached = cache && path ? memoryCache.get(path) : undefined;

  useEffect(() => {
    if (!path || cached !== undefined) return undefined;
    const controller = new AbortController();
    getJSON(path, { signal: controller.signal })
      .then((data) => {
        if (cache) memoryCache.set(path, data);
        setResult({ path, data, error: null });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ path, data: null, error });
      });
    return () => controller.abort();
  }, [path, cache, cached]);

  if (!path) return { data: null, loading: false, error: null };
  if (cached !== undefined) return { data: cached, loading: false, error: null };
  if (result.path !== path) return { data: null, loading: true, error: null };
  return { data: result.data, loading: false, error: result.error };
}
