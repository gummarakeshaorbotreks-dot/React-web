import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';
import useSeo from '../seo/useSeo';
import { staticPageMeta } from '../seo/meta';

export default function UserAgreement() {
  useSeo(staticPageMeta('/user-agreement'));
  return (
    <LegalPage title="User Agreement" audience="For customers of the Aorbo Treks website and mobile app" updated="21 November 2026" contentKind="agreement" numberSection={(i) => 14 + i + 1}>
      
      {/* 1. DEFINITIONS AND INTERPRETATION */}
      <h3>1. DEFINITIONS AND INTERPRETATION</h3>
      <p>
        1.1 <strong>“Aorbo Treks”</strong> refers to the business entity operated by <strong>AORBO INFOCOM PRIVATE LIMITED</strong> (CIN U79900TS2026PTC226197),
        offering services related to trekking, travel bookings, and other related activities through its platform,
        including the Website and mobile applications.
      </p>
      <p>
        1.2 <strong>“User”</strong> refers to an individual who accesses, browses, or uses the Website, Application,
        platform, and services provided by Aorbo Treks.
      </p>
      <p>
        1.3 <strong>“Service Providers”</strong> refers to the third-party vendors, trekking organizers, travel
        agencies, or any other entity offering services through Aorbo Treks.
      </p>
      <p>
        1.4 <strong>“Website”</strong> refers to the official website, <strong>www.aorbotreks.com</strong>, 
        as well as any related mobile applications, platforms, and tools provided by Aorbo Treks.
      </p>
      <p>
        1.5 <strong>“Agreement”</strong> refers to this legally binding document, inclusive of any modifications,
        amendments, or updates made from time to time, which governs the terms, conditions, and policies applicable
        to the use of the Aorbo Treks website, platform, and all associated services offered by Aorbo Treks.
      </p>

      {/* 2. ACCEPTANCE OF TERMS */}
      <h3>2. ACCEPTANCE OF TERMS</h3>
      <p>
        2.1 By accessing or using the Website, mobile applications, or any related services provided by Aorbo Treks,
        the User agrees to be bound by this <strong>User Agreement</strong>. If the User does not agree with the
        terms and conditions herein, they must refrain from using the Website or services.
      </p>
      <p>
        2.2 Aorbo Treks may change this Agreement. The date at the top shows the latest version. When we make an
        important change, we will ask you to accept the new version in the app before you continue to use it.
      </p>

      {/* 3. ELIGIBILITY AND ACCOUNT REGISTRATION */}
      <h3>3. ELIGIBILITY AND ACCOUNT REGISTRATION</h3>
      <p>
        3.1 To use the services provided by Aorbo Treks, the User must be at least 18 years of age and have the legal
        capacity to enter into this Agreement. Every traveller booked must also be 18 or older
        (<Link to="/terms">Terms and Conditions</Link>, section 7).
      </p>
      <p>
        3.2 The User agrees to provide accurate and truthful information during registration and booking, and to keep
        it up to date.
      </p>
      <p>
        3.3 In case of any unauthorized use or breach of security related to their account, the User must immediately
        notify Aorbo Treks and take steps to protect their account.
      </p>

      {/* 4. SERVICES AND USE OF THE WEBSITE */}
      <h3>4. SERVICES AND USE OF THE WEBSITE</h3>
      <p>
        4.1 <strong>Aorbo Treks</strong> offers a platform where Users can browse and book treks run by independent
        Service Providers (organisers). Aorbo Treks is not the service provider: it takes the booking and payment in the
        app, passes the organiser&rsquo;s share to the organiser, makes refunds under
        the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>, passes complaints to the organiser and gives
        customer support. It does not run or supervise any trek.
      </p>
      <p>
        4.2 Users acknowledge that Aorbo Treks is not responsible for the quality, availability, or performance of
        the services provided by the Service Providers, and any issues or disputes about them must be resolved directly
        with the Service Providers, except cancellations and refunds of amounts paid in the app, which Aorbo Treks
        handles under the Refund &amp; Cancellation Policy.
      </p>
      <p>
        4.3 Users may book treks via the Website and app. By confirming a booking, the User agrees to the trek details
        shown in the listing. Cancellations and refunds follow the Refund &amp; Cancellation Policy, which prevails over
        any different term of the Service Provider.
      </p>
      <p>
        4.4 <strong>Aorbo Treks</strong> charges a platform fee of ₹10 per booking (inclusive of GST), shown before you pay.
      </p>
      <p>
        4.5 <strong>Aorbo Treks</strong> reserves the right to modify, suspend, or discontinue its Website or
        services at any time without prior notice.
      </p>

      {/* 5. USER RESPONSIBILITIES */}
      <h3>5. USER RESPONSIBILITIES</h3>
      <p>
        5.1 The User agrees to use the Website and its services only for lawful purposes and in compliance with all
        applicable laws, regulations, and guidelines.
      </p>
      <p>
        5.2 The User is responsible for reviewing the trek details in the listing, including what is and is not
        included, before making a booking.
      </p>
      <p>
        5.3 Users are prohibited from uploading, posting, transmitting, or distributing any content on the Website
        that is unlawful, offensive, defamatory, abusive, or otherwise harmful. Aorbo Treks reserves the right to
        remove such content at its discretion and take appropriate legal action against the responsible
        individual(s).
      </p>
      <p>
        5.4 The User agrees not to use the Website for the purpose of engaging in fraudulent or misleading
        activities, including making false claims, misrepresenting their identity, or engaging in any form of
        illegal activity.
      </p>

      {/* 6. PAYMENT TERMS AND FEES */}
      <h3>6. PAYMENT TERMS AND FEES</h3>
      <p>
        6.1 <strong>Booking Process:</strong>{' '}
        Users may search, select and book treks on the Aorbo Treks platform, subject to availability and the trek
        details shown in the listing.
      </p>
      <p>
        6.2 <strong>Payment Modes:</strong>{' '}
        Every trek follows one of two policies, shown before you book:
      </p>
      <ul>
        <li>
          <p><strong>Standard Policy:</strong> the full amount is paid in the app at the time of booking.</p>
        </li>
        <li>
          <p><strong>Flexible Policy:</strong> you pay an advance of ₹999 per traveller, together with the GST and the platform fee, in the app, and pay the rest of the trek fare directly to the organiser as shown in your booking; or you pay the full amount in the app.</p>
        </li>
      </ul>
      <p>
        <strong>Balance paid to the organizer:</strong> a balance paid under the Flexible Policy goes directly to the
        Vendor (your trek organizer), not to Aorbo Treks. Please pay only as shown in your booking and keep the receipt.
        The Vendor is responsible for this amount, including any refund of it that becomes due. If you face any problem
        with it, contact Aorbo Treks customer care: we will take it up with the Vendor and help you get it resolved.
      </p>
      <p>
        6.3 <strong>What the Fare Includes:</strong>{' '}
        The amount shown before you pay is the trek fare, GST and the ₹10 platform fee. Anything the listing shows as
        &ldquo;Not included&rdquo; is not in the fare and, if you need or choose it, is paid directly to the organiser or
        the seller (<Link to="/terms">Terms and Conditions</Link>, section 4).
      </p>
      <p>
        6.4 <strong>Refunds:</strong>{' '}
        Cancellations and refunds of bookings made through the platform are processed by Aorbo Treks in accordance
        with the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link> (see Section 7).
      </p>
      <p>
        6.5 <strong>Payment Security:</strong>{' '}
        All transactions made through the platform are securely processed through third-party payment gateways.
        Aorbo Treks does not store any sensitive financial information, ensuring that User payment data is handled
        securely in accordance with industry standards.
      </p>
      <p>
        6.6 <strong>Platform Fee:</strong>{' '}
        The only fee Aorbo Treks charges you is the ₹10 platform fee per booking (inclusive of GST), shown before you
        pay. The User is solely responsible for selecting their preferred organiser.
      </p>
      <p>
        6.7 <strong>Taxes:</strong>{' '}
        Users are responsible for the payment of all applicable taxes in accordance with local laws and regulations.
        Any tax liabilities arising from the User's bookings will be determined and payable by the User at the time
        of booking or during the course of the service.
      </p>

      {/* 7. CANCELLATIONS AND REFUNDS */}
      <h3>7. CANCELLATIONS AND REFUNDS</h3>
      <p>
        7.1 Cancellations and refunds of bookings made through the platform are governed by the Aorbo Treks{' '}
        <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>, which forms part of this Agreement.
      </p>
      <p>
        7.2 In summary, the cancellation charge depends on whether the trek follows the Standard Policy or the
        Flexible Policy (shown before booking) and on how close to departure the booking is cancelled. Under the
        Flexible Policy, the ₹999 advance per traveller is non-refundable. The ₹10 platform fee is never refunded.
        When you cancel, the payment gateway fee is not taken from your refund, and GST is refunded in full when you
        cancel before the trek starts. Nothing is refunded if you cancel after departure.
      </p>
      <p>
        7.3 If the departure is cancelled, the organiser refuses you, or we find the organiser at fault, you get back
        everything you paid in the app except the ₹10 platform fee. A trek stopped part-way may get a part refund under
        the Refund &amp; Cancellation Policy. Aorbo Treks gives no refund or compensation after a trek has ended.
        Rescheduling is not offered. Refunds start immediately and usually reach the User in 5–7 business days.
      </p>

      {/* 8. PRIVACY AND CONFIDENTIALITY */}
      <h3>8. PRIVACY AND CONFIDENTIALITY</h3>
      <p>
        8.1 The User agrees to the <strong>Privacy Policy</strong> of Aorbo Treks, which governs how personal
        information is collected, used, stored, and protected. The Privacy Policy is incorporated into this
        Agreement by reference.
      </p>
      <p>
        8.2 Aorbo Treks will use reasonable efforts to protect the confidentiality and security of User data in
        accordance with industry standards. However, no data transmission over the internet can be completely
        secure, and Aorbo Treks cannot guarantee absolute security.
      </p>
      <p>
        8.3 The User acknowledges and agrees that Aorbo Treks may share their information with third-party Service
        Providers in order to facilitate bookings, provide customer support, or comply with legal obligations.
      </p>

      {/* 9. INTELLECTUAL PROPERTY RIGHTS */}
      <h3>9. INTELLECTUAL PROPERTY RIGHTS</h3>
      <p>
        9.1 The Website and all its content, including but not limited to logos, text, images, videos, and software,
        are owned by AORBO INFOCOM PRIVATE LIMITED or its licensors and are protected by intellectual property laws.
      </p>
      <p>
        9.2 The User is granted a limited, non-exclusive, non-transferable license to access and use the Website for
        personal, non-commercial purposes. Any unauthorized use of the Website’s content is strictly prohibited.
      </p>
      <p>
        9.3 The User agrees not to modify, reproduce, distribute, or create derivative works of any content from the
        Website without express permission from Aorbo Treks.
      </p>

      {/* 10. LIMITATION OF LIABILITY */}
      <h3>10. LIMITATION OF LIABILITY</h3>
      <p>
        10.1 Aorbo Treks&rsquo; liability is limited as set out in section 11 of the{' '}
        <Link to="/terms">Terms and Conditions</Link>, which applies to this Agreement.
      </p>

      {/* 11. SEVERABILITY */}
      <h3>11. SEVERABILITY</h3>
      <p>
        11.1 If any provision of this Agreement is found to be invalid, illegal, or unenforceable by a court of
        competent jurisdiction, the validity of the remaining provisions shall not be affected, and the Agreement
        will be enforced to the maximum extent possible.
      </p>

      {/* 12. DISPUTE RESOLUTION AND GOVERNING LAW */}
      <h3>12. DISPUTE RESOLUTION AND GOVERNING LAW</h3>
      <p>
        12.1 This Agreement shall be governed by and construed in accordance with the laws of India.
      </p>
      <p>
        12.2 Subject to the next sentence, the courts at Hyderabad, Telangana have exclusive jurisdiction over any
        dispute arising out of or relating to this Agreement. Nothing in this Agreement affects the User&rsquo;s right to
        file a complaint before a Consumer Commission under the Consumer Protection Act, 2019.
      </p>
      <p>
        12.3 Notwithstanding the above, Aorbo Treks may seek injunctive or other equitable relief in any court of
        competent jurisdiction to protect its intellectual property or enforce its rights under this Agreement.
      </p>

      {/* 13. AMENDMENTS */}
      <h3>13. AMENDMENTS</h3>
      <p>
        13.1 Changes to this Agreement are made as set out in clause 2.2. Aorbo Treks may transfer this Agreement to
        any entity that takes over the Aorbo Treks business.
      </p>

      {/* 14. CONTACT INFORMATION */}
      <h3>14. CONTACT INFORMATION</h3>
      <p className="emphasis">
        Company: AORBO INFOCOM PRIVATE LIMITED (CIN U79900TS2026PTC226197)<br />
        Platform: Aorbo Treks (www.aorbotreks.com)<br />
        Support Email: care@aorbotreks.com<br />
        Phone and WhatsApp: +91 79892 51063<br />
        Registered office: Plot No. 56, H.No. 1-101/8, Srinivasa Nilayam, 4th Floor, Madhapur, Shaikpet, Hyderabad, Telangana 500081, India<br />
        Grievance Officer: Abhishek Sakunam (care@aorbotreks.com, +91 79892 51063). We acknowledge a grievance within
        24 hours and resolve it within 15 days.
      </p>

      <p>
        This User Agreement is a legally binding contract between Aorbo Treks and the User. By using our services,
        the User acknowledges that they have read, understood, and agreed to be bound by these terms and conditions.
      </p>
    </LegalPage>
  );
}
