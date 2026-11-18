import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';
import useSeo from '../seo/useSeo';
import { staticPageMeta } from '../seo/meta';

const CARE_EMAIL = 'care@aorbotreks.com';
const careLink = <a href={`mailto:${CARE_EMAIL}`}>{CARE_EMAIL}</a>;
const carePhone = <a href="tel:+917989251063">+91 79892 51063</a>;

// Admin-added sections continue the lettering after section N.
const letterAfterN = (i) => String.fromCharCode('N'.charCodeAt(0) + i + 1);

export default function PrivacyPolicy() {
  useSeo(staticPageMeta('/privacy-policy'));
  return (
    <LegalPage title="Privacy Policy" audience="How Aorbo Treks handles the personal information of its customers" updated="18 November 2026" contentKind="privacy" numberSection={letterAfterN}>
      <h3>A. WHO WE ARE AND WHAT THIS POLICY COVERS</h3>
      <p>
        Aorbo Treks is run by AORBO INFOCOM, Sri Krupa Market, Malakpet, Hyderabad, Telangana 500036, India
        (&ldquo;Aorbo Treks&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the Data Fiduciary for the personal data
        described here under the Digital Personal Data Protection Act, 2023. This policy covers customers of the Aorbo Treks
        app and visitors to aorbotreks.com. Organisers are covered by our Partner Privacy Policy. This policy is part of
        our <Link to="/terms">Terms and Conditions</Link>.
      </p>

      <h3>B. WHAT WE COLLECT</h3>
      <h5>You give us</h5>
      <ul>
        <li><p><strong>Account:</strong> your mobile number, name and e-mail address, and, if you add them, your age, gender, date of birth and state.</p></li>
        <li><p><strong>Travellers you book:</strong> each traveller&rsquo;s name, age and gender. You confirm each traveller has agreed to you sharing these details.</p></li>
        <li><p><strong>Trusted contacts you save:</strong> their name, phone number and relationship to you. Only our staff can see them; they are not shared with organisers. You confirm they have agreed.</p></li>
        <li><p><strong>Ratings, reviews, complaints and messages</strong> you send us, and details you give on the contact form on our website.</p></li>
      </ul>
      <h5>From your bookings and payments</h5>
      <ul>
        <li><p>Your bookings, cancellations, refunds, coupons and referrals.</p></li>
        <li><p>From our payment gateway, Razorpay: the payment reference, method, amount and gateway fee. You pay on Razorpay&rsquo;s checkout; we do not receive or store your card number, UPI PIN or bank password.</p></li>
      </ul>
      <h5>We collect automatically</h5>
      <ul>
        <li><p>Your IP address and approximate country, device model, operating system, app version, a device identifier, a short code made from basic device or browser settings, your time zone, your sign-ins, and a fraud risk score worked out from these, to keep accounts secure and prevent fraud.</p></li>
        <li><p>A record of each time you accept our terms: the version, time, IP address, device and app version.</p></li>
        <li><p>What you do in the app (for example treks viewed, searches and bookings started), linked to your account when you are signed in, to improve the app.</p></li>
        <li><p>Crash reports with device details; a notification token; Google Play&rsquo;s check of whether the app and device are genuine; the Google Play install referrer, to credit referral links; and, where the app shows ads, your device&rsquo;s advertising ID.</p></li>
        <li><p>On our website: which treks, tags and searches are clicked, not linked to your name.</p></li>
      </ul>
      <p>We do not collect your precise location, contacts, photos, SMS, call logs or calendar, and we do not collect health information. What you tell an organiser about your fitness is between you and the organiser.</p>

      <h3>C. WHY WE USE IT</h3>
      <ul>
        <li><p>To create your account, take your booking and payment, pass your booking to the organiser, and process cancellations and refunds.</p></li>
        <li><p>To send one-time passwords (by SMS), booking, cancellation and refund notices (in the app and by e-mail), and important updates.</p></li>
        <li><p>To give customer support, pass complaints to organisers and handle disputes and chargebacks.</p></li>
        <li><p>To show your reviews publicly with your name (<Link to="/terms">Terms</Link>, section 10).</p></li>
        <li><p>To keep the platform secure, prevent fraud and misuse of coupons and referrals, enforce our terms and report offences (<Link to="/terms">Terms</Link>, section 4).</p></li>
        <li><p>To send offers and trek suggestions as app notifications, and to show ads in the app.</p></li>
        <li><p>To improve the app and website, and to meet our legal, tax and accounting duties.</p></li>
      </ul>
      <p>We use your data with your consent, which you give by using Aorbo Treks, and for the uses the law allows without consent, such as meeting legal duties.</p>

      <h3>D. WHO WE SHARE IT WITH</h3>
      <p>We do not sell personal data or aggregated data. We share data only as needed to run Aorbo Treks, protect our rights and meet the law:</p>
      <div className="legal-table">
        <table>
          <thead><tr><th scope="col">Who</th><th scope="col">What</th><th scope="col">Why</th></tr></thead>
          <tbody>
            <tr><td>The organiser of your trek</td><td>Your name, mobile number and e-mail, your travellers&rsquo; names, ages and genders, and the booking details</td><td>Running your trek</td></tr>
            <tr><td>Razorpay</td><td>Your name, mobile number, e-mail and payment</td><td>Payments and refunds</td></tr>
            <tr><td>Message Central</td><td>Your mobile number</td><td>One-time passwords</td></tr>
            <tr><td>Zoho</td><td>Your e-mail address and the message</td><td>E-mails</td></tr>
            <tr><td>Google Firebase</td><td>Notification token, crash reports and device details</td><td>Notifications and fixing crashes</td></tr>
            <tr><td>Google AdMob</td><td>Advertising ID, device details and IP address</td><td>Showing ads in the app (with consent where Google requires it)</td></tr>
            <tr><td>Google Play</td><td>App and device check; install referrer</td><td>Security; crediting referral links</td></tr>
            <tr><td>Cloudflare, and image and font hosts (such as Cloudinary, Supabase and Google Fonts)</td><td>Network traffic, IP address and device or browser details</td><td>Security, and loading pages and photos</td></tr>
            <tr><td>Banks and payment providers</td><td>What is needed</td><td>Refunds, fraud and chargebacks</td></tr>
            <tr><td>Our professional advisers and auditors, and a successor or buyer (section N)</td><td>What they need</td><td>Running and protecting our business</td></tr>
            <tr><td>The police, courts, tax authorities and regulators</td><td>What the law requires or allows</td><td>Legal duties, lawful requests, and reporting offences</td></tr>
          </tbody>
        </table>
      </div>
      <p>Each organiser is an independent business and is responsible for how it uses your data. Service providers process data for us under their agreements with us.</p>

      <h3>E. WHERE IT IS STORED</h3>
      <p>The servers for the app, your account and your bookings are located in India. Our website, including its contact form, is hosted in France. Some service providers (such as Google, Firebase, Razorpay, Cloudinary and Cloudflare) may store or process data outside India, as the law allows unless the Government restricts a country.</p>

      <h3>F. HOW LONG WE KEEP IT</h3>
      <ul>
        <li><p><strong>Booking, payment, refund and tax records:</strong> as long as tax, GST and company law require (usually up to 8 years after the financial year), or longer while a dispute is open.</p></li>
        <li><p><strong>Security and audit records:</strong> as long as needed to prevent fraud, defend claims and meet the law. <strong>Server logs:</strong> at least the period the law requires (currently 180 days).</p></li>
        <li><p><strong>After you delete your account:</strong> as set out in section M.</p></li>
        <li><p><strong>Backups:</strong> deleted in rotation within 30 to 90 days; a daily encrypted emergency copy may be kept longer.</p></li>
      </ul>

      <h3>G. COOKIES ON OUR WEBSITE</h3>
      <p>Our website uses no advertising or analytics cookies. It stores your cookie choice in your browser, and our servers record the IP address and browser details of each visit for security.</p>

      <h3>H. APP PERMISSIONS AND MESSAGES</h3>
      <p>The app uses internet and network access, notifications (which you can switch off in your phone&rsquo;s settings), vibration, and the advertising ID for ads. It does not ask for location, contacts, camera, photos, SMS, phone or calendar access.</p>
      <p>One-time passwords and booking, cancellation and refund notices are part of the service and are sent even if you have opted out of promotional messages. To stop offers, switch off notifications for the app or write to {careLink}.</p>

      <h3>I. HOW WE PROTECT IT</h3>
      <p>Data is sent over encrypted connections (TLS). Access is limited to authorised staff, changes to sensitive details are logged, and backups are encrypted. You are responsible for your phone, SIM and one-time passwords. No system is completely secure; if a personal data breach affects you, we will inform you and the authorities as the law requires.</p>

      <h3>J. CONSENT AND WITHDRAWING IT</h3>
      <p>You can withdraw consent at any time by writing to {careLink}. Withdrawal does not affect what we did before it. We cannot take bookings or run your account without the data needed for them, and we keep the records described in section F.</p>

      <h3>K. YOUR RIGHTS</h3>
      <p>You can see and update most of your details in the app. You can also ask us for a summary of your data and who we shared it with, to correct or complete it, or to erase data we no longer need, and you can nominate someone to use these rights for you if you die or cannot act. E-mail {careLink} from the e-mail address on your account, or write from your registered mobile number; we may first confirm it is you. These rights are subject to the exceptions in the law.</p>

      <h3>L. CHILDREN</h3>
      <p>Aorbo Treks is only for adults. Accounts and travellers must be 18 or older, and we do not knowingly collect personal data of anyone under 18. If you believe we hold such data, write to {careLink}.</p>

      <h3>M. DELETING YOUR ACCOUNT</h3>
      <p>
        You can delete your account in the app. Deletion is scheduled 30 days later; signing in again before then cancels it.
        It cannot be requested while you have an upcoming or ongoing trek, a refund in progress or an open complaint. On
        deletion we clear your profile, replace your number, and delete your saved travellers, trusted contacts and sign-in
        history. Booking, payment and tax records are kept as the law requires (section F). We keep your registration
        details for 180 days, and a one-way code of your mobile number for 12 months; a new account on the same number
        cannot use platform-wide coupons or referral benefits during those 12 months.
      </p>

      <h3>N. CHANGES, TRANSFER AND GRIEVANCES</h3>
      <p>We may update this policy; the date at the top shows the latest version, and we will ask you to accept important changes in the app. If the Aorbo Treks business is moved, merged or sold, including to the company being formed by the owners of AORBO INFOCOM, your data may pass to the new owner, which will be bound by this policy.</p>
      <p>
        <strong>Grievance Officer:</strong> Abhishek Sakunam, AORBO INFOCOM, {careLink}, {carePhone}, Sri Krupa Market,
        Malakpet, Hyderabad, Telangana 500036, India. We acknowledge a grievance within 24 hours and resolve it within 15
        days. You must first use this process (Digital Personal Data Protection Act, 2023, section 13(3)); if you are not
        satisfied, you may complain to the Data Protection Board of India.
      </p>
    </LegalPage>
  );
}
