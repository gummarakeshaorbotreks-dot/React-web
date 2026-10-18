import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarCheck, CreditCard, Route, Search, ListChecks, Mountain, ReceiptText } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import SectionHeading from './ui/SectionHeading';
import { APP_FAQS, PLAY_STORE_URL } from '../seo/meta';
import '../styles/TreksNear.css';

const STEPS = [
  { icon: Search, title: 'Search', text: 'Find treks by place, state or weekend, from organisers across India.' },
  { icon: ListChecks, title: 'Choose', text: 'Compare organisers for the same place: price, dates, durations and what is included.' },
  { icon: CreditCard, title: 'Book', text: 'Pick your date and book your slot in the app.' },
  { icon: Mountain, title: 'Go', text: 'Meet your organiser at the pickup point and start your trek.' },
];

const BEFORE_YOU_BOOK = [
  { icon: BadgeCheck, title: 'Verified organisers', text: 'Every organiser completes KYC verification, and every trek listing is reviewed before it goes live.' },
  { icon: ReceiptText, title: 'Real prices', text: 'The price per person is shown upfront for every trek.' },
  { icon: Route, title: 'Clear routes', text: 'See the places, activities and durations of each trek before you book.' },
  { icon: CalendarCheck, title: 'Clear cancellation terms', text: 'Cancellation and refund terms are shown before you pay.' },
];

const PlayBadge = () => (
  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="app-badge">
    <img src="/images/Vector.webp" alt="Get the Aorbo Treks app on Google Play" width="180" height="54" loading="lazy" />
  </a>
);

// /app — the Aorbo Treks Android app. Pure (no data), so the build pre-renders it.
export default function AppView() {
  return (
    <div className="page near-page">
      <PageHeader
        eyebrow="Aorbo Treks app"
        title="Book treks on your phone"
        subtitle="The Aorbo Treks app is free on Android. Compare treks from verified organisers across India and book in a few taps."
      >
        <PlayBadge />
      </PageHeader>
      <div className="container">
        <section className="section near-section">
          <SectionHeading title="How it works" subtitle="Search, choose, book, go." />
          <ul className="near-list">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <li key={title}><strong><Icon aria-hidden="true" size={16} /> {title}</strong><span>{text}</span></li>
            ))}
          </ul>
        </section>

        <section className="section near-section">
          <SectionHeading title="What you see before you book" />
          <ul className="near-list">
            {BEFORE_YOU_BOOK.map(({ icon: Icon, title, text }) => (
              <li key={title}><strong><Icon aria-hidden="true" size={16} /> {title}</strong><span>{text}</span></li>
            ))}
          </ul>
        </section>

        <section className="section near-section" aria-labelledby="app-faq-title">
          <h2 id="app-faq-title" className="section-title">Aorbo Treks app: questions</h2>
          {APP_FAQS.map((f) => (
            <details key={f.q} className="page-faq__item" open>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section className="section near-section">
          <PlayBadge />
          <p className="near-note">Prefer the website? The same treks are on <Link to="/destinations">aorbotreks.com</Link>.</p>
        </section>
      </div>
    </div>
  );
}
