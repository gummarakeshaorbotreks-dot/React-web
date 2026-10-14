import { WifiOff } from 'lucide-react';
import NearHubView from '../components/near/NearHubView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { nearHubMeta } from '../seo/meta';

// /treks-near — every city page, by state (static file written by the build).
export default function TreksNearHub() {
  const { data, error } = useStaticData('/data/near/index.json');
  useSeo(data ? nearHubMeta(data) : null);

  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="Loading…" />;
  return <NearHubView hub={data} />;
}
