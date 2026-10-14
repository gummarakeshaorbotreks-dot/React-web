import { Link, useLocation } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import useSeo from '../seo/useSeo';
import { notFoundMeta } from '../seo/meta';

export default function NotFound() {
  const { pathname } = useLocation();
  useSeo(notFoundMeta(pathname));
  return (
    <div className="container section">
      <EmptyState
        icon={MapPinOff}
        title="This trail doesn't exist"
        text="The page you're looking for may have moved or been removed."
        action={<Link to="/" className="button button--brand">Back to home</Link>}
      />
    </div>
  );
}
