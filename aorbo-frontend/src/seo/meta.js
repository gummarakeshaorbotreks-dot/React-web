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

// Organiser names the admin uses while the real one isn't entered yet.
export const isPlaceholderOperator = (name) => /update soon|to be (added|updated)|^tbd$|^n\/?a$/i.test(String(name || '').trim());

const asList = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);

/** Real organiser names of a trek, tidied ("cute vogayes" -> "Cute Vogayes"); not labels like "Aorbo Certified Partner". */
export const organisersOf = (trek) => asList(trek.operators)
  .filter((o) => !isPlaceholderOperator(o) && !/aorbo/i.test(o))
  .map((o) => (o === o.toLowerCase() ? o.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : o.trim()));

/** [{ name, count }] over a list of page treks (each with `operators`), most treks first. */
export function organiserCounts(treks) {
  const counts = new Map();
  for (const t of treks || []) for (const o of t.operators || []) counts.set(o, (counts.get(o) || 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const organiserAnswer = (orgs) => `On Aorbo Treks: ${joinNames(orgs.slice(0, 6).map((o) => `${o.name} (${o.count} ${o.count === 1 ? 'trek' : 'treks'})`))}.`
  + ' Each trek page shows who runs it.';
/** Day counts in "3D/2N,4D/3N" / "6 Days" / "5" (nights don't count). */
export function daysOf(duration) {
  const text = String(duration ?? '').trim();
  if (/^\d+$/.test(text)) return [Number(text)];
  return [...text.matchAll(/(\d+)\s*D/gi)].map((m) => Number(m[1]));
}

/**
 * Questions and answers shown on a trek page; the same text goes into its FAQPage data.
 * links (built by scripts/seo-pages.mjs): { destinations: [{slug, name, count}], near: [{slug, name, km}] }.
 */
export function trekFaqs(trek, links = null) {
  const name = trek.name;
  const faqs = [];
  const days = [...new Set(daysOf(trek.duration_days))].sort((a, b) => a - b);
  if (days.length) {
    faqs.push({
      q: `How many days is the ${name} trip?`,
      a: days.length === 1
        ? `${days[0]} ${days[0] === 1 ? 'day' : 'days'} (${trek.duration_days}).`
        : `It comes in ${joinNames(days.map((d) => `${d}-day`))} versions (${trek.duration_days}).`,
    });
  }
  if (trek.price_start != null && Number(trek.price_start) > 0) {
    faqs.push({ q: `What is the price of the ${name} trip?`, a: `It starts from ${rupees(trek.price_start)} per person on Aorbo Treks.` });
  }
  const departures = departureDays([trek.operating_days]);
  if (departures.length) {
    faqs.push({ q: `On which days does the ${name} trip start?`, a: `Departures are on ${joinNames(departures)}.` });
  }
  const near = links?.near || [];
  if (trek.state || near.length) {
    faqs.push({
      q: `Where is ${name}?`,
      a: [trek.state ? `In ${trek.state}.` : '', near.length ? `It is about ${near[0].km} km from ${near[0].name} in a straight line${near[1] ? `, and about ${near[1].km} km from ${near[1].name}` : ''}.` : '']
        .filter(Boolean).join(' '),
    });
  }
  const places = asList(trek.famous_places);
  if (places.length) faqs.push({ q: `What can I see on the ${name} trip?`, a: `The trip includes ${joinNames(places.slice(0, 6))}.` });
  const operators = asList(trek.operators).filter((o) => !isPlaceholderOperator(o));
  if (operators.length) {
    faqs.push({ q: `Who organises the ${name} trip?`, a: `${joinNames(operators)} ${operators.length === 1 ? 'runs' : 'run'} it; you book on Aorbo Treks.` });
  }
  return faqs;
}

/** Tags for a trek page, from the website API's trek object (links: see trekFaqs). */
export function trekMeta(trek, links = null) {
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
  const dest = links?.destinations?.find((d) => d.kind !== 'state') || links?.destinations?.[0];
  const crumbs = dest
    ? [['Home', '/'], ['Destinations', '/destinations'], [destinationHeading(dest), `/destinations/${dest.slug}`], [trek.name, path]]
    : [['Home', '/'], ['Treks', '/'], [trek.name, path]];
  return {
    title: `${trek.name}${trek.state ? `, ${trek.state}` : ''} | Book with Aorbo Treks`,
    description,
    path,
    image,
    jsonLd: graph(trip, breadcrumb(crumbs), faqPage(trekFaqs(trek, links))),
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

// ---------- "Treks near <city>" pages (data from scripts/near-pages.mjs) ----------

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
export const WEEKEND_MAX_DAYS = 2;
export const WEEKEND_MAX_KM = 300;

/** The facts every city page states, all computed from its data (nothing invented). */
export function nearFacts(page) {
  const treks = page.treks || [];
  const prices = treks.map((t) => t.price).filter((p) => p != null && Number(p) > 0).map(Number);
  const weekend = treks.filter((t) => t.days != null && t.days <= WEEKEND_MAX_DAYS && t.km <= WEEKEND_MAX_KM);
  const states = [...new Set(treks.map((t) => t.state).filter(Boolean))];
  return {
    nearest: treks[0],
    next: treks.slice(1, 3),
    weekend,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    states,
  };
}

/** Questions and answers shown on a city page; the same text goes into its FAQPage data. */
export function nearFaqs(page) {
  const { nearest, next, weekend, minPrice, maxPrice, states } = nearFacts(page);
  const city = page.name;
  if (!nearest) return [];
  const faqs = [{
    q: `Which is the nearest trek to ${city}?`,
    a: `${capital(nearest.name)}${nearest.state ? ` in ${nearest.state}` : ''}, about ${nearest.km} km from ${city} in a straight line.`
      + (next.length ? ` Next are ${joinNames(next.map((t) => `${capital(t.name)} (${t.km} km)`))}.` : ''),
  }];
  faqs.push(weekend.length
    ? {
      q: `Are there weekend treks near ${city}?`,
      a: `Yes. ${joinNames(weekend.slice(0, 4).map((t) => capital(t.name)))} ${weekend.length === 1 ? 'can' : 'can each'} be done in ${WEEKEND_MAX_DAYS} days or less and ${weekend.length === 1 ? 'is' : 'are'} within ${WEEKEND_MAX_KM} km of ${city}.`,
    }
    : {
      q: `Are there weekend treks near ${city}?`,
      a: `Not within ${WEEKEND_MAX_KM} km yet: the treks listed for ${city} take more than ${WEEKEND_MAX_DAYS} days or are further away. New treks are added regularly.`,
    });
  if (minPrice != null) {
    faqs.push({
      q: `How much does a trek near ${city} cost?`,
      a: minPrice === maxPrice
        ? `The treks listed here start from ${rupees(minPrice)} per person on Aorbo Treks.`
        : `Starting prices on Aorbo Treks for the treks listed here range from ${rupees(minPrice)} to ${rupees(maxPrice)} per person.`,
    });
  }
  if (states.length) {
    faqs.push({
      q: `Which states can I trek in from ${city}?`,
      a: `Within ${page.radius} km of ${city} there are treks in ${joinNames(states)}.`,
    });
  }
  const orgs = organiserCounts(page.treks);
  if (orgs.length) faqs.push({ q: `Which trek organisers run treks near ${city}?`, a: organiserAnswer(orgs) });
  faqs.push({
    q: `How do I book a trek near ${city}?`,
    a: 'Open a trek above, choose your dates and book on Aorbo Treks, on the website or in the Aorbo Treks app.',
  });
  return faqs;
}

const faqPage = (faqs) => (faqs.length ? {
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
} : null);

/** Tags for a "Treks near <city>" page. */
export function nearMeta(page) {
  const { nearest, weekend, minPrice } = nearFacts(page);
  const description = snippet(
    `${page.total} treks within ${page.radius} km of ${page.name}, ${page.state}.`
    + (nearest ? ` Nearest: ${capital(nearest.name)} (${nearest.km} km).` : '')
    + (weekend.length ? ` ${weekend.length} weekend trek${weekend.length > 1 ? 's' : ''}.` : '')
    + (minPrice != null ? ` Prices from ${rupees(minPrice)}.` : '')
    + ' Compare and book on Aorbo Treks.',
  );
  const url = absoluteUrl(page.path);
  return {
    title: `Treks near ${page.name} (${page.total} within ${page.radius} km) | Aorbo Treks`,
    description,
    path: page.path,
    image: page.treks?.find((t) => t.image)?.image || DEFAULT_IMAGE,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        name: `Treks near ${page.name}`,
        description,
        url,
        about: { '@type': 'Place', name: page.name, address: { '@type': 'PostalAddress', addressLocality: page.name, addressRegion: page.state, addressCountry: 'IN' } },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: page.treks.length,
          itemListElement: page.treks.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(`/treks/${t.id}`), name: t.name })),
        },
      },
      breadcrumb([['Home', '/'], ['Treks near you', '/treks-near'], [`Treks near ${page.name}`, page.path]]),
      faqPage(nearFaqs(page)),
    ),
  };
}

/** Tags for the list of all city pages. */
export function nearHubMeta(hub) {
  return {
    title: 'Treks Near You: Treks Near Your City or Town in India | Aorbo Treks',
    description: snippet(`Find the treks closest to you: ${hub.cities} cities and towns across India with the nearest treks, distances, weekend options and prices on Aorbo Treks.`),
    path: hub.path,
    jsonLd: graph(
      { '@type': 'CollectionPage', name: 'Treks near you', url: absoluteUrl(hub.path) },
      breadcrumb([['Home', '/'], ['Treks near you', hub.path]]),
    ),
  };
}

// ---------- "<destination> trips & treks" pages (scripts/destination-pages.mjs) ----------

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "THU, FRI, SAT" / "fri,sat" / "Wed, Thu, Fri ,Sat" -> ["Thursday", ...] in week order. */
export function departureDays(texts) {
  const found = new Set();
  for (const text of texts) {
    for (const token of String(text || '').toLowerCase().split(/[^a-z]+/)) {
      const day = WEEKDAYS.find((d) => token.length >= 3 && d.toLowerCase().startsWith(token.slice(0, 3)));
      if (day) found.add(day);
    }
  }
  return WEEKDAYS.filter((d) => found.has(d));
}

/** Title-style name of a destination page: "Gokarna trips and treks" / "Treks and trips in Kerala". */
export const destinationHeading = (page) => (page.kind === 'state' ? `Treks and trips in ${page.name}` : `${page.name} trips and treks`);

export function destinationFacts(page) {
  const treks = page.treks || [];
  const prices = treks.map((t) => t.price).filter((p) => p != null && Number(p) > 0).map(Number);
  const days = treks.map((t) => t.days).filter((d) => d != null);
  return {
    count: treks.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    minDays: days.length ? Math.min(...days) : null,
    maxDays: days.length ? Math.max(...days) : null,
    departures: departureDays(treks.map((t) => t.operating_days)),
  };
}

const dayRange = (a, b) => (a === b ? `${a} ${a === 1 ? 'day' : 'days'}` : `${a} to ${b} days`);

/** Questions and answers shown on a destination page; the same text goes into its FAQPage data. */
export function destinationFaqs(page) {
  const f = destinationFacts(page);
  const where = page.name;
  const trip = page.kind === 'state' ? `a trip in ${where}` : `a ${where} trip`;
  const faqs = [];
  if (f.minDays != null) {
    faqs.push({
      q: `How many days do you need for ${trip}?`,
      a: `Packages on Aorbo Treks ${page.kind === 'state' ? 'in' : 'for'} ${where} take ${dayRange(f.minDays, f.maxDays)}, depending on the package.`,
    });
  }
  if (f.minPrice != null) {
    faqs.push({
      q: `How much does ${trip} cost?`,
      a: f.minPrice === f.maxPrice
        ? `Packages start from ${rupees(f.minPrice)} per person on Aorbo Treks.`
        : `Starting prices on Aorbo Treks range from ${rupees(f.minPrice)} to ${rupees(f.maxPrice)} per person, depending on the package.`,
    });
  }
  if (page.places?.length) {
    faqs.push({
      q: `What can I see on ${trip}?`,
      a: `The packages here include ${joinNames(page.places.slice(0, 8))}.`,
    });
  }
  if (page.from?.length) {
    faqs.push({
      q: `How far is ${where} from ${page.from[0].city}?`,
      a: `About ${page.from[0].km} km in a straight line; the road distance is longer.`
        + (page.from.length > 1 ? ` From ${joinNames(page.from.slice(1).map((m) => `${m.city} it is about ${m.km} km`))}.` : ''),
    });
  }
  if (f.departures.length) {
    faqs.push({
      q: `On which days do ${page.kind === 'state' ? `trips in ${where}` : `${where} trips`} start?`,
      a: `Departures are on ${joinNames(f.departures)}, depending on the package.`,
    });
  }
  const orgs = organiserCounts(page.treks);
  if (orgs.length) {
    faqs.push({ q: `Which organisers run ${page.kind === 'state' ? `treks in ${where}` : `${where} trips`}?`, a: organiserAnswer(orgs) });
  }
  faqs.push({
    q: `How do I book ${trip}?`,
    a: 'Open a package above, choose your dates and book on Aorbo Treks, on the website or in the Aorbo Treks app.',
  });
  return faqs;
}

/** Tags for a destination page. */
export function destinationMeta(page) {
  const f = destinationFacts(page);
  const name = page.kind === 'state' ? `Treks & Trips in ${page.name}` : `${page.name} Trips & Treks`;
  const description = snippet(
    `${f.count} ${page.kind === 'state' ? `trek and trip packages in ${page.name}` : `${page.name} trip and trek packages`} on Aorbo Treks`
    + (f.minDays != null ? `, ${dayRange(f.minDays, f.maxDays)}` : '')
    + (f.minPrice != null ? `, from ${rupees(f.minPrice)} per person` : '')
    + '.'
    + (page.places?.length ? ` See ${joinNames(page.places.slice(0, 3))}.` : '')
    + ' Compare and book.',
  );
  const url = absoluteUrl(page.path);
  return {
    title: `${name}: ${f.count} Packages${f.minPrice != null ? ` from ${rupees(f.minPrice)}` : ''} | Aorbo Treks`,
    description,
    path: page.path,
    image: page.treks?.find((t) => t.image)?.image || DEFAULT_IMAGE,
    jsonLd: graph(
      {
        '@type': 'CollectionPage',
        name: destinationHeading(page),
        description,
        url,
        about: page.kind === 'state'
          ? { '@type': 'State', name: page.name }
          : { '@type': 'TouristDestination', name: page.name, ...(page.state ? { containedInPlace: { '@type': 'State', name: page.state } } : {}) },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: page.treks.length,
          itemListElement: page.treks.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(`/treks/${t.id}`), name: t.name })),
        },
      },
      breadcrumb([['Home', '/'], ['Destinations', '/destinations'], [destinationHeading(page), page.path]]),
      faqPage(destinationFaqs(page)),
    ),
  };
}

/** Tags for the list of all destination pages. */
export function destinationHubMeta(hub) {
  return {
    title: 'Trek & Trip Destinations in India: Packages by Place | Aorbo Treks',
    description: snippet(`${hub.destinations} destinations and states with trek and trip packages on Aorbo Treks: compare packages, prices and durations for each place and book.`),
    path: hub.path,
    jsonLd: graph(
      { '@type': 'CollectionPage', name: 'Destinations', url: absoluteUrl(hub.path) },
      breadcrumb([['Home', '/'], ['Destinations', hub.path]]),
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
