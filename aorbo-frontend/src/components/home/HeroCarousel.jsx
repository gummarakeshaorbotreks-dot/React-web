import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Each slide has a wide version for desktop and a centre-cropped narrow
// version for phones/tablets (they only ever show the middle of the image).
const SLIDES = [
  { name: 'hero-1', alt: 'Ayodhya, Varanasi and Mathura' },
  { name: 'hero-2', alt: 'Badrinath' },
  { name: 'hero-3', alt: 'Coorg' },
];
const SLIDE_MS = 5000;
const SWIPE_PX = 40;

function HeroImage({ name, alt, first }) {
  const base = `/images/hero/${name}`;
  const narrow = '(max-width: 991.98px)';
  return (
    <picture>
      <source media={narrow} srcSet={`${base}-narrow.avif`} type="image/avif" />
      <source media={narrow} srcSet={`${base}-narrow.webp`} type="image/webp" />
      <source srcSet={`${base}-wide.avif`} type="image/avif" />
      <img
        src={`${base}-wide.webp`}
        className="hero-img"
        alt={alt}
        width="1528"
        height="500"
        decoding="async"
        // The first slide is the page's main image; the others load quietly after it.
        fetchPriority={first ? 'high' : 'low'}
      />
    </picture>
  );
}

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Only the first slide's image is part of the initial page load; the others
  // are added once the page has finished loading, so on slow connections they
  // don't compete with the first image and the page's code for bandwidth.
  const [loadRest, setLoadRest] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    const start = () => setTimeout(() => setLoadRest(true), 0);
    if (document.readyState === 'complete') {
      const timer = start();
      return () => clearTimeout(timer);
    }
    window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, []);

  const go = useCallback((step) => setActive((i) => (i + step + SLIDES.length) % SLIDES.length), []);

  // Advance every few seconds; restarting the timer after each change means a
  // manual click always gets a full slide's worth of time.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduceMotion || !loadRest) return undefined;
    const timer = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, loadRest, go]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      id="heroCarousel"
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label="Featured destinations"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {SLIDES.map((slide, i) => (
        <div key={slide.name} className={`hero-slide${i === active ? ' is-active' : ''}`} aria-hidden={i !== active}>
          {(i === 0 || loadRest) && <HeroImage name={slide.name} alt={slide.alt} first={i === 0} />}
        </div>
      ))}

      <button type="button" className="hero-carousel__arrow hero-carousel__arrow--prev" onClick={() => go(-1)} aria-label="Previous slide">
        <ChevronLeft aria-hidden="true" />
      </button>
      <button type="button" className="hero-carousel__arrow hero-carousel__arrow--next" onClick={() => go(1)} aria-label="Next slide">
        <ChevronRight aria-hidden="true" />
      </button>

      <div className="hero-carousel__dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.name}
            type="button"
            className={i === active ? 'is-active' : ''}
            onClick={() => setActive(i)}
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === active}
          />
        ))}
      </div>
    </div>
  );
}
