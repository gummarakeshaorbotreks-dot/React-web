import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
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
