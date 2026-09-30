import { Link } from 'react-router-dom';
import {
  BadgeCheck, CalendarDays, Compass, Footprints, Handshake, Rocket, ScrollText, Search, Target, Users,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import InfoCard from '../components/ui/InfoCard';
import SectionHeading from '../components/ui/SectionHeading';
import '../styles/About.css';

const REASONS = [
  { icon: BadgeCheck, title: 'Trusted Organizers', text: 'We partner with experienced and verified trekking experts to ensure your safety and satisfaction.' },
  { icon: Search, title: 'Transparency', text: 'No hidden costs, no unpleasant surprises—just honest and straightforward service.' },
  { icon: Users, title: 'Community', text: 'Join a thriving community of trekkers and adventurers who share your passion for the outdoors.' },
  { icon: Compass, title: 'Tailored Experiences', text: "Whether you're looking for a solo trek or a group adventure, we have options to suit every need." },
];

export default function About() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="About us"
        title="About Aorbo Treks"
        subtitle="Our journey began with one simple idea: to make trekking easy, safe, and fun for everyone."
      />

      <div className="container">
        <div className="page-block split">
          <InfoCard icon={Footprints} title="Who Are We?">
            <p>
              Aorbo Treks isn't just a business; it's a passion-driven venture born out of muddy boots,
              endless trails, and an unshakable love for adventure. We recognized a pressing issue—
              trekking enthusiasts struggling to find reliable organizers and secure options. So, we
              decided to take matters into our own hands and create a platform that adventurers can trust.
            </p>
          </InfoCard>
          <img src="/images/Group 1000001393.webp" alt="The Aorbo Treks team" className="illustration" />
        </div>

        <div className="page-block grid grid-2">
          <InfoCard icon={ScrollText} title="Our Backstory">
            <p>
              Our journey began with one simple idea: to make trekking easy, safe, and fun for everyone. No
              more endless searching, no more second-guessing, and no more falling prey to scams. We've been
              in your shoes—lost, confused, and disappointed—and we know how it feels. That's why we built
              Aorbo Treks, ensuring that no one else has to go through the same challenges. Our platform is
              designed to be your trusted guide, making every step of your journey worth remembering.
            </p>
          </InfoCard>
          <InfoCard icon={Target} title="Our Goal">
            <p>
              Our vision is clear—to become your ultimate go-to platform for treks and adventure trips. We
              connect passionate adventurers like you with verified, experienced organizers, ensuring a
              seamless and worry-free experience. Think of us as the Tinder of trekking - only better! With
              Aorbo Treks, you won't have to worry about getting ghosted. Instead, you'll find the perfect
              match for your adventure needs.
            </p>
          </InfoCard>
        </div>

        <div className="page-block split">
          <InfoCard icon={Rocket} title="Our Mission">
            <p>
              We are on a mission to spread the love of trekking and traveling to people from all walks
              of life. Whether you're an absolute beginner or a seasoned hiker, our goal is to make
              your trekking discoveries safe, unforgettable. We believe that trekking should be
              accessible to everyone, and we are here to make that happen.
            </p>
          </InfoCard>
          <img src="/images/mission.webp" alt="Trekkers reaching a summit together" className="illustration about-mission-img" />
        </div>

        <div className="page-block grid grid-2">
          <InfoCard icon={Handshake} title="Our Dedication">
            <p>
              At Aorbo Treks, trekking isn't just a job—it's our way of life. Our commitment goes beyond
              running a platform; we strive to build trust, ensure transparency, and craft experiences that
              leave you saying "That was the best decision ever!" Our team is composed of passionate trekkers
              who understand the ins and outs of adventure travel, always ready to go the extra mile to
              provide the best service.
            </p>
          </InfoCard>
          <InfoCard icon={CalendarDays} title="Our Agenda">
            <p>
              Our goal is to transform trekking from a bucket-list activity into an integral part of your
              lifestyle. Because life's too short to stay indoors! We encourage you to step outside, connect
              with nature, meet like-minded adventurers, and create memories that last a lifetime. And while
              you focus on the thrill, we handle the logistics to ensure a hassle-free experience.
            </p>
          </InfoCard>
        </div>

        <section className="page-block">
          <SectionHeading title="Why Choose Aorbo Treks?" />
          <div className="grid grid-4">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="surface feature-card">
                <span className="icon-tile icon-tile--lg" aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="page-block cta-band">
          <div>
            <h2>Ready to Explore?</h2>
            <p>
              Join us at Aorbo Treks and embark on a journey that's filled with excitement, adventure, and
              unforgettable experiences. Let's make trekking an adventure of a lifetime—one trail at a time!
            </p>
            <Link to="/#featured-destinations" className="button button--dark about-cta-button">
              Find your trek
            </Link>
          </div>
          <img src="/images/contact service.jpeg" alt="Trekkers ready to explore" />
        </section>
      </div>
    </div>
  );
}
