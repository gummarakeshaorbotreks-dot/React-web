import { useSearchParams } from 'react-router-dom';
import { BookOpen, WifiOff } from 'lucide-react';
import useApi from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import BlogCard from '../components/blog/BlogCard';
import '../styles/Blogs.css';

export default function Blogs() {
  const [searchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const { data, loading, error } = useApi(`/api/blogs/?page=${page}`, { cache: true });
  const blogs = data?.results || [];

  let content;
  if (loading) {
    content = <Loader label="Loading blogs…" />;
  } else if (error) {
    content = <EmptyState icon={WifiOff} title="We couldn't load the blog" text="Please check your connection and try again in a moment." />;
  } else if (blogs.length === 0) {
    content = <EmptyState icon={BookOpen} title="No blog posts yet" text="Check back soon for trek guides and stories from the trail." />;
  } else {
    content = (
      <div className="grid grid-cards">
        {blogs.map((blog) => <BlogCard key={blog.slug} blog={blog} />)}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Blogs"
        title="Stories from the trail"
        subtitle="Trek guides, packing lists and safety tips from the Aorbo Treks team."
      />
      <div className="container">
        {content}
        <Pagination page={page} totalPages={data?.total_pages || 1} hrefFor={(n) => `/blogs?page=${n}`} />
      </div>
    </div>
  );
}
