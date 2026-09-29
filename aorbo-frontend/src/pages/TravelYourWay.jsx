import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { qs } from '../api/client';
import useApi, { prefetch } from '../hooks/useApi';
import { CATEGORIES, categoryByTag } from '../data/categories';
import PageHeader from '../components/ui/PageHeader';
import Pagination from '../components/ui/Pagination';
import { TrekGrid } from '../components/trek/TrekCard';

const endpoint = (tag, page) => `/api/travel-your-way/?${qs({ tag, page })}`;

export default function TravelYourWay() {
  const [searchParams] = useSearchParams();
  const tag = (searchParams.get('tag') || 'adventure').toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  const { data, loading, error } = useApi(endpoint(tag, page), { cache: true });
  const totalPages = data?.total_pages || 1;

  // Quietly load the next page so "Next" feels instant.
  useEffect(() => {
    if (loading || page >= totalPages) return undefined;
    const timer = setTimeout(() => prefetch(endpoint(tag, page + 1)), 800);
    return () => clearTimeout(timer);
  }, [loading, tag, page, totalPages]);

  const category = categoryByTag(tag) || {
    label: tag.charAt(0).toUpperCase() + tag.slice(1),
    text: 'Showing treks and trips that match your travel style.',
  };

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/', label: 'Back to Home' }}
        eyebrow="Travel Your Way"
        title={category.label}
        subtitle={category.text}
      >
        <nav className="chip-list" aria-label="Travel styles">
          {CATEGORIES.map(({ tag: t, label, icon: Icon }) => (
            <Link
              key={t}
              to={`/travel-your-way?tag=${t}`}
              className={`chip chip--outline${t === tag ? ' is-active' : ''}`}
              aria-current={t === tag ? 'page' : undefined}
            >
              <Icon aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      </PageHeader>

      <div className="container">
        <TrekGrid
          treks={data?.results}
          loading={loading}
          error={error}
          tag={tag}
          emptyTitle="No trails in this category yet"
          emptyText="We're adding new treks all the time. Try another travel style in the meantime."
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          hrefFor={(n) => `/travel-your-way?${qs({ tag, page: n })}`}
        />
      </div>
    </div>
  );
}
