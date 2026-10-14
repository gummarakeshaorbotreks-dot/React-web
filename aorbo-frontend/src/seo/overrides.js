// Page overrides from the admin / SEO bot (/api/seo-overrides/): a better title or
// description for one page, and FAQs shown on it. Used both by the build
// (scripts/seo-pages.mjs, so Google's first look has them) and in the browser
// (useSeo + PageFaq), so the two always agree.

/** Merges an override into a page's meta; adds the FAQs as FAQPage structured data. */
export function withOverride(meta, override) {
  if (!override) return meta;
  const out = { ...meta };
  if (override.title) out.title = override.title;
  if (override.description) out.description = override.description;
  const faqs = (override.faqs || []).filter((f) => f && f.q && f.a);
  if (faqs.length) {
    const faqPage = {
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    };
    const ld = meta.jsonLd;
    out.jsonLd = ld && ld['@graph']
      ? { ...ld, '@graph': [...ld['@graph'], faqPage] }
      : { '@context': 'https://schema.org', '@graph': [ld, faqPage].filter(Boolean) };
  }
  return out;
}

/** { "/treks/Coorg": override, ... } from the API's {"results": [...]} */
export const indexOverrides = (data) => Object.fromEntries(((data && data.results) || []).map((o) => [o.path, o]));

let pending = null;

/** The browser's copy, fetched once per visit; {} if the API is unreachable. */
export function loadOverrides(apiBase) {
  if (!pending) {
    pending = fetch(`${apiBase}/api/seo-overrides/`)
      .then((r) => (r.ok ? r.json() : null))
      .then(indexOverrides)
      .catch(() => ({}));
  }
  return pending;
}
