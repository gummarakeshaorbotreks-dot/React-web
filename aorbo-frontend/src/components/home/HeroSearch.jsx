import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Mountain, Search, SearchX } from 'lucide-react';
import { getJSON, logClick, qs, saveOsmDraft } from '../../api/client';
import { generateSlug } from '../../utils/slugUtils';

const NO_RESULTS = { id: 'no-results', type: 'no-results' };
const MIN_QUERY = 2;
const DEBOUNCE_MS = 400;

// Searches our treks first; if nothing matches, falls back to OpenStreetMap
// places so the visitor can still open a destination page.
async function fetchSuggestions(query) {
  const treks = await getJSON(`/api/treks/search/?${qs({ q: query })}`);
  if (Array.isArray(treks) && treks.length > 0) return treks.slice(0, 8);

  const osm = await getJSON(`/api/search/intelligent/?${qs({ q: query })}`);
  const places = (Array.isArray(osm.results) ? osm.results : []).slice(0, 5).map((r, i) => ({
    id: `osm-${i}`,
    type: 'osm',
    name: r.name,
    display_name: r.display_name,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    category: r.category,
  }));
  return places.length > 0 ? places : [NO_RESULTS];
}

export default function HeroSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const closeOnOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = async (value) => {
    setSearching(true);
    try {
      const results = await fetchSuggestions(value);
      // Ignore responses for a query the visitor has already moved on from.
      if (latestQueryRef.current !== value) return;
      setSuggestions(results);
      setOpen(true);
    } catch {
      if (latestQueryRef.current === value) setSuggestions([]);
    } finally {
      if (latestQueryRef.current === value) setSearching(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    const trimmed = value.trim();
    setQuery(value);
    clearTimeout(debounceRef.current);
    latestQueryRef.current = trimmed;

    if (trimmed.length < MIN_QUERY) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
  };

  const select = (suggestion) => {
    const isPlace = suggestion.type === 'osm';
    logClick({ trekId: isPlace ? '' : suggestion.id, query });
    setOpen(false);
    setQuery('');

    if (isPlace) {
      saveOsmDraft(suggestion); // lets the team turn popular searches into treks
      navigate(`/destination/${generateSlug(suggestion.name)}`, { state: { destination: suggestion } });
    } else {
      navigate(`/treks/${suggestion.id}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const first = suggestions[0];
    if (!query.trim() || !first || first.type === 'no-results') return;
    select(first);
  };

  return (
    <form className="hero-search-form" onSubmit={handleSubmit} role="search">
      <div className="hero-search-wrapper" ref={wrapperRef}>
        <input
          type="text"
          name="q"
          id="hero-search-input"
          className="hero-search-input"
          placeholder="Search for a destination or trek..."
          autoComplete="off"
          aria-label="Search treks and destinations"
          aria-controls="search-suggestions"
          aria-expanded={open}
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
        />

        <button type="submit" className="hero-search-button" aria-label="Search">
          {searching ? <span className="spinner spinner--sm" aria-hidden="true" /> : <Search aria-hidden="true" />}
        </button>

        {open && suggestions.length > 0 && (
          <div id="search-suggestions" className="search-suggestions" role="listbox">
            {suggestions.map((s) =>
              s.type === 'no-results' ? (
                <div key={s.id} className="search-suggestion-item search-suggestion-item--empty">
                  <SearchX aria-hidden="true" />
                  <span className="search-suggestion-main">No trekking destinations found</span>
                </div>
              ) : (
                <button
                  type="button"
                  role="option"
                  key={`${s.type || 'trek'}-${s.id}`}
                  className="search-suggestion-item"
                  onClick={() => select(s)}
                >
                  {s.type === 'osm' ? <MapPin aria-hidden="true" /> : <Mountain aria-hidden="true" />}
                  <span className="search-suggestion-text">
                    <span className="search-suggestion-main">{s.label || s.name}</span>
                    <span className="search-suggestion-secondary">
                      {s.type === 'osm' ? s.display_name : s.state || 'Trek'}
                    </span>
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </form>
  );
}
