import { Link, useParams } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import useApi from '../hooks/useApi';
import useStaticData from '../hooks/useStaticData';
import TrekView from '../components/trek/TrekView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useSeo from '../seo/useSeo';
import { notFoundMeta, trekMeta } from '../seo/meta';

// /treks/:id — the build writes each trek's data (and its destination / city
// links) to /data/treks/<id>.json and into the page itself; a trek added since
// the last build is read from the API instead.
export default function CardDetails() {
  const { id } = useParams();
  const built = useStaticData(`/data/treks/${encodeURIComponent(id)}.json`);
  const live = useApi(built.error ? `/api/treks/${encodeURIComponent(id)}/` : null);
  const trek = built.data?.trek || live.data;
  const links = built.data?.links || null;
  const error = built.error && live.error;
  useSeo(trek ? trekMeta(trek, links) : error ? notFoundMeta(`/treks/${id}`) : null);

  if (!trek && !error) return <Loader label="Loading trek details…" />;

  if (!trek) {
    return (
      <div className="container section">
        <EmptyState
          icon={MapPinOff}
          title="Trek not found"
          text="Please go back and try again, or explore our other treks."
          action={<Link to="/" className="button button--brand">Browse treks</Link>}
        />
      </div>
    );
  }

  return <TrekView trek={trek} links={links} />;
}
