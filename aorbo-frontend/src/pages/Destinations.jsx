import { useParams } from 'react-router-dom';
import { MapPinOff, WifiOff } from 'lucide-react';
import DestinationView from '../components/near/DestinationView';
import DestinationHubView from '../components/near/DestinationHubView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { destinationHubMeta, destinationMeta, notFoundMeta } from '../seo/meta';

// /destinations/:slug — data is a static file written by the build (scripts/destination-pages.mjs).
export default function Destination() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/destinations/${slug}.json`);
  useSeo(data ? destinationMeta(data) : error ? notFoundMeta(`/destinations/${slug}`) : null);

  if (error) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="No page for this destination yet" text="See all destinations with packages on Aorbo Treks." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading packages…" />;
  return <DestinationView page={data} />;
}

// /destinations — every destination page, by state.
export function DestinationsHub() {
  const { data, error } = useStaticData('/data/destinations/index.json');
  useSeo(data ? destinationHubMeta(data) : null);

  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="Loading…" />;
  return <DestinationHubView hub={data} />;
}
