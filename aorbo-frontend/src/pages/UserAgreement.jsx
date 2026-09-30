import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';

export default function UserAgreement() {
  return (
    <LegalPage title="User Agreement" audience="For customers of the Aorbo Treks website and mobile app" updated="30 September 2026" contentKind="agreement" numberSection={(i) => 14 + i + 1}>
      
      {/* 1. DEFINITIONS AND INTERPRETATION */}
      <h3>1. DEFINITIONS AND INTERPRETATION</h3>
      <p>
        1.1 <strong>“Aorbo Treks”</strong> refers to the business entity operated by <strong>Aorbo Infocom</strong>,
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
        2.2 Aorbo Treks reserves the right to modify or update the User Agreement at its discretion. Any changes made
        will be reflected on the Website, and continued use of the Website after such modifications will be deemed
        as acceptance of those changes.
      </p>

      {/* 3. ELIGIBILITY AND ACCOUNT REGISTRATION */}
      <h3>3. ELIGIBILITY AND ACCOUNT REGISTRATION</h3>
      <p>
        3.1 To use the services provided by Aorbo Treks, the User must be at least 18 years of age and have the legal
        capacity to enter into and comply with this Agreement. <strong>If the User is under the age of 18,</strong>{' '}
        they may not use the Website or services without supervision from a parent or legal guardian.
      </p>
      <p>
        3.2 The User agrees to provide accurate and truthful information during registration...
      </p>
      <p>
        3.3 In case of any unauthorized use or breach of security related to their account, the User must immediately
        notify Aorbo Treks and take steps to protect their account.
      </p>

      {/* 4. SERVICES AND USE OF THE WEBSITE */}
      <h3>4. SERVICES AND USE OF THE WEBSITE</h3>
      <p>
        4.1 <strong>Aorbo Treks</strong> offers a platform where Users can browse and book trekking and travel
        services provided by third-party Service Providers. Aorbo Treks is not a direct service provider, 
        <strong> but an intermediary that connects Users with these Service Providers</strong>.
      </p>
      <p>
        4.2 Users acknowledge that Aorbo Treks is not responsible for the quality, availability, or performance of
        the services provided by the Service Providers, and any issues or disputes must be resolved directly with
        the Service Providers.
      </p>
      <p>
        4.3 Users may book services such as treks, tours, and other travel-related products via the Website. By
        confirming a booking, the User agrees to the terms and conditions of the Service Provider.
      </p>
      <p>
        4.4 <strong>Aorbo Treks</strong> may charge service fees, booking fees, or other charges in addition to the
        price of the services provided by the Service Providers. These fees will be disclosed during the booking
        process.
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
        5.2 The User is responsible for reviewing the details of the services or products before making a booking. By
        making a booking, the User confirms that they have read and understood the terms and conditions of the
        Service Provider, as well as any additional terms associated with the booking.
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
        Users may search, select, and book trips through the Aorbo Treks platform based on availability and the
        terms set by individual Vendors. The booking process is subject to the specific terms and conditions of the
        Vendor offering the trek or service.
      </p>
      <p>
        6.2 <strong>Payment Modes:</strong>{' '}
        Aorbo Treks facilitates multiple payment options, which are subject to the arrangement with the Vendor.
        These payment options include:
      </p>
      <ul>
        <li>
          <p><strong>Full Payment:</strong> The total trip amount is paid upfront via the platform at the time of booking.</p>
        </li>
        <li>
          <p><strong>Partial Payment:</strong> Users may pay a booking fee via the platform, with the remaining balance due directly to the Vendor according to the agreed booking terms.</p>
        </li>
        <li>
          <p><strong>Pay at Site:</strong> A portion of the payment is collected via the platform, and the remaining balance is settled in person—by cash or UPI—at the designated trek commencement point.</p>
        </li>
      </ul>
      <p>
        6.3 <strong>Additional Charges:</strong>{' '}
        The User acknowledges that they are solely responsible for any additional charges that are not included in
        the base booking price. These charges may include, but are not limited to, toll fees, permits, parking, gear
        rentals, porter fees, or applicable government levies. These additional costs shall be paid directly to the
        Vendor or authorized personnel and may be disclosed either during or after the booking process.
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
        6.6 <strong>Service Charges:</strong>{' '}
        Aorbo Treks may impose a facilitation fee for processing bookings, which will be clearly disclosed to the
        User during the booking process. This fee is separate from the charges for services provided by the Vendor,
        and the User is solely responsible for selecting their preferred Vendor.
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
        Flexible Policy, the ₹999 advance per traveller is non-refundable. The ₹10 platform fee is never refunded,
        the payment gateway fee on card and net-banking payments is deducted from refunds (UPI payments have no such
        fee), and GST is refunded in full when the booking is cancelled before the trek starts.
      </p>
      <p>
        7.3 If the organizer cancels, the User is refunded the amount paid, less the ₹10 platform fee and any payment
        gateway fee. Rescheduling is not offered. Refunds start immediately and usually reach the User in 5–7
        business days.
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
        are owned by Aorbo Treks or its licensors and are protected by intellectual property laws.
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
        10.1 Aorbo Treks will not be liable for any direct, indirect, incidental, special, or consequential damages
        arising from the use or inability to use the Website, services, or products offered.
      </p>
      <p>
        10.2 Aorbo Treks does not warrant the accuracy, completeness, or reliability of any information or content
        provided on the Website. All content is provided on an "as-is" basis, and Aorbo Treks disclaims all
        warranties, express or implied, including but not limited to merchantability and fitness for a particular purpose.
      </p>
      <p>
        10.3 The User agrees that Aorbo Treks’s liability, if any, shall not exceed the total amount paid by the User
        for the service or product in question.
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
        12.2 Any disputes arising out of or relating to this Agreement shall be resolved through arbitration, and the
        arbitration proceedings shall take place in Hyderabad, India. The decision of the arbitrator shall be final
        and binding.
      </p>
      <p>
        12.3 Notwithstanding the above, Aorbo Treks may seek injunctive or other equitable relief in any court of
        competent jurisdiction to protect its intellectual property or enforce its rights under this Agreement.
      </p>

      {/* 13. AMENDMENTS */}
      <h3>13. AMENDMENTS</h3>
      <p>
        13.1 Aorbo Treks reserves the right to modify, update, or amend this Agreement at any time. Any changes to
        the Agreement will be posted on the Website, and the User’s continued use of the Website constitutes
        acceptance of the modified terms.
      </p>

      {/* 14. CONTACT INFORMATION */}
      <h3>14. CONTACT INFORMATION</h3>
      <p className="emphasis">
        Company: AORBO INFOCOM<br />
        Platform: Aorbo Treks (www.aorbotreks.com)<br />
        Support Email: care@aorbotreks.com<br />
        Phone and WhatsApp: +91 79892 51063<br />
        Registered Office: Aorbo Treks, Sri Krupa Market, Malakpet, Hyderabad, Telangana
      </p>

      <p>
        This User Agreement is a legally binding contract between Aorbo Treks and the User. By using our services,
        the User acknowledges that they have read, understood, and agreed to be bound by these terms and conditions.
      </p>
    </LegalPage>
  );
}
