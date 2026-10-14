import { useParams } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import NearView from '../components/near/NearView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { nearMeta, notFoundMeta } from '../seo/meta';

// /treks-near/:slug — data is a static file written by the build (scripts/near-pages.mjs).
export default function TreksNear() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/near/${slug}.json`);
  useSeo(data ? nearMeta(data) : error ? notFoundMeta(`/treks-near/${slug}`) : null);

  if (error) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="No page for this town yet" text="See the list of cities and towns with treks near them." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading treks…" />;
  return <NearView page={data} />;
}
