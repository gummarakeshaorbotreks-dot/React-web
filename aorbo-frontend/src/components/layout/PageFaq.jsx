import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE } from '../../api/client';
import { loadOverrides } from '../../seo/overrides';
import '../../styles/PageFaq.css';

// FAQs added to a page from the admin / SEO bot (SEO overrides). Shown on the page
// itself because Google only accepts FAQ structured data that visitors can see.
// Loads after the page renders (nothing here touches `window` while rendering).
export default function PageFaq() {
  const { pathname } = useLocation();
  // Remembers which page the FAQs belong to, so another page never shows them.
  const [loaded, setLoaded] = useState({ path: null, faqs: [] });

  useEffect(() => {
    let current = true;
    loadOverrides(API_BASE).then((overrides) => {
      const found = (overrides[pathname] && overrides[pathname].faqs) || [];
      if (current) setLoaded({ path: pathname, faqs: found.filter((f) => f && f.q && f.a) });
    });
    return () => {
      current = false;
    };
  }, [pathname]);

  const faqs = loaded.path === pathname ? loaded.faqs : [];
  if (!faqs.length) return null;
  return (
    <section className="page-faq section" aria-labelledby="page-faq-title">
      <div className="container container--narrow">
        <h2 id="page-faq-title" className="page-faq__title">Frequently asked questions</h2>
        {faqs.map((f) => (
          <details key={f.q} className="page-faq__item">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
