import { useState } from 'react';
import { Building2, Headset, Landmark, Mail, MapPin, Phone } from 'lucide-react';
import { postJSON } from '../api/client';
import useApi from '../hooks/useApi';
import { validateField } from '../utils/contactValidation';
import { CATEGORIES } from '../data/categories';
import PageHeader from '../components/ui/PageHeader';
import InfoCard from '../components/ui/InfoCard';
import '../styles/Contact.css';

const EMPTY_FORM = { name: '', email: '', mobile: '', user_type: '', trek_category: '', comment: '' };
const REQUIRED = ['name', 'email', 'mobile', 'comment'];

// Used until /api/contact-info/ responds (or if it fails).
const FALLBACK_CONTACT = {
  company_name: 'AORBO INFOCOM',
  address: 'Sri Krupa Market, Malakpet, Hyderabad, India, 500036',
  phone: '919398093503',
};

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field__label">{label}</label>
      {children}
      {error && <span className="field__error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const errorFor = (name) => (touched[name] ? errors[name] : '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Mobile: digits only, max 10, as the visitor types.
    const cleaned = name === 'mobile' ? value.replace(/[^0-9]/g, '').slice(0, 10) : value;
    setForm((prev) => ({
      ...prev,
      [name]: cleaned,
      ...(name === 'user_type' && cleaned !== 'trekker' ? { trek_category: '' } : {}),
    }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, cleaned) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: name === 'user_type' && !value ? 'Please select an option from the list.' : validateField(name, value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = Object.fromEntries(REQUIRED.map((f) => [f, validateField(f, form[f])]));
    if (!form.user_type) newErrors.user_type = 'Please select an option from the list.';
    setErrors(newErrors);
    setTouched({ name: true, email: true, mobile: true, comment: true, user_type: true });

    const problems = Object.values(newErrors).filter(Boolean).length;
    if (problems > 0) {
      showToast('error', problems > 1
        ? `Please fill all fields correctly (${problems} fields need attention).`
        : 'Please correct the highlighted field before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const { ok, data } = await postJSON('/api/contact-submit/', form);
      if (ok) {
        showToast('success', "Message sent! We'll get back to you soon.");
        setForm(EMPTY_FORM);
        setErrors({});
        setTouched({});
      } else {
        showToast('error', data.message || 'Something went wrong.');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputProps = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: handleChange,
    onBlur: handleBlur,
    className: `field__control${errorFor(name) ? ' is-invalid' : ''}`,
    'aria-invalid': Boolean(errorFor(name)),
    'aria-describedby': errorFor(name) ? `${name}-error` : undefined,
  });

  return (
    <div className="surface contact-form-card">
      <h2 className="surface-title">Get answers to your Questions</h2>
      <form id="contactForm" onSubmit={handleSubmit} noValidate>
        <Field id="name" label="Name" error={errorFor('name')}>
          <input type="text" autoComplete="name" required {...inputProps('name')} />
        </Field>

        <div className="contact-form-row">
          <Field id="email" label="Email" error={errorFor('email')}>
            <input type="email" autoComplete="email" placeholder="name@example.com" required {...inputProps('email')} />
          </Field>
          <Field id="mobile" label="Mobile Number" error={errorFor('mobile')}>
            <input type="tel" autoComplete="tel-national" inputMode="numeric" maxLength="10" placeholder="9876543210" required {...inputProps('mobile')} />
          </Field>
        </div>

        <Field id="user_type" label="I am a" error={errorFor('user_type')}>
          <select required {...inputProps('user_type')}>
            <option value="">-- Select --</option>
            <option value="trekker">Trekker</option>
            <option value="organizer">Trek Organizer</option>
            <option value="other">Other</option>
          </select>
        </Field>

        {form.user_type === 'trekker' && (
          <Field id="trek_category" label="Trek Category">
            <select {...inputProps('trek_category')}>
              <option value="">-- Select Category --</option>
              {CATEGORIES.map((c) => <option key={c.tag} value={c.tag}>{c.label}</option>)}
            </select>
          </Field>
        )}

        {form.user_type === 'organizer' && (
          <div className="field field__hint">
            <p><strong>Vendor Portal</strong> — for partnership and onboarding, please visit our vendor portal.</p>
            <a href="https://partners.aorbotreks.co.in" target="_blank" rel="noreferrer" className="link">
              partners.aorbotreks.co.in
            </a>
          </div>
        )}

        <Field id="comment" label="Your Message" error={errorFor('comment')}>
          <textarea rows="4" maxLength="500" required {...inputProps('comment')} />
        </Field>

        <button type="submit" className="button button--brand button--block" id="submitBtn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Message'}
        </button>
      </form>

      {toast && <div className={`toast toast--${toast.type}`} role="status">{toast.msg}</div>}
    </div>
  );
}

export default function Contact() {
  const { data: contactData } = useApi('/api/contact-info/');
  const { data: socialData } = useApi('/api/social-media/');
  const contact = contactData?.company_name ? contactData : FALLBACK_CONTACT;
  const socials = Array.isArray(socialData) ? socialData : [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Contact us"
        title="We're here to help"
        subtitle="Questions about a trek, a booking or partnering with us? Send us a message and we'll get back to you."
      />

      <div className="container">
        <div className="page-block split contact-intro">
          <ContactForm />
          <img src="/images/contact.webp" alt="Aorbo Treks customer support" className="illustration" />
        </div>

        <div className="page-block grid grid-2">
          <InfoCard icon={Mail} title="Grievances">
            <p>If you have any concerns or complaints about our services, please reach out to our dedicated grievance team.</p>
            <a href="mailto:care@aorbotreks.com?subject=Issue Regarding the AorboTreks App" className="link">
              Send a message
            </a>
          </InfoCard>
          <InfoCard icon={Landmark} title="Ombudsman">
            <p>Reach out to our regulatory authority via message for third-party complaint escalation procedures.</p>
            <a href="#" className="link">Know More →</a>
          </InfoCard>

          <InfoCard icon={Building2} title="Registered Address">
            <img src="/images/map_loc.webp" alt="" className="contact-map" />
            <address className="contact-address">
              <strong>{contact.company_name}</strong>
              <br />
              {contact.address}
            </address>
            <a href="https://maps.app.goo.gl/ZgXJtZU7XJ9BXkaZ9" target="_blank" rel="noreferrer" className="link">
              <MapPin size={16} aria-hidden="true" /> View in Maps
            </a>
          </InfoCard>
          <InfoCard icon={Headset} title="Customer Support">
            <p>Tap on your Aorbo Treks app Help screen and select a topic for quick assistance.</p>
            <div className="contact-actions">
              <a href={`https://wa.me/${contact.phone}`} className="button button--whatsapp">Get Help on WhatsApp</a>
              <a href={`tel:+${contact.phone}`} className="button button--ghost">
                <Phone size={16} aria-hidden="true" /> Call us
              </a>
            </div>
          </InfoCard>
        </div>

        {socials.length > 0 && (
          <section className="page-block">
            <h2 className="surface-title">Connect With Us</h2>
            <div className="contact-socials">
              {socials.map((social) => (
                <a key={social.url} href={social.url} target="_blank" rel="noreferrer" title={social.name} aria-label={social.name}>
                  {social.icon ? <img src={social.icon} alt="" /> : social.name}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
