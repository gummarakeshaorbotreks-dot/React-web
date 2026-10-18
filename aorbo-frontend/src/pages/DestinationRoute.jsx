import { useParams } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import RouteView from '../components/near/RouteView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { notFoundMeta, routeMeta } from '../seo/meta';

// /destinations/:slug/from-:city — data is a static file written by the build (scripts/route-pages.mjs).
export default function DestinationRoute() {
  const { slug, from } = useParams();
  const city = String(from || '').replace(/^from-/, '');
  const valid = /^from-[a-z0-9-]+$/.test(String(from || ''));
  const { data, error } = useStaticData(`/data/routes/${slug}--${city}.json`);
  useSeo(data ? routeMeta(data) : (error || !valid) ? notFoundMeta(`/destinations/${slug}/${from}`) : null);

  if (error || !valid) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="No trips from this city yet" text="See all packages for this destination on Aorbo Treks." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading trips…" />;
  return <RouteView page={data} />;
}
