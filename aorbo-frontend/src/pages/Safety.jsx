import {
  BadgePercent, CalendarCheck, CircleHelp, ClipboardCheck, Headset, HeartHandshake, Lock,
  MessageCircle, ShieldCheck, Siren, SlidersHorizontal, UserRound, Users, Wallet,
} from 'lucide-react';
import useApi from '../hooks/useApi';
import PageHeader from '../components/ui/PageHeader';
import SectionHeading from '../components/ui/SectionHeading';
import '../styles/Safety.css';

const SAFETY_FEATURES = [
  { icon: HeartHandshake, title: 'Female-Friendly Treks', text: 'Offering women-specific treks with experienced female guides who bring a supportive and inclusive atmosphere.' },
  { icon: Headset, title: '24/7 Support', text: 'We have a dedicated team that is available around the clock to assist with any emergencies or help you need.' },
  { icon: Siren, title: 'Emergency Preparedness', text: 'All treks are equipped with an emergency kit, have clear protocols in place, and medical support if needed.' },
  { icon: ShieldCheck, title: 'Safety Drills', text: 'Our trek guides are skilled in handling all types of situations and conduct regular training drills for all trek team members.' },
];

const SOLO_TREKKER = [
  { icon: UserRound, title: 'Solo Experience', text: 'An individual trekker often plans their trek independently, relying on their own research to find treks and organizers.' },
  { icon: Lock, title: 'Limited Access', text: 'They may not have access to a wide variety of trekking options or specialized services without extensive research.' },
  { icon: CircleHelp, title: 'Greater Uncertainty', text: "Solo trekkers may feel uncertain about the reliability of organizers and safety, as they're usually working with unverified sources." },
  { icon: Wallet, title: 'Higher Costs', text: "Solo trekkers might face higher costs since they aren't benefiting from group discounts or tailored packages that offer better value." },
];

const ON_PLATFORM = [
  { icon: Users, title: 'Access to Multiple Organizers', text: 'Users can browse trusted trekking organizers on Aorbo, making it easy to compare options.' },
  { icon: SlidersHorizontal, title: 'Tailored Trek Options', text: 'Users can filter treks by preferences, ensuring a personalized experience.' },
  { icon: ShieldCheck, title: 'Safety and Assurance', text: 'Aorbo ensures partner organizers follow safety standards, providing reliable services for peace of mind.' },
  { icon: BadgePercent, title: 'Cost-Effective Packages', text: 'Aorbo offers group discounts, special deals, and customizable packages to help users save.' },
  { icon: Headset, title: '24/7 Support', text: 'Users have direct access to customer support, ensuring a secure and stress-free experience.' },
  { icon: CalendarCheck, title: 'Streamlined Booking Process', text: 'With Aorbo, users can easily book, pay, and manage their trips in one place.' },
];

const GROUP_BENEFITS = [
  { icon: ClipboardCheck, title: 'Simple Booking', text: 'Group leaders can book for the entire group online with customizable trek options.' },
  { icon: BadgePercent, title: 'Exclusive Discounts', text: 'Get special pricing and flexible payment options for groups.' },
  { icon: Headset, title: 'Dedicated Support', text: 'Enjoy personalized assistance and 24/7 customer support for a smooth experience.' },
  { icon: ShieldCheck, title: 'Safety & Logistics', text: "We manage safety, transport, and accommodation for your group's comfort." },
  { icon: Users, title: 'Team Building', text: 'Engage in activities that promote bonding and collaboration.' },
  { icon: MessageCircle, title: 'Seamless Communication', text: 'Keep everyone informed with clear details and updates.' },
];

function FeatureGrid({ items, columns = 'grid-2' }) {
  return (
    <div className={`grid ${columns}`}>
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="surface feature-card">
          {Icon && <span className="icon-tile icon-tile--lg" aria-hidden="true"><Icon /></span>}
          <h3>{title}</h3>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

// Tips managed from the Django admin, grouped under their section titles.
function groupTips(tips) {
  const groups = new Map();
  for (const tip of tips) {
    const section = tip.section_title || 'Safety Tips';
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push({ title: tip.title, text: tip.content, key: tip.id });
  }
  return [...groups.entries()];
}

export default function Safety() {
  const { data: tips } = useApi('/api/safety-tips/');

  return (
    <div className="page">
      <PageHeader
        eyebrow="Safety"
        title="Explore the Wild with Confidence"
        subtitle="At Aorbo Treks, the safety of our users is our top priority. We ensure a secure and structured trekking experience by partnering with Verified Organizers - you are in safe hands!"
      />

      <div className="container">
        <section className="page-block">
          <SectionHeading title="Safety Features" />
          <div className="split safety-split">
            <FeatureGrid items={SAFETY_FEATURES} />
            <img src="/images/safe_1.webp" alt="No creep zone: trekking with Aorbo" className="illustration" />
          </div>
        </section>

        <section className="page-block">
          <SectionHeading title="Individual Trekker..?" />
          <div className="split safety-split safety-split--reverse">
            <img src="/images/Group 1000001380.webp" alt="Trekking alone without a trusted platform" className="illustration" />
            <FeatureGrid items={SOLO_TREKKER} />
          </div>
        </section>

        <section className="page-block">
          <SectionHeading title="On Aorbo Treks Platform" />
          <img src="/images/Group 1000001376.webp" alt="Trekking with Aorbo Treks" className="illustration safety-banner" />
          <FeatureGrid items={ON_PLATFORM} columns="grid-3" />
        </section>

        <section className="page-block safety-group">
          <div className="split">
            <h2 className="safety-group__title">
              At Aorbo Treks, we make group bookings easy, affordable, and hassle-free
            </h2>
            <img src="/images/money2.webp" alt="Group discounts" className="illustration" />
          </div>
          <FeatureGrid items={GROUP_BENEFITS} columns="grid-3" />
        </section>

        {groupTips(Array.isArray(tips) ? tips : []).map(([title, items]) => (
          <section key={title} className="page-block">
            <SectionHeading title={title} />
            <FeatureGrid items={items} columns="grid-3" />
          </section>
        ))}
      </div>
    </div>
  );
}
