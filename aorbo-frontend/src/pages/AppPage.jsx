import AppView from '../components/AppView';
import useSeo from '../seo/useSeo';
import { staticPageMeta } from '../seo/meta';

// /app — the Aorbo Treks Android app.
export default function AppPage() {
  useSeo(staticPageMeta('/app'));
  return <AppView />;
}
