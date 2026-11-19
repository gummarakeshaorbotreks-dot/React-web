import { useParams } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import CompareView from '../components/near/CompareView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { compareMeta, notFoundMeta } from '../seo/meta';

// /compare/:slug — data is a static file written by the build (scripts/fact-pages.mjs).
export default function Compare() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/compare/${slug}.json`);
  useSeo(data ? compareMeta(data) : error ? notFoundMeta(`/compare/${slug}`) : null);

  if (error) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="Comparison not found" text="See every trek comparison under Collections." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading comparison…" />;
  return <CompareView page={data} />;
}
