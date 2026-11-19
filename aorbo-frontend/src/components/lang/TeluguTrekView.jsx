import { Link } from 'react-router-dom';
import TrekCard from '../trek/TrekCard';
import PageHeader from '../ui/PageHeader';
import SectionHeading from '../ui/SectionHeading';
import FactList from '../ui/FactList';
import { teFactRows, teFaqs, teState, teSummary } from '../../seo/telugu';
import '../../styles/TreksNear.css';
import '../../styles/FactPages.css';

const asCard = (l, state) => ({
  id: l.id, name: l.name, state, price_start: l.price, duration_days: l.duration, operating_days: l.operating_days,
  images: l.image ? [{ image_url: l.image }] : [],
});

// A trek guide in Telugu (scripts/lang-pages.mjs, src/seo/telugu.js). Pure: everything comes from `page`.
export default function TeluguTrekView({ page }) {
  return (
    <div className="page near-page" lang="te">
      <PageHeader
        eyebrow={`ట్రెక్ గైడ్ · ${teState(page.state)}`}
        title={`${page.nameTe} ట్రెక్`}
        subtitle={`${page.name} · ఎత్తు, నడక దూరం, కష్టం, సరైన సమయం, ఎలా చేరుకోవాలి`}
        back={{ to: '/te', label: 'అన్ని ట్రెక్ గైడ్‌లు' }}
      />
      <div className="container">
        <p className="near-lead">{teSummary(page).join(' ')}</p>
        <div className="fact-table-wrap">
          <FactList plain items={teFactRows(page.facts)} />
        </div>
        <p className="fact-note">ఎత్తు, దూరం సుమారుగా, పబ్లిక్ సమాచారం నుండి. ఖచ్చితమైన మార్గాన్ని మీ ఆర్గనైజర్ చెబుతారు. <Link to={page.en} lang="en" hrefLang="en">Read in English</Link></p>

        <section className="section near-section">
          <SectionHeading title={`${page.nameTe} ప్యాకేజీలు`} subtitle="Aorbo Treksలో ఆర్గనైజర్ల ప్యాకేజీలు: తేదీ ఎంచుకుని బుక్ చేయండి." />
          <div className="grid grid-cards">
            {page.listings.map((l) => <TrekCard key={l.id} trek={asCard(l, page.state)} tag={`te:${page.slug}`} />)}
          </div>
        </section>

        <section className="section near-section" aria-labelledby="te-faq-title">
          <h2 id="te-faq-title" className="section-title">{page.nameTe}: ప్రశ్నలు</h2>
          {teFaqs(page).map((q) => (
            <details key={q.q} className="page-faq__item" open>
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </section>

        {page.others?.length > 0 && (
          <section className="section near-section">
            <SectionHeading title={`${teState(page.state)}లో మరిన్ని ట్రెక్‌లు`} />
            <ul className="chip-list">
              {page.others.map((o) => <li key={o.path}><Link className="chip chip--outline" to={o.path}>{o.nameTe}</Link></li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** /te: every Telugu trek guide, by state. */
export function TeluguHubView({ hub }) {
  return (
    <div className="page near-page" lang="te">
      <PageHeader eyebrow="తెలుగులో" title="ట్రెక్కింగ్ గైడ్‌లు" subtitle="ఎత్తు, నడక దూరం, కష్టం, సరైన సమయం, ఎలా చేరుకోవాలి, ధరలు: ప్రతి ట్రెక్ గురించి తెలుగులో." />
      <div className="container">
        {hub.states.map((s) => (
          <section key={s.state} className="section near-section">
            <SectionHeading title={teState(s.state)} subtitle={`${s.treks.length} ట్రెక్‌లు`} />
            <ul className="chip-list">
              {s.treks.map((t) => <li key={t.path}><Link className="chip chip--outline" to={t.path}>{t.nameTe}</Link></li>)}
            </ul>
          </section>
        ))}
        <p className="fact-note"><a href="/" lang="en" hrefLang="en">Aorbo Treks in English</a></p>
      </div>
    </div>
  );
}
