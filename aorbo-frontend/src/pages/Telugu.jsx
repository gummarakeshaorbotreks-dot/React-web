import { useParams } from 'react-router-dom';
import { MapPinOff, WifiOff } from 'lucide-react';
import TeluguTrekView, { TeluguHubView } from '../components/lang/TeluguTrekView';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import useStaticData from '../hooks/useStaticData';
import useSeo from '../seo/useSeo';
import { notFoundMeta, teHubMeta, teTrekMeta } from '../seo/meta';

// /te/treks/:slug - data is a static file written by the build (scripts/lang-pages.mjs).
export default function TeluguTrek() {
  const { slug } = useParams();
  const { data, error } = useStaticData(`/data/te/${slug}.json`);
  useSeo(data ? teTrekMeta(data) : error ? notFoundMeta(`/te/treks/${slug}`) : null);
  if (error) return <div className="container section"><EmptyState icon={MapPinOff} title="పేజీ కనబడలేదు" text="అన్ని ట్రెక్ గైడ్‌లు చూడండి." /></div>;
  if (!data) return <Loader label="లోడ్ అవుతోంది…" />;
  return <TeluguTrekView page={data} />;
}

// /te - every Telugu trek guide.
export function TeluguHub() {
  const { data, error } = useStaticData('/data/te/index.json');
  useSeo(data ? teHubMeta(data) : null);
  if (error) return <EmptyState icon={WifiOff} title="We couldn't load this page" text="Please check your connection and try again." />;
  if (!data) return <Loader label="లోడ్ అవుతోంది…" />;
  return <TeluguHubView hub={data} />;
}
