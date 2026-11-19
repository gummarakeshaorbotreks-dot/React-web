import { useParams } from 'react-router-dom';
import { MapPinOff, WifiOff } from 'lucide-react';
import RoadView, { RoadHubView } from '../components/near/RoadView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { notFoundMeta, roadHubMeta, roadMeta } from '../seo/meta';

// /routes/:slug - data is a static file written by the build (scripts/road-pages.mjs).
export default function Road() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/roads/${slug}.json`);
  useSeo(data ? roadMeta(data) : error ? notFoundMeta(`/routes/${slug}`) : null);

  if (error) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="Route not found" text="See every route guide under Route guides." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading route…" />;
  return <RoadView page={data} />;
}

// /routes - every route guide, by city.
export function RoadsHub() {
  const { data, error } = useStaticData('/data/roads/index.json');
  useSeo(data ? roadHubMeta(data) : null);

  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="Loading…" />;
  return <RoadHubView hub={data} />;
}
