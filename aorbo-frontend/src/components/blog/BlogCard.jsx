import { Link } from 'react-router-dom';
import { imageCors, mediaUrl } from '../../api/client';
import { formatDate } from '../../utils/format';

const excerptOf = (blog) =>
  blog.excerpt || `${(blog.content || '').replace(/<[^>]+>/g, '').split(' ').slice(0, 30).join(' ')}…`;

export default function BlogCard({ blog, showExcerpt = true }) {
  return (
    <Link to={`/blogs/${blog.slug}`} className="blog-card">
      <div className="blog-card__media">
        <img src={mediaUrl(blog.image_url)} alt="" loading="lazy" decoding="async" width="400" height="250" crossOrigin={imageCors(blog.image_url)} />
      </div>
      <div className="blog-card__body">
        {blog.created_at && <time className="blog-card__date" dateTime={blog.created_at}>{formatDate(blog.created_at)}</time>}
        <h3 className="blog-card__title">{blog.title}</h3>
        {showExcerpt && <p className="blog-card__excerpt">{excerptOf(blog)}</p>}
      </div>
    </Link>
  );
}
