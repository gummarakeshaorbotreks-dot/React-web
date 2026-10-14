// What search engines and link previews see for each page: title,
// description, canonical address and structured data (schema.org JSON-LD).
//
// Plain JavaScript on purpose (no React, no Vite-only imports): the same table
// is used by the app (useSeo, while people move around the site) and by the
// build (scripts/seo-pages.mjs, which writes one HTML file per page so the
// very first HTML of every address already carries the right tags).

export const SITE_URL = 'https://aorbotreks.com';
export const SITE_NAME = 'Aorbo Treks';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.aorbotreks.app';

export const absoluteUrl = (path = '/') =>
  /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

/** Trims text to a search-result length on a word boundary. */
export function snippet(text, max = 158) {
  const plain = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 60 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  legalName: 'AORBO INFOCOM',
  url: SITE_URL,
  logo: `${SITE_URL}/images/apple-touch-icon.png`,
  email: 'care@aorbotreks.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Hyderabad', addressRegion: 'Telangana', addressCountry: 'IN' },
  sameAs: [PLAY_STORE_URL],
};

const website = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en-IN',
};

const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });

function breadcrumb(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

/** Pages whose tags never depend on data. Keys are the site paths. */
export const STATIC_PAGES = {
  '/': {
    title: 'Aorbo Treks | Book Verified Treks Across India',
    description:
      'Find and book treks across India from verified trek organisers. Compare Himalayan, Western Ghats and weekend treks by price, duration and reviews, and book in minutes.',
    jsonLd: graph(organization, website),
  },
  '/about': {
    title: 'About Aorbo Treks | Verified Trek Organisers Across India',
    description:
      'Aorbo Treks connects trekkers with verified trek organisers across India. Learn how we check organisers, review every listing and help you book with confidence.',
    breadcrumb: [['Home', '/'], ['About', '/about']],
  },
  '/blogs': {
    title: 'Trek Guides, Packing Lists & Stories | Aorbo Treks Blog',
    description:
      'Trek guides, packing lists, safety tips and stories from the trail by the Aorbo Treks team. Plan your next trek in India with real advice.',
    breadcrumb: [['Home', '/'], ['Blogs', '/blogs']],
  },
  '/safety': {
    title: 'Trek Safety | How Aorbo Treks Keeps Your Trek Safe',
    description:
      'How Aorbo Treks verifies trek organisers, what to check before you book and how to stay safe on the trail. Safety tips for every trekker.',
    breadcrumb: [['Home', '/'], ['Safety', '/safety']],
  },
  '/contact': {
    title: 'Contact Aorbo Treks | Help With Your Trek Booking',
    description:
      'Questions about a trek or a booking? Write to the Aorbo Treks team at care@aorbotreks.com or send us a message, and we will get back to you.',
    breadcrumb: [['Home', '/'], ['Contact', '/contact']],
  },
  '/travel-your-way': {
    title: 'Travel Your Way | Treks by Style and Season | Aorbo Treks',
    description:
      'Browse treks by how you like to travel: weekend getaways, beginner-friendly trails, snow treks and more, from verified organisers across India.',
    breadcrumb: [['Home', '/'], ['Travel your way', '/travel-your-way']],
  },
  '/terms': {
    title: 'Terms and Conditions | Aorbo Treks',
    description: 'The terms and conditions for using the Aorbo Treks website and mobile app to find and book treks.',
    breadcrumb: [['Home', '/'], ['Terms and Conditions', '/terms']],
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Aorbo Treks',
    description: 'How Aorbo Treks collects, uses and protects your personal information on the website and the mobile app.',
    breadcrumb: [['Home', '/'], ['Privacy Policy', '/privacy-policy']],
  },
  '/user-agreement': {
    title: 'User Agreement | Aorbo Treks',
    description: 'The user agreement between you and Aorbo Treks for booking treks through the website and the mobile app.',
    breadcrumb: [['Home', '/'], ['User Agreement', '/user-agreement']],
  },
  '/refund-policy': {
    title: 'Refund & Cancellation Policy | Aorbo Treks',
    description:
      'How cancellations and refunds work for treks booked on Aorbo Treks: cancellation charges, refund amounts and how long a refund usually takes.',
    breadcrumb: [['Home', '/'], ['Refund & Cancellation Policy', '/refund-policy']],
  },
};

/** Tags for a static page; unknown paths get the home tags. */
export function staticPageMeta(path) {
  const page = STATIC_PAGES[path] || STATIC_PAGES['/'];
  return {
    title: page.title,
    description: page.description,
    path,
    jsonLd: page.jsonLd || (page.breadcrumb ? graph(breadcrumb(page.breadcrumb)) : null),
  };
}

/** Tags for a trek page, from the website API's trek object. */
export function trekMeta(trek) {
  const path = `/treks/${trek.id || trek.slug}`;
  const where = trek.state ? ` in ${trek.state}` : '';
  const price = trek.price_start != null ? ` from ₹${Number(trek.price_start).toLocaleString('en-IN')}` : '';
  const image = trek.main_image || trek.images?.[0]?.image_url || DEFAULT_IMAGE;
  const description = snippet(
    trek.description
      ? `${trek.name}${where}${price}. ${trek.description}`
      : `Book the ${trek.name}${where}${price} with verified trek organisers on Aorbo Treks. Compare dates, prices and itineraries.`,
  );
  const trip = {
    '@type': 'TouristTrip',
    name: trek.name,
    description,
    url: absoluteUrl(path),
    image,
    touristType: 'Trekking',
    provider: { '@id': `${SITE_URL}/#organization` },
    ...(trek.state ? { itinerary: { '@type': 'Place', name: trek.state, address: { '@type': 'PostalAddress', addressRegion: trek.state, addressCountry: 'IN' } } } : {}),
    ...(trek.price_start != null
      ? { offers: { '@type': 'Offer', price: Number(trek.price_start), priceCurrency: 'INR', url: absoluteUrl(path), availability: 'https://schema.org/InStock' } }
      : {}),
  };
  return {
    title: `${trek.name}${trek.state ? `, ${trek.state}` : ''} | Book with Aorbo Treks`,
    description,
    path,
    image,
    jsonLd: graph(trip, breadcrumb([['Home', '/'], ['Treks', '/'], [trek.name, path]])),
  };
}

/** Tags for a blog post, from the website API's blog object. */
export function blogMeta(blog) {
  const path = `/blogs/${blog.slug}`;
  const description = snippet(blog.excerpt || blog.content || blog.title);
  const image = blog.image_url || DEFAULT_IMAGE;
  return {
    title: `${blog.title} | Aorbo Treks Blog`,
    description,
    path,
    image,
    type: 'article',
    jsonLd: graph(
      {
        '@type': 'BlogPosting',
        headline: blog.title,
        description,
        image,
        url: absoluteUrl(path),
        mainEntityOfPage: absoluteUrl(path),
        ...(blog.created_at ? { datePublished: blog.created_at } : {}),
        ...(blog.updated_at ? { dateModified: blog.updated_at } : {}),
        author: { '@type': blog.author && blog.author !== 'Aorbo Treks Team' ? 'Person' : 'Organization', name: blog.author || SITE_NAME },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      breadcrumb([['Home', '/'], ['Blogs', '/blogs'], [blog.title, path]]),
    ),
  };
}

/** Pages that must stay out of search results. */
export const notFoundMeta = (path = '/404') => ({
  title: 'Page not found | Aorbo Treks',
  description: 'The page you are looking for may have moved or been removed.',
  path,
  noindex: true,
});
