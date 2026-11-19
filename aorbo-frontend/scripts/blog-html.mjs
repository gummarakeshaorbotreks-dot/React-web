// Blog pages pre-built with their real text (SEO plan, 19 Nov 2026). Until then every /blogs/<slug>
// file carried only its title tags and the home page's body, so Google read "Discover Your Adventure"
// instead of the article. The article HTML comes from the website admin (staff-written); at build
// time there is no DOM, so it goes through a strict allowlist: text tags only, no attributes but a
// safe href / src / alt, nothing that can run code. The app still renders the full page on load.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ALLOWED = new Set(['h2', 'h3', 'h4', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'blockquote', 'img', 'hr']);
const VOID = new Set(['br', 'img', 'hr']);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select|button)\b[\s\S]*?<\/\1\s*>/gi;
const safeUrl = (u) => {
  const v = String(u || '').trim();
  return /^(https?:)?\/\//i.test(v) || (/^\/(?!\/)/.test(v)) ? v : null; // http(s), protocol-relative or site path
};

/** Admin article HTML -> safe HTML (allowlisted tags; href/src/alt only, http(s) or site paths). */
export function sanitizeBlogHtml(html) {
  let s = String(html || '').replace(/<!--[\s\S]*?-->/g, '').replace(DROP_WITH_CONTENT, '');
  // The editor puts a placeholder "CONTENT" heading (any <h1>) at the top; the page has its own <h1>.
  s = s.replace(/<h1\b[^>]*>[\s\S]*?<\/h1\s*>/gi, '');
  return s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, rawName, attrs) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) return '';
    if (tag.startsWith('</')) return VOID.has(name) ? '' : `</${name}>`;
    const get = (a) => {
      const m = attrs.match(new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
      return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
    };
    if (name === 'a') {
      const href = safeUrl(get('href'));
      return href ? `<a href="${esc(href)}"${/^(https?:)?\/\//i.test(href) ? ' rel="noopener"' : ''}>` : '<a>';
    }
    if (name === 'img') {
      const src = safeUrl(get('src'));
      return src ? `<img src="${esc(src)}" alt="${esc(get('alt') || '')}" loading="lazy">` : '';
    }
    return VOID.has(name) ? `<${name}>` : `<${name}>`;
  });
}

const dateText = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d);
};

/** The article itself, inside the site frame's <main>. */
export function blogArticleHtml(b) {
  const date = dateText(b.created_at);
  return [
    '<div class="blog-post blog-post--static" style="max-width:760px;margin:0 auto;padding:16px">',
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blogs">Blogs</a></nav>',
    `<h1>${esc(b.title)}</h1>`,
    `<p class="blog-post__meta">${b.author ? `By ${esc(b.author)}` : ''}${b.author && date ? ' · ' : ''}${date ? `<time datetime="${esc(b.created_at)}">${esc(date)}</time>` : ''}</p>`,
    safeUrl(b.image_url) ? `<div class="blog-post__cover"><img src="${esc(b.image_url)}" alt="${esc(b.title)}"></div>` : '',
    `<article class="blog-post__body">${sanitizeBlogHtml(b.content)}</article>`,
    '<p><a href="/blogs">More trek guides and stories</a></p>',
    '</div>',
  ].join('');
}

/** The /blogs index: every post with its excerpt and link. */
export function blogListHtml(blogs) {
  return [
    '<div class="blogs blogs--static" style="max-width:760px;margin:0 auto;padding:16px">',
    '<h1>Trek guides, packing lists and stories</h1>',
    '<ul class="blogs-list">',
    ...blogs.map((b) => `<li><a href="/blogs/${encodeURIComponent(b.slug)}"><strong>${esc(b.title)}</strong></a>${b.excerpt ? `<p>${esc(b.excerpt)}</p>` : ''}</li>`),
    '</ul>',
    '</div>',
  ].join('');
}
