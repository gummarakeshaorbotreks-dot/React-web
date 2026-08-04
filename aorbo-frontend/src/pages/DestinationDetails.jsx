import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { slugToName } from '../utils/slugUtils';

export default function DestinationDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BACKEND_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    async function getDestinationDetails() {
      try {
        setLoading(true);
        setError(null);

        const passedDestination = location.state?.destination;
        const destinationName = passedDestination?.name || slugToName(slug);
        const lat = passedDestination?.lat;
        const lon = passedDestination?.lon;
        const display_name = passedDestination?.display_name;
        const category = passedDestination?.category;

        let url = `${BACKEND_URL}/api/enrich-destination/?name=${encodeURIComponent(destinationName)}`;
        if (lat != null) url += `&lat=${lat}`;
        if (lon != null) url += `&lon=${lon}`;
        if (display_name) url += `&display_name=${encodeURIComponent(display_name)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Destination not found');

        const data = await res.json();

        // Safely extract the enrichment block with fallback defaults
        const enrich = data.enrichment || {};

        setDestination({
          name: data.destination || destinationName,
          image_url: data.image_url || null,
          lat: lat || data.lat,
          lon: lon || data.lon,
          display_name: display_name || data.display_name,
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
          distance_from_major_city: enrich.distance_from_major_city
        });
      } catch (err) {
        console.error('Failed fetching destination details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (slug || location.state?.destination) {
      getDestinationDetails();
    }
  }, [slug, location.state]);

  if (loading) {
    return (
      <div style={{ padding: 'clamp(2rem, 10vw, 5rem)', textAlign: 'center', color: '#4b5563', fontSize: '1rem' }}>
        Loading destination details...
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div style={{ padding: 'clamp(2rem, 10vw, 5rem)', textAlign: 'center', color: '#4b5563' }}>
        <p>Destination not found: {error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '1rem',
            padding: '10px 20px',
            background: '#FFE100',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // Theme colors
  const yellow = '#FFE100';
  const yellowLight = '#FFF8C0';
  const yellowBorder = '#F5D800';
  const darkGreen = '#1a2e1a';
  const orange = '#ff6a1a';
  const pageBg = '#FFFDF0';

  return (
    <main style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 4rem', background: pageBg, minHeight: '100vh' }}>
      <style>{`
        .dd-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; align-items: start; }
        @media (min-width: 768px) { .dd-grid { grid-template-columns: minmax(0,2fr) minmax(0,1fr); } }
        .dd-map { width: 100%; height: clamp(200px, 40vw, 320px); border: 0; display: block; }
      `}</style>

      {/* HERO SECTION */}
      <div
        style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
          minHeight: 'clamp(200px, 50vw, 320px)',
          background: destination.image_url ? `${darkGreen} url(${destination.image_url}) center/cover no-repeat` : darkGreen,
        }}
      >
        {/* Fallback gradient only shows when there's no real photo (visible through the background above) */}
        {!destination.image_url && (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${darkGreen} 0%, #2d5a2d 100%)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,20,10,0.92) 0%, rgba(10,20,10,0.3) 60%, transparent 100%)' }} />

        <button
          onClick={() => navigate(-1)}
          style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: '999px', padding: '7px 18px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}
        >
          ← Back
        </button>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {destination.category && (
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', padding: '3px 12px', borderRadius: '999px', backdropFilter: 'blur(4px)' }}>
                🏷️ {destination.category}
              </span>
            )}
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '11px', padding: '3px 12px', borderRadius: '999px', backdropFilter: 'blur(4px)' }}>
              🗺️ OpenStreetMap
            </span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: '700', margin: '0 0 0.75rem', lineHeight: 1.2 }}>
            {destination.name}
          </h1>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {destination.difficulty && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>⛰️ {destination.difficulty}</span>
            )}
            {destination.best_time_to_visit && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>📅 {destination.best_time_to_visit}</span>
            )}
          </div>
        </div>
      </div>

      {/* DESTINATION LOCATION MAP */}
      {!isNaN(parseFloat(destination.lat)) && !isNaN(parseFloat(destination.lon)) && (() => {
        const lat = parseFloat(destination.lat);
        const lon = parseFloat(destination.lon);
        return (
          <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem', border: `1px solid ${yellowBorder}` }}>
            <iframe
              title="Destination location map"
              width="100%"
              height="100%"
              style={{ border: 0, display: 'block', minHeight: 'clamp(200px, 40vw, 320px)' }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05}%2C${lat - 0.05}%2C${lon + 0.05}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lon}`}
            />
          </div>
        );
      })()}

      {/* MAIN CONTENT GRID */}
      <div className="dd-grid">

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* ABOUT DESTINATION */}
          <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 0.75rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: orange }}>📖</span> About this Destination
            </h2>
            <p style={{ color: '#374151', lineHeight: '1.8', fontSize: '0.98rem', margin: 0 }}>
              {destination.summary}
            </p>
          </div>

          {/* ACTIVITIES */}
          {destination.activities?.length > 0 && (
            <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: orange }}>⚡</span> Activities
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {destination.activities.map((act, i) => (
                  <span key={i} style={{ background: yellow, color: '#1a1a1a', fontSize: '13px', fontWeight: '600', padding: '6px 14px', borderRadius: '999px', border: `1px solid ${yellowBorder}` }}>
                    {act}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TRAVEL TIPS */}
          {destination.travel_tips?.length > 0 && (
            <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: orange }}>💡</span> Travel Tips
              </h2>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#374151', fontSize: '13px' }}>
                {destination.travel_tips.map((tip, i) => (
                  <li key={i} style={{ marginBottom: '0.5rem', lineHeight: '1.6' }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* NEARBY ATTRACTIONS */}
          {destination.nearby_attractions?.length > 0 && (
            <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: orange }}>📍</span> Nearby Attractions
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                {destination.nearby_attractions.map((place, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', background: '#fff', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${yellowBorder}` }}>
                    <span style={{ color: orange, fontSize: '10px' }}>●</span> {place}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* PRICE CARD - Coming Soon */}
          <div style={{ background: darkGreen, borderRadius: '16px', padding: '1.5rem', color: '#fff', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '0 0 0.5rem' }}>Package Price</p>
            <span style={{ display: 'inline-block', background: yellow, color: '#1a1a1a', fontSize: '13px', fontWeight: '700', padding: '6px 18px', borderRadius: '999px', letterSpacing: '0.5px' }}>
              Trek Details Coming Soon..
            </span>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0.75rem 0 0' }}>Pricing details will be added soon</p>
          </div>

          {/* TRIP INFORMATION */}
          <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 1rem', color: '#111827' }}>Trip Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6b7280' }}>⛰️ Difficulty Level</span>
                <span style={{ fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>{destination.difficulty}</span>
              </div>
              <div style={{ borderTop: `1px solid ${yellowBorder}` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6b7280' }}>📅 Best Time to Visit</span>
                <span style={{ fontWeight: '600', color: '#111827' }}>{destination.best_time_to_visit}</span>
              </div>
              <div style={{ borderTop: `1px solid ${yellowBorder}` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#6b7280' }}>🏷️ Category</span>
                <span style={{ fontWeight: '600', color: '#111827', textTransform: 'capitalize' }}>{destination.category}</span>
              </div>
            </div>
          </div>

          {/* ACCOMMODATION */}
          {destination.accommodation && (
            <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 0.75rem', color: '#111827' }}>🏨 Accommodation</h3>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.6' }}>{destination.accommodation}</p>
            </div>
          )}

          {/* LOCAL CUISINE */}
          {destination.local_cuisine && (
            <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 0.75rem', color: '#111827' }}>🍽️ Local Cuisine</h3>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.6' }}>{destination.local_cuisine}</p>
            </div>
          )}

          {/* LOCATION DETAILS */}
          {(destination.altitude || destination.distance_from_major_city) && (
            <div style={{ background: yellowLight, border: `1px solid ${yellowBorder}`, borderRadius: '16px', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 1rem', color: '#111827' }}>📏 Location Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                {destination.altitude && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#6b7280' }}>⛰️ Altitude</span>
                      <span style={{ fontWeight: '600', color: '#111827' }}>{destination.altitude}</span>
                    </div>
                    <div style={{ borderTop: `1px solid ${yellowBorder}` }} />
                  </>
                )}
                {destination.distance_from_major_city && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#6b7280' }}>🚗 Distance</span>
                    <span style={{ fontWeight: '600', color: '#111827' }}>{destination.distance_from_major_city}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}