import { ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/Home.css';

const TAG_META = {
  adventure: { icon: '⛰️', label: 'Adventure Treks',   subtitle: 'For thrill-seekers and explorers who crave a challenge.' },
  weekend:   { icon: '🌄', label: 'Weekend Getaways',   subtitle: 'Perfect short escapes to unwind and recharge.' },
  nature:    { icon: '🌲', label: 'Nature Escapes',     subtitle: 'Reconnect with nature through calm and scenic trails.' },
  beach:     { icon: '🌊', label: 'Beach Trails',       subtitle: 'Walk along the coast, enjoy sunsets, and feel the sea breeze.' },
  spiritual: { icon: '💗', label: 'Spiritual Journeys', subtitle: 'Find peace and purpose through sacred trails.' },
  camping:   { icon: '🏕️', label: 'Camping & Bonfire',  subtitle: 'Experience starlit nights and warm bonfires in the wild.' },
};

const trekCache = {};
const inFlight = new Set();
const SKELETON_COUNT = 8;

export default function TravelYourWay() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [treks, setTreks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const abortRef = useRef(null);

  const selectedTag = (searchParams.get('tag') || 'adventure').toLowerCase();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const BACKEND_URL = 'http://127.0.0.1:8000';
  const cacheKey = selectedTag + '__' + currentPage;

  const meta = TAG_META[selectedTag] || {
    icon: '🗺️',
    label: selectedTag.charAt(0).toUpperCase() + selectedTag.slice(1),
    subtitle: 'Showing treks and trips that match your travel style.',
  };

  // main data fetch
  useEffect(function() {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    var cancelled = false;
    if (abortRef.current) abortRef.current.abort();
    var controller = new AbortController();
    abortRef.current = controller;
    fetch(BACKEND_URL + '/api/travel-your-way/?tag=' + selectedTag + '&page=' + currentPage, { signal: controller.signal })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (cancelled) return;
        var results = data.results || [];
        var total = data.total_pages || 1;
        trekCache[cacheKey] = { results: results, totalPages: total };
        setTreks(results);
        setTotalPages(total);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function(err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to resolve custom category items:', err);
          if (!cancelled) setLoading(false);
        }
      });
    return function() {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey, selectedTag, currentPage]);

  // prefetch next page in background
  useEffect(function() {
    if (loading || currentPage >= totalPages) return;
    var nextKey = selectedTag + '__' + (currentPage + 1);
    if (trekCache[nextKey] || inFlight.has(nextKey)) return;
    var timer = setTimeout(function() {
      if (trekCache[nextKey] || inFlight.has(nextKey)) return;
      inFlight.add(nextKey);
      fetch(BACKEND_URL + '/api/travel-your-way/?tag=' + selectedTag + '&page=' + (currentPage + 1))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          trekCache[nextKey] = { results: data.results || [], totalPages: data.total_pages || 1 };
          inFlight.delete(nextKey);
        })
        .catch(function() { inFlight.delete(nextKey); });
    }, 800);
    return function() { clearTimeout(timer); };
  }, [loading, selectedTag, currentPage, totalPages]);

  var goToPage = function(page) {
    var params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
  };

  var getPaginationPages = function() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, function(_, i) { return i + 1; });
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  var handleTrekClick = function(trek) {
    fetch(BACKEND_URL + '/api/treks/log-click/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trek_id: trek.id, query: '', tag: selectedTag }),
    });
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{'.tyw-empty-state { background-color: #1a2333; border-radius: 16px; padding: clamp(1.5rem, 4vw, 3rem); border: 1px solid rgba(251,191,36,0.1); }'}</style>
      <section className="tyw-page-header">
        <div className="container">
          <Link to="/" className="tyw-back-link">&larr; Back to Home</Link>
          <div className="tyw-page-title-row">
            <span className="tyw-page-icon">{meta.icon}</span>
            <div>
              <p className="tyw-page-eyebrow">Travel Your Way</p>
              <h1 className="tyw-page-heading">{meta.label}</h1>
            </div>
          </div>
          <p className="tyw-page-subtitle">{meta.subtitle}</p>
          <div className="tyw-tag-switcher">
            {Object.entries(TAG_META).map(function(pair) {
              var tag = pair[0];
              var info = pair[1];
              var cls = "tyw-tag-pill" + (selectedTag === tag ? " tyw-tag-pill--active" : "");
              return (
                <Link key={tag} to={"/travel-your-way?tag=" + tag + "&amp;page=1"} className={cls}>
                  {info.icon} {info.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section style={{ backgroundColor: '#121824', padding: '3.5rem 0 4.5rem' }}>
        <div className="container">
          {loading ? (
            <div className="row g-4">
              {Array.from({ length: SKELETON_COUNT }).map(function(_, i) {
                return (
                  <div key={i} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <div className="bolt-skeleton-card">
                      <div className="bolt-skeleton-img" />
                      <div className="bolt-skeleton-body">
                        <div className="bolt-skeleton-line bolt-skeleton-line--title" />
                        <div className="bolt-skeleton-line bolt-skeleton-line--short" />
                        <div className="bolt-skeleton-divider" />
                        <div className="bolt-skeleton-line bolt-skeleton-line--med" />
                        <div className="bolt-skeleton-line bolt-skeleton-line--med" />
                        <div className="bolt-skeleton-footer" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : treks.length > 0 ? (
            <>
              <div className="row g-4">
                {treks.map(function(trek) {
                  var resolvedImageUrl = (trek.images && trek.images[0] && trek.images[0].image_url)
                    ? (trek.images[0].image_url.startsWith('http') ? trek.images[0].image_url : BACKEND_URL + trek.images[0].image_url)
                    : '/images/placeholder-trek.jpg';
                  return (
                    <div key={trek.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                      <Link to={"/treks/" + trek.id} onClick={function() { handleTrekClick(trek); }} className="text-decoration-none d-block h-100">
                        <div className="bolt-premium-card">
                          <div className="bolt-shine" />
                          <div className="bolt-top-glow" />
                          <div className="bolt-image-wrapper">
                            <img src={resolvedImageUrl} alt={trek.name} loading="lazy" className="bolt-card-img" />
                            <div className="bolt-image-overlay" />
                            <div className="bolt-image-shimmer" />
                            <div className="bolt-price-badge">
                              <p className="bolt-price-onwards">Onwards*</p>
                              <p className="bolt-price-value">&#x20B9;{trek.price_start?.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                          <div className="bolt-card-body">
                            <div>
                              <h3 className="bolt-card-title">{trek.name.charAt(0).toUpperCase() + trek.name.slice(1).toLowerCase()}</h3>
                              <div className="bolt-location-row">
                                <MapPin className="bolt-pin-icon" />
                                <span className="bolt-location-text">{trek.state}</span>
                              </div>
                            </div>
                            <div className="bolt-card-divider" />
                            <div className="bolt-specs-container">
                              <div className="bolt-spec-item">
                                <Clock className="bolt-spec-icon" />
                                <span className="bolt-spec-text">
                                  <span className="bolt-spec-label">Duration: </span>
                                  <span className="bolt-spec-val">{trek.duration_days} Days</span>
                                </span>
                              </div>
                              <div className="bolt-spec-item">
                                <Calendar className="bolt-spec-icon" />
                                <span className="bolt-spec-text">
                                  <span className="bolt-spec-label">Departure: </span>
                                  <span className="bolt-spec-val">{trek.operating_days?.toUpperCase()}</span>
                                </span>
                              </div>
                            </div>
                            <div className="bolt-card-footer">
                              <div className="bolt-arrow-circle">
                                <ArrowUpRight className="bolt-arrow-icon" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="bolt-pagination-wrapper" style={{ marginTop: '3rem' }}>
                  <button onClick={function() { goToPage(Math.max(1, currentPage - 1)); }} disabled={currentPage === 1} className={"bolt-pag-btn" + (currentPage === 1 ? " bolt-pag-disabled" : "")}>
                    <ChevronLeft style={{ width: '16px', height: '16px' }} />
                  </button>
                  {getPaginationPages().map(function(page, index) {
                    return page === '...' ? (
                      <span key={"ellipsis-" + index} className="bolt-pag-ellipsis">...</span>
                    ) : (
                      <button key={page} onClick={function() { goToPage(page); }} className={"bolt-pag-btn" + (page === currentPage ? " bolt-pag-active" : "")}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={function() { goToPage(Math.min(totalPages, currentPage + 1)); }} disabled={currentPage === totalPages} className={"bolt-pag-btn" + (currentPage === totalPages ? " bolt-pag-disabled" : "")}>
                    <ChevronRight style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-5 tyw-empty-state">
              <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#9ca3af', margin: 0 }}>No active trails matching this category at the moment.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
