import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, 4, '…', total];
  if (page >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}

// URL-driven pagination: every page is a real link (shareable, works with
// the back button). `hrefFor(n)` returns the link for page n.
export default function Pagination({ page, totalPages, hrefFor }) {
  if (totalPages <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <nav className="pager" aria-label="Pagination">
      <Link
        to={hrefFor(Math.max(1, page - 1))}
        className={`pager__item${isFirst ? ' is-disabled' : ''}`}
        aria-label="Previous page"
        aria-disabled={isFirst}
      >
        <ChevronLeft aria-hidden="true" />
      </Link>

      {pageList(page, totalPages).map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} className="pager__item pager__ellipsis">…</span>
        ) : (
          <Link
            key={n}
            to={hrefFor(n)}
            className={`pager__item${n === page ? ' is-active' : ''}`}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </Link>
        ),
      )}

      <Link
        to={hrefFor(Math.min(totalPages, page + 1))}
        className={`pager__item${isLast ? ' is-disabled' : ''}`}
        aria-label="Next page"
        aria-disabled={isLast}
      >
        <ChevronRight aria-hidden="true" />
      </Link>
    </nav>
  );
}
