import { WifiOff } from 'lucide-react';
import WinterView from '../components/near/WinterView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { winterMeta } from '../seo/meta';

// /winter-treks — data is a static file written by the build (scripts/season-pages.mjs).
export default function WinterTreks() {
  const { data, error } = useStaticData('/data/seasons/winter-treks.json');
  useSeo(data ? winterMeta(data) : null);

  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="Loading winter treks…" />;
  return <WinterView page={data} />;
}
