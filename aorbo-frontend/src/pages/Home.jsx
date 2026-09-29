import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Carousel from 'bootstrap/js/dist/carousel';
import { ArrowRight, BadgeCheck, Mountain, SlidersHorizontal, Users } from 'lucide-react';
import { logClick, qs } from '../api/client';
import useApi from '../hooks/useApi';
import { CATEGORIES, categoryByTag } from '../data/categories';
import HeroSearch from '../components/home/HeroSearch';
import { TrekGrid } from '../components/trek/TrekCard';
import Pagination from '../components/ui/Pagination';
import SectionHeading from '../components/ui/SectionHeading';
import '../styles/Home.css';

// Each slide has a wide version for desktop and a centre-cropped narrow
// version for phones/tablets (they only ever show the middle of the image).
const HERO_SLIDES = [
  { name: 'hero-1', alt: 'Ayodhya, Varanasi and Mathura' },
  { name: 'hero-2', alt: 'Badrinath' },
  { name: 'hero-3', alt: 'Coorg' },
];

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

const REASONS = [
  { icon: SlidersHorizontal, title: 'Tailored Experience', text: 'Customize your trek according to your preferences and comfort level.' },
  { icon: BadgeCheck, title: 'Verified Local Operators', text: 'Every trek is led by trusted, certified local experts who ensure your safety and provide an authentic experience.' },
  { icon: Mountain, title: 'Unmatched Trek Variety', text: 'From serene weekend getaways to challenging Himalayan expeditions, find the perfect trail for your adventure style.' },
  { icon: Users, title: 'Community & Support', text: 'Join a community of passionate adventurers with 24/7* support from a team that lives and breathes the outdoors.' },
];

function HeroCarousel() {
  const ref = useRef(null);

  // Started by hand: Bootstrap's auto-start only runs on the first page load,
  // not when Home is opened later from another page.
  useEffect(() => {
    const carousel = Carousel.getOrCreateInstance(ref.current, { interval: 4000, ride: 'carousel' });
    carousel.cycle();
    return () => carousel.dispose();
  }, []);

  return (
    <div id="heroCarousel" ref={ref} className="carousel slide carousel-fade hero-carousel">
      <div className="carousel-inner">
        {HERO_SLIDES.map((slide, i) => (
          <div key={slide.name} className={`carousel-item${i === 0 ? ' active' : ''}`}>
            <HeroImage name={slide.name} alt={slide.alt} first={i === 0} />
          </div>
        ))}
      </div>
      <button className="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
        <span className="carousel-control-prev-icon" aria-hidden="true" />
        <span className="visually-hidden">Previous</span>
      </button>
      <button className="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
        <span className="carousel-control-next-icon" aria-hidden="true" />
        <span className="visually-hidden">Next</span>
      </button>
    </div>
  );
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag') || '';
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const { data, loading, error } = useApi(`/api/treks/?${qs({ page, tag })}`, { cache: true });

  const pageHref = (n) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', n);
    return `?${params}#featured-destinations`;
  };

  const tagLabel = categoryByTag(tag)?.label || tag;

  return (
    <>
      <section className="hero-landing">
        <HeroCarousel />
        <div className="hero-overlay-content">
          <p className="hero-badge">Aorbo Treks</p>
          <h1 className="hero-heading">Discover Your Adventure</h1>
          <p className="hero-subtitle">
            Search for your next trek or destination and start planning an unforgettable experience.
          </p>
          <HeroSearch />
        </div>
      </section>

      <section className="section" id="featured-destinations">
        <div className="container">
          <SectionHeading
            center
            title="Featured Destinations"
            subtitle={
              tag ? (
                <>
                  Showing treks for <strong>{tagLabel}</strong>.{' '}
                  <Link to="/#featured-destinations" className="link">Show all</Link>
                </>
              ) : (
                'Explore our most loved treks and travel circuits across India.'
              )
            }
          />
          <div id="featured-trek-grid">
            <TrekGrid treks={data?.results} loading={loading} error={error} tag={tag} />
          </div>
          <Pagination page={page} totalPages={data?.total_pages || 1} hrefFor={pageHref} />
        </div>
      </section>

      <section className="section section--alt travel-your-way">
        <div className="container">
          <SectionHeading
            center
            title="Travel Your Way"
            subtitle="Whether you seek adventure, peace, or a quick weekend escape, find the journey that fits your style."
          />
          <div className="grid grid-3">
            {CATEGORIES.map(({ tag: categoryTag, icon: Icon, label, text }) => (
              <Link
                key={categoryTag}
                to={`/travel-your-way?tag=${categoryTag}`}
                className="surface feature-card tyw-card-link"
                onClick={() => logClick({ tag: categoryTag })}
              >
                <span className="icon-tile icon-tile--lg" aria-hidden="true"><Icon /></span>
                <h3>{label}</h3>
                <p>{text}</p>
                <span className="link tyw-card-link__cta">
                  Explore <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            center
            title="Why Trek With Aorbo Treks?"
            subtitle="We're more than a platform; we are your trusted partner in adventure, committed to making every journey safe, seamless, and unforgettable."
          />
          <div className="grid grid-4">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="surface feature-card">
                <span className="icon-tile icon-tile--lg icon-tile--dark" aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
