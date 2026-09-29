import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify';
import { FileQuestion, ListOrdered, Share2 } from 'lucide-react';
import { imageCors, mediaUrl } from '../api/client';
import useApi from '../hooks/useApi';
import { formatDate } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import InfoCard from '../components/ui/InfoCard';
import SectionHeading from '../components/ui/SectionHeading';
import BlogCard from '../components/blog/BlogCard';
import '../styles/Blogs.css';

// Sanitises the CMS HTML, gives every <h2> an id, and returns the list of
// headings for the table of contents.
function prepareArticle(rawHtml) {
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(rawHtml || ''), 'text/html');
  const toc = [...doc.querySelectorAll('h2')].map((heading, i) => {
    if (!heading.id) heading.id = `section-${i + 1}`;
    return { id: heading.id, text: heading.textContent };
  });
  const words = (doc.body.textContent || '').trim().split(/\s+/).length;
  return { html: doc.body.innerHTML, toc, minutes: Math.max(1, Math.round(words / 200)) };
}

function ShareButtons() {
  const [copied, setCopied] = useState(false);
  const url = encodeURIComponent(window.location.href);
  const targets = [
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${url}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="share-buttons">
      {targets.map((t) => (
        <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className="button button--ghost button--sm">
          {t.label}
        </a>
      ))}
      <button type="button" className="button button--ghost button--sm" onClick={copyLink}>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}

export default function BlogDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const page = searchParams.get('page') || 1;
  const { data, loading, error } = useApi(`/api/blogs/${encodeURIComponent(slug)}/?page=${page}`);
  const blog = data?.blog;
  const article = useMemo(() => prepareArticle(blog?.content), [blog?.content]);

  if (loading) return <Loader label="Loading blog post…" />;

  if (error || !blog) {
    return (
      <div className="container section">
        <EmptyState
          icon={FileQuestion}
          title="Blog post not found"
          text="It may have been moved or unpublished."
          action={<Link to="/blogs" className="button button--brand">See all blogs</Link>}
        />
      </div>
    );
  }

  const recentBlogs = data.recent_blogs || [];

  return (
    <div className="page">
      <Helmet>
        <title>{`${blog.title} - Aorbo Treks`}</title>
        <meta name="description" content={`${blog.title?.slice(0, 120)}...`} />
        {blog.author && <meta name="author" content={blog.author} />}
      </Helmet>

      <PageHeader back={{ to: '/blogs', label: 'All blogs' }} eyebrow="Blog" title={blog.title}>
        <div className="blog-post__meta">
          {blog.author && <strong>By {blog.author}</strong>}
          {blog.author && <span className="blog-post__dot" aria-hidden="true" />}
          <time dateTime={blog.created_at}>{formatDate(blog.created_at)}</time>
          <span className="blog-post__dot" aria-hidden="true" />
          <span>{article.minutes} min read</span>
        </div>
      </PageHeader>

      <div className="container">
        <div className="blog-post__cover">
          <img src={mediaUrl(blog.image_url)} alt="" crossOrigin={imageCors(blog.image_url)} />
        </div>

        <div className="page-block blog-post__layout">
          <article
            className="surface prose blog-post__article"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />

          <aside className="blog-post__sidebar">
            {article.toc.length > 0 && (
              <InfoCard icon={ListOrdered} title="Table of Contents" as="h2">
                <nav className="toc" aria-label="Table of contents">
                  {article.toc.map((item) => (
                    <a key={item.id} href={`#${item.id}`}>{item.text}</a>
                  ))}
                </nav>
              </InfoCard>
            )}
            <InfoCard icon={Share2} title="Share this Article" as="h2">
              <ShareButtons />
            </InfoCard>
          </aside>
        </div>

        {recentBlogs.length > 0 && (
          <section className="page-block">
            <SectionHeading title="Recent Posts" />
            <div className="grid grid-cards">
              {recentBlogs.map((recent) => <BlogCard key={recent.slug} blog={recent} showExcerpt={false} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
