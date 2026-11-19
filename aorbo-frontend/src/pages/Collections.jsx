import { useParams } from 'react-router-dom';
import { MapPinOff, WifiOff } from 'lucide-react';
import CollectionView from '../components/near/CollectionView';
import CollectionHubView from '../components/near/CollectionHubView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { collectionHubMeta, collectionMeta, notFoundMeta } from '../seo/meta';

// /collections/:slug — data is a static file written by the build (scripts/fact-pages.mjs).
export default function Collection() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/collections/${slug}.json`);
  useSeo(data ? collectionMeta(data) : error ? notFoundMeta(`/collections/${slug}`) : null);

  if (error) {
    return (
      <div className="container section">
        <EmptyState icon={MapPinOff} title="Collection not found" text="See every trek collection under Collections." />
      </div>
    );
  }
  if (!data) return <Loader label="Loading treks…" />;
  return <CollectionView page={data} />;
}

// /collections — every collection and comparison.
export function CollectionsHub() {
  const { data, error } = useStaticData('/data/collections/index.json');
  useSeo(data ? collectionHubMeta(data) : null);

  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="Loading…" />;
  return <CollectionHubView hub={data} />;
}
