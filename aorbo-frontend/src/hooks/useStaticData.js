import { useEffect, useState } from 'react';

// A JSON file the build wrote next to the site (e.g. /data/near/hyderabad.json).
// When the page's HTML was built ahead of time, the same data is already in it
// (<script id="page-data" data-file="…">), so the first render needs no request.
function embedded(file) {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById('page-data');
  if (!el || el.dataset.file !== file) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

export default function useStaticData(file) {
  // Keyed by file, so another page never shows this page's data.
  const [loaded, setLoaded] = useState(() => ({ file, data: embedded(file), error: null }));

  useEffect(() => {
    if (loaded.file === file && (loaded.data || loaded.error)) return undefined;
    let current = true;
    const found = embedded(file);
    Promise.resolve(found || fetch(file).then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    }))
      .then((data) => current && setLoaded({ file, data, error: null }))
      .catch((error) => current && setLoaded({ file, data: null, error }));
    return () => {
      current = false;
    };
  }, [file, loaded]);

  return loaded.file === file ? loaded : { file, data: null, error: null };
}
