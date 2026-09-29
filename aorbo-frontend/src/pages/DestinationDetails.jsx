import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BedDouble, BookOpen, CalendarDays, Car, Info, Lightbulb, MapPin, MapPinOff, Mountain, Ruler, Tag,
  UtensilsCrossed, Zap,
} from 'lucide-react';
import { qs } from '../api/client';
import useApi from '../hooks/useApi';
import { slugToName } from '../utils/slugUtils';
import DetailHero from '../components/trek/DetailHero';
import InfoCard from '../components/ui/InfoCard';
import FactList from '../components/ui/FactList';
import Loader from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import '../styles/Details.css';

// The search page passes the OpenStreetMap result along in router state;
// if someone opens the URL directly we only have the slug.
function enrichPath(slug, passed) {
  return `/api/enrich-destination/?${qs({
    name: passed?.name || slugToName(slug),
    lat: passed?.lat,
    lon: passed?.lon,
    display_name: passed?.display_name,
    category: passed?.category,
  })}`;
}

function normalise(data, passed, fallbackName) {
  const enrich = data.enrichment || {};
  return {
    name: data.destination || fallbackName,
    image_url: data.image_url || null,
    lat: passed?.lat ?? data.lat,
    lon: passed?.lon ?? data.lon,
    summary: enrich.summary || enrich.description || 'Explore this beautiful destination.',
    category: enrich.category || 'Adventure',
    difficulty: enrich.difficulty || 'moderate',
    best_time_to_visit: enrich.best_time_to_visit || 'October to March',
    activities: enrich.activities || [],
    travel_tips: enrich.travel_tips || [],
    nearby_attractions: enrich.nearby_attractions || enrich.famous_places || [],
    accommodation: enrich.accommodation,
    local_cuisine: enrich.local_cuisine,
    altitude: enrich.altitude,
    distance_from_major_city: enrich.distance_from_major_city,
  };
}

function osmEmbedUrl(lat, lon) {
  const d = 0.05;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d}%2C${lat - d}%2C${lon + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export default function DestinationDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const passed = useLocation().state?.destination;
  const { data, loading, error } = useApi(enrichPath(slug, passed));

  if (loading) return <Loader label="Loading destination details…" />;

  if (error || !data) {
    return (
      <div className="container section">
        <EmptyState
          icon={MapPinOff}
          title="Destination not found"
          text="We couldn't find details for this place. Try searching for it again."
          action={<button type="button" className="button button--brand" onClick={() => navigate(-1)}>Go Back</button>}
        />
      </div>
    );
  }

  const place = normalise(data, passed, passed?.name || slugToName(slug));
  const lat = parseFloat(place.lat);
  const lon = parseFloat(place.lon);
  const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lon);

  return (
    <div className="page detail-page">
      <div className="container">
        <DetailHero
          image={place.image_url}
          title={place.name}
          badges={[
            { icon: Tag, label: place.category },
            { icon: MapPin, label: 'OpenStreetMap' },
          ]}
          meta={[
            { icon: Mountain, label: place.difficulty },
            { icon: CalendarDays, label: place.best_time_to_visit },
          ]}
        />

        {hasCoords && (
          <div className="surface surface--flush detail-map">
            <iframe title="Destination location map" src={osmEmbedUrl(lat, lon)} loading="lazy" />
          </div>
        )}

        <div className="detail-grid">
          <div className="stack">
            <InfoCard icon={BookOpen} title="About this Destination">
              <p>{place.summary}</p>
            </InfoCard>

            {place.activities.length > 0 && (
              <InfoCard icon={Zap} title="Activities">
                <ul className="chip-list">
                  {place.activities.map((activity) => <li key={activity} className="chip">{activity}</li>)}
                </ul>
              </InfoCard>
            )}

            {place.travel_tips.length > 0 && (
              <InfoCard icon={Lightbulb} title="Travel Tips">
                <ul className="tip-list">
                  {place.travel_tips.map((tip) => <li key={tip}>{tip}</li>)}
                </ul>
              </InfoCard>
            )}

            {place.nearby_attractions.length > 0 && (
              <InfoCard icon={MapPin} title="Nearby Attractions">
                <ul className="place-list">
                  {place.nearby_attractions.map((spot) => <li key={spot}>{spot}</li>)}
                </ul>
              </InfoCard>
            )}
          </div>

          <aside className="stack">
            <section className="surface surface--dark">
              <p className="price-card__label">Package Price</p>
              <p className="price-card__value price-card__value--soon">Trek Details Coming Soon..</p>
              <p className="price-card__note">Pricing details will be added soon</p>
            </section>

            <InfoCard icon={Info} title="Trip Information" as="h3">
              <FactList
                items={[
                  { icon: Mountain, label: 'Difficulty Level', value: place.difficulty },
                  { icon: CalendarDays, label: 'Best Time to Visit', value: place.best_time_to_visit },
                  { icon: Tag, label: 'Category', value: place.category },
                ]}
              />
            </InfoCard>

            {place.accommodation && (
              <InfoCard icon={BedDouble} title="Accommodation" as="h3">
                <p>{place.accommodation}</p>
              </InfoCard>
            )}

            {place.local_cuisine && (
              <InfoCard icon={UtensilsCrossed} title="Local Cuisine" as="h3">
                <p>{place.local_cuisine}</p>
              </InfoCard>
            )}

            {(place.altitude || place.distance_from_major_city) && (
              <InfoCard icon={Ruler} title="Location Details" as="h3">
                <FactList
                  items={[
                    { icon: Mountain, label: 'Altitude', value: place.altitude },
                    { icon: Car, label: 'Distance', value: place.distance_from_major_city },
                  ]}
                />
              </InfoCard>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
