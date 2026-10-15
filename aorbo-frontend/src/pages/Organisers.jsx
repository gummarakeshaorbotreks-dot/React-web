import { useParams } from 'react-router-dom';
import { MapPinOff, WifiOff } from 'lucide-react';
import OrganiserView from '../components/near/OrganiserView';
import OrganiserHubView from '../components/near/OrganiserHubView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { notFoundMeta, organiserHubMeta, organiserMeta } from '../seo/meta';

// /organisers/:slug — data is a static file written by the build (scripts/organiser-pages.mjs).
export default function Organiser() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/organisers/${slug}.json`);
  useSeo(data ? organiserMeta(data) : error ? notFoundMeta(`/organisers/${slug}`) : null);

  if (error) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="Organiser not found" text="See all trek organisers on Aorbo Treks." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading treks…" />;
  return <OrganiserView page={data} />;
}

// /organisers — every organiser.
export function OrganisersHub() {
  const { data, error } = useStaticData('/data/organisers/index.json');
  useSeo(data ? organiserHubMeta(data) : null);

  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="Loading…" />;
  return <OrganiserHubView hub={data} />;
}
