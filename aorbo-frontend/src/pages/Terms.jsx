import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';

export default function Terms() {
  return (
    <LegalPage title="Terms and Conditions" audience="For customers of the Aorbo Treks website and mobile app" updated="2 October 2026" contentKind="terms" numberSection={(i) => 19 + i + 1}>

      {/* 1. Introduction */}
      <h3 id="introduction">1. Introduction</h3>
      <p>
        Welcome to Aorbo Treks <strong>(“Aorbo Treks,” “we,” “us,” or “our”)</strong>. We operate as an independent,
        technology-driven platform that enables Users to discover, compare, and book trekking, travel, and adventure 
        tourism services provided by <strong>third-party Operators (“Operators”).</strong>
      </p>
      <p>
        By accessing or using our website, mobile application, or any part of our services (collectively, the
        “Platform”), you (<strong>“User,” “you,”</strong> or <strong>“your”</strong>) agree to be legally bound by these
        Terms and Conditions (“Terms”). These Terms constitute a legally enforceable agreement between you and Aorbo Treks. 
        If you do not agree to any part of these Terms, you must not access or use the Platform.
      </p>
      <p>
        Use of the Platform also constitutes acknowledgement that Aorbo Treks does not own, operate, or manage any of the
        services listed, and that all bookings form a direct agreement between you and the respective Vendor.
      </p>

      {/* 2. Definitions */}
      <h3 id="definitions">2. Definitions</h3>
      <h4>User:</h4>
      <p>
        Any individual or entity who accesses, registers on, or uses the Aorbo Treks platform in any capacity,
        including but not limited to browsing, booking, listing, or managing treks, travel, or related services.
      </p>
      <h4>Buyer:</h4>
      <p>
        A User who books or attempts to book treks, travel experiences, adventure tourism, or any related services
        through the Aorbo Treks platform. Buyers acknowledge that Aorbo acts as an intermediary and not the service
        provider unless explicitly stated.
      </p>
      <h4>Seller (Vendor / Organizer):</h4>
      <p>
        A User who lists, offers, organizes, or sells treks, travel experiences, adventure tourism, or related
        services via the platform. Sellers are solely responsible for the accuracy, safety, delivery, and compliance of the
        services they offer.
      </p>
      <h4>Booking:</h4>
      <p>
        A confirmed or pending reservation made by a Buyer for any trekking, travel, or adventure tourism service
        through the Aorbo Treks platform. A Booking constitutes a service agreement between the Buyer and the Seller,
        subject to the platform’s terms and policies.
      </p>

      {/* 3. Nature of Services */}
      <h3 id="nature-of-services">3. Nature of Services</h3>
      <h4>Platform Disclaimer</h4>
      <p>
        Aorbo Treks is a digital technology platform that facilitates the discovery, comparison, and booking of
        trekking, travel, and adventure tourism services offered by independent third-party Vendors. Aorbo Treks does
        <strong>not own, operate, manage, or control</strong> any treks, tours, or travel services listed on the platform.
      </p>
      <p>
        All service-related information displayed on the platform—such as pricing, availability, itineraries, or
        inclusions—is provided and managed solely by the respective Vendors. Bookings made through the platform
        establish a <strong>direct contractual relationship between the User and the Vendor</strong>. Aorbo Treks is
        not a party to that agreement and bears no responsibility for its execution or fulfillment.
      </p>
      <p>
        Aorbo Treks expressly disclaims all warranties, express or implied, regarding the <strong>accuracy,
        reliability, quality, legality, safety, or fitness</strong> of any services offered by Vendors. Users are advised to exercise
        due diligence before booking. Aorbo Treks shall not be held liable for any loss, damage, cancellation, or injury resulting
        from Vendor-provided services.
      </p>

      {/* 4. Booking and Payment Terms */}
      <h3 id="booking-payment">4. Booking and Payment Terms</h3>
      <h4>Booking Process:</h4>
      <p>
        Users may browse, select, and initiate bookings for treks and related services through the Aorbo Treks
        Platform. All bookings are subject to availability and the individual terms and conditions established by the
        respective Vendor. By completing a booking, the User enters into a direct agreement with the selected Vendor, not with
        Aorbo Treks.
      </p>
      <h4>Payment Modes:</h4>
      <p>
        Aorbo Treks facilitates various payment methods for the User’s convenience, depending on the Vendor’s listed
        terms. These may include:
      </p>
      <ul>
        <li>
          <h4>1. Full Payment:</h4>
          <p>
            The User pays the total trip amount in advance via the Platform. Aorbo Treks collects and disburses the
            amount to the respective Vendor in accordance with internal settlement timelines.
          </p>
        </li>
        <li>
          <h4>2. Partial Payment (deposit online, balance to the Vendor):</h4>
          <p>
            Where the listing offers it, the User pays a deposit through the Platform and pays the remaining balance
            directly to the Vendor, in the manner and by the time the Vendor specifies &mdash; for example before the
            trek, or in person by cash, UPI or card at the trek start point (&ldquo;Pay at Site&rdquo;). The deposit is
            refundable only as set out in the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>.
          </p>
        </li>
      </ul>
      <h4>Balance Paid Directly to the Vendor:</h4>
      <p>
        Any balance paid directly to the Vendor, whether before the trek or in person at the trek start point, is paid to
        the Vendor and not to Aorbo Treks. Aorbo Treks does not receive, hold, track or verify that money, and gives no
        assurance, guarantee or undertaking of any kind about it, including its amount, its receipt by the Vendor, any
        receipt or invoice for it, or its refund. Any confirmation of such a payment shown on the Platform is the
        Vendor&rsquo;s own statement. Users should pay the balance only as stated in their booking, and should obtain
        and keep proof of every such payment.
      </p>
      <p>
        In respect of such money, Aorbo Treks provides assistance only: on a request made through customer care, Aorbo
        Treks will contact the Vendor, share the booking records available to it, and make reasonable efforts to help the
        User and the Vendor resolve the matter. Aorbo Treks is not obliged to pay, refund or compensate any such amount
        itself.
      </p>
      <h4>Liability Disclaimer:</h4>
      <p>
        Aorbo Treks acts solely as an intermediary in the booking and payment process. We are not responsible for
        pricing discrepancies, payment failures, refusal of service by Vendors, or any other transaction-related
        disputes between Users and Vendors. Users are advised to retain proof of payment and confirm payment details
        directly with the Vendor prior to travel.
      </p>
      <h4>Additional Charges Disclaimer</h4>
      <p>
        The User acknowledges and agrees that certain charges may not be included in the base trek booking amount
        displayed on the Aorbo Treks platform. These additional charges may include, but are not limited to, toll
        fees, parking charges, permit fees, government levies, gear rentals, or porter services.
      </p>
      <p>
        Such charges shall be borne solely by the User and are payable directly to the respective Vendor, trek
        organizer, or their authorized representatives. Aorbo Treks acts solely as a booking intermediary and shall not be held
        liable for the disclosure, accuracy, or settlement of these third-party costs.
      </p>
      <p>
        Vendors or organizers are responsible for informing Users of any applicable additional charges, either at the
        time of booking, during pre-departure communication, or on-ground during the trek. Users are advised to
        confirm such potential costs with the organizer prior to the commencement of the trek.
      </p>
      <h4>Booking for Family and Friends</h4>
      <p>
        A User may make a booking from their own account for themselves and for other persons personally known to
        them, such as members of their family and their friends, provided that:
      </p>
      <ul>
        <li><p>each such person has consented to the User furnishing their particulars and making the booking for them;</p></li>
        <li><p>the User is responsible for the accuracy of their particulars and for informing them of the trek details, these Terms and the applicable cancellation policy;</p></li>
        <li><p>the booking is paid for by the User, and any refund is made to the original method of payment; and</p></li>
        <li><p>the User remains the person responsible to Aorbo Treks for the booking, including for its cancellation.</p></li>
      </ul>
      <p>
        A traveller may reimburse the User for that traveller&rsquo;s own share of the amount actually paid by the User for
        the booking. Such reimbursement, without any addition, is not consideration for the purposes of the clause below.
      </p>
      <h4>Fare Quotes Are Personal</h4>
      <p>
        The fare calculated for a User at checkout, including any coupon, referral benefit or offer applied to it, is
        personal to that User&rsquo;s account and valid only for the booking for which it was calculated. It shall not be
        shared with, transferred to or used from any other account. A booking made with a fare calculated for another
        account is a breach of these Terms and may be cancelled under &ldquo;Verification and Consequences of Breach&rdquo; below.
      </p>
      <h4>No Agents, Resale or Commercial Booking</h4>
      <p>
        Bookings are for personal, non-commercial use only. A User shall not, directly or indirectly, whether on the
        Platform or elsewhere (including through any website, social-media page, messaging group or classified listing):
      </p>
      <ul>
        <li><p>act as a travel agent, tour operator, broker, aggregator, sub-agent or reseller in respect of any trek or booking;</p></li>
        <li><p>make, or offer to make, a booking for any person in return for any fee, commission, mark-up, service charge or other consideration;</p></li>
        <li><p>sell, resell, auction, transfer or offer for sale any booking, slot, booking ID or fare quote, or any coupon, referral benefit or account, or use a fare quote calculated for another account;</p></li>
        <li><p>advertise or solicit bookings for treks listed on the Platform, or represent themselves as acting for Aorbo Treks or any Vendor;</p></li>
        <li><p>reserve or hold slots in bulk, or without a genuine intention that the named travellers shall travel, including in order to create scarcity or to resell; or</p></li>
        <li><p>use any script, bot or other automated means to search, reserve, hold or book slots.</p></li>
      </ul>
      <p>
        &ldquo;Consideration&rdquo; includes money, goods, services or any other benefit, received or receivable from any person.
        A booking made in breach of this clause, and any transfer of it, shall not be binding on Aorbo Treks or the Vendor.
      </p>
      <h4>Verification and Consequences of Breach</h4>
      <p>
        Aorbo Treks may monitor booking patterns, including the number and frequency of bookings from an account, the
        number of distinct travellers booked, and the accounts, devices and payment instruments used, in order to detect a
        breach of the clause above. Where Aorbo Treks reasonably suspects such a breach, it may require the User to
        establish, within a reasonable time, the User&rsquo;s relationship with the travellers and that no consideration was received.
      </p>
      <p>
        Where Aorbo Treks reasonably determines, after giving the User an opportunity to respond (save where doing so would
        prejudice an investigation or the safety of others), that a booking was made or dealt with in breach of the clause
        above, Aorbo Treks may do any one or more of the following:
      </p>
      <ul>
        <li><p>cancel the booking, with a refund as if the User had cancelled it under the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>, save that a traveller who establishes that they were not party to the breach may, with the Vendor&rsquo;s consent, be permitted to travel or receive a refund;</p></li>
        <li><p>refuse further bookings, and suspend or terminate the User&rsquo;s account and any other account that Aorbo Treks reasonably believes is operated by the User or on the User&rsquo;s behalf;</p></li>
        <li><p>withdraw any coupon, referral benefit or other benefit obtained through the breach; and</p></li>
        <li><p>recover from the User any loss, chargeback, fee or cost (including reasonable legal costs) incurred by Aorbo Treks by reason of the breach.</p></li>
      </ul>
      <p>
        These rights are without prejudice to any other right or remedy available to Aorbo Treks or any Vendor in law or
        in equity, including a claim for damages and an injunction.
      </p>
      <p>
        Where the conduct also discloses an offence, including cheating, cheating by personation, forgery, the use of
        another person&rsquo;s identity, account or payment instrument without authorisation, or unauthorised access to a
        computer resource, Aorbo Treks shall report it to the police and other competent authorities and may initiate and
        pursue criminal proceedings under the Bharatiya Nyaya Sanhita, 2023, the Information Technology Act, 2000 and any
        other applicable law. Aorbo Treks shall co-operate with any investigating agency and may furnish to it the records
        relating to the accounts, bookings, devices and payments concerned, in accordance with
        our <Link to="/privacy-policy">Privacy Policy</Link> and applicable law.
      </p>
      <p>
        <strong>Refunds:</strong> Cancellations and refunds of bookings made through the Platform are processed by
        Aorbo Treks in accordance with our <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>, which
        forms part of these Terms.
      </p>
      <p>
        <strong>Payment Security:</strong> All transactions are securely processed through third-party payment
        gateways. Aorbo Treks does not store any sensitive financial information.
      </p>
      <p>
        <strong>Platform Fee:</strong> Aorbo Treks charges a platform fee of ₹10 per booking (inclusive of GST),
        shown before you pay.
      </p>
      <p>
        <strong>Taxes:</strong> Users are responsible for the payment of all applicable taxes in accordance with local laws.
      </p>

      {/* 5. Cancellations and Refunds Policy */}
      <h3 id="cancellation-refund">5. Cancellations and Refunds Policy</h3>
      <p>
        Cancellations and refunds are governed by our{' '}
        <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>, which forms part of these Terms. In
        summary:
      </p>
      <ul>
        <li>
          <p>
            The cancellation charge depends on whether the trek follows the Standard Policy or the Flexible Policy
            (shown before booking) and on how close to departure the booking is cancelled. Under the Flexible Policy,
            the ₹999 advance per traveller is non-refundable.
          </p>
        </li>
        <li>
          <p>
            The ₹10 platform fee is never refunded. The payment gateway fee on card and net-banking payments is
            deducted from refunds; UPI payments have no such fee. If you cancel before the trek starts, the GST
            you paid is refunded in full.
          </p>
        </li>
        <li>
          <p>
            If the organizer cancels, the User is refunded the amount paid, less the ₹10 platform fee and any
            payment gateway fee.
          </p>
        </li>
        <li><p>Rescheduling is not offered.</p></li>
        <li><p>Refunds start immediately and usually reach the User in 5–7 business days.</p></li>
        <li>
          <p>
            Aorbo Treks may cancel a booking in cases of fraudulent or suspicious activity, misuse or
            misrepresentation, or breach of these Terms.
          </p>
        </li>
      </ul>

      {/* 6. User Responsibilities */}
      <h3 id="user-responsibilities">6. User Responsibilities</h3>
      <ul>
        <li>
          <h4>a. Accuracy of Information</h4>
          <p>
            Users are required to provide accurate, complete, and truthful information during registration and
            while making bookings through the Aorbo Treks platform. This includes, but is not limited to, personal
            details such as age, government-issued identity proof, and any known medical conditions 
            that may impact participation in a trek. Aorbo Treks reserves the right to request documentation for verification
            purposes.
          </p>
          <p>
            Any false declaration, omission, or misrepresentation of material facts may result in suspension or
            termination of access to the Platform and may lead to legal consequences under applicable Indian
            laws, including but not limited to actions under the Information Technology Act, 2000, and relevant civil
            or criminal statutes.
          </p>
        </li>
        <li>
          <h4>b. Legal Compliance</h4>
          <p>
            Users must comply with all applicable local, state, and national laws and regulations during their
            participation in any treks or travel-related services booked through the Platform. Any unlawful
            behavior, including trespassing, violation of forest/wildlife regulations, or non-compliance with
            safety protocols, is strictly prohibited and may lead to immediate cancellation of services and legal action.
          </p>
        </li>
        <li>
          <h4>c. Health and Safety</h4>
          <p>
            Users are solely responsible for assessing their physical and mental fitness before participating in any
            trek or adventure activity. Users are also advised to obtain adequate health and travel insurance
            coverage to protect against injury, illness, or other unforeseen circumstances. Aorbo Treks and its
            affiliated Vendors shall not be held liable for any health-related incidents, injuries, or losses
            incurred during the trip.
          </p>
        </li>
      </ul>

      {/* 7. Age Restriction and User Accountability */}
      <h3 id="age-restriction">7. Age Restriction and User Accountability</h3>
      <ul>
        <li>
          <h4>7.1 Eligibility</h4>
          <p>
            Participation in treks and adventure-related activities facilitated through the Aorbo Treks platform is
            strictly limited to individuals who are 18 years of age or older. <strong>Minors</strong> (individuals below 
            the age of 18) are not permitted to register or participate in any such activities unless accompanied by a parent
            or legal guardian. In such cases, the parent or guardian must provide a signed undertaking accepting
            full responsibility for the minor's participation, and such participation shall only be permitted with
            the prior written consent of the respective Vendor organizing the activity.
          </p>
        </li>
        <li>
          <h4>7.2 User Responsibility</h4>
          <p>
            Users are solely responsible for submitting accurate and truthful information at the time of registration
            and booking, including but not limited to age, date of birth, and identity credentials. Aorbo Treks
            shall not be held responsible for consequences resulting from the provision of false or misleading
            information.
          </p>
          <p>To ensure a smooth trekking experience, Users are further obligated to:</p>
          <ul>
            <li>
              <p>
                Confirm pickup points, drop-off locations, and other travel arrangements directly with the
                respective Vendor or vehicle operator well in advance.
              </p>
            </li>
            <li>
              <p>
                Present a valid, government-issued photo identity proof (such as Passport, PAN, Voter ID, or 
                other acceptable forms) and a digital or printed copy of the booking confirmation voucher at the time 
                of boarding or trip commencement.
              </p>
            </li>
            <li>
              <p>
                Check the booking confirmation received via SMS or email for accuracy and promptly initiate
                correction requests in case of any errors. Any loss, delay, or disruption caused due to inaccurate
                information shall be solely borne by the User.
              </p>
            </li>
            <li><p>Arrive at the designated pickup or assembly location at least thirty (30) minutes prior to the scheduled departure time.</p></li>
            <li><p>Acknowledge that trek passes or tickets are non-transferable unless explicitly permitted by the Vendor, and that a booking shall in no case be sold or transferred for money or any other benefit (see &ldquo;No Agents, Resale or Commercial Booking&rdquo; in Section 4).</p></li>
          </ul>
        </li>
        <li>
          <h4>7.3 Verification and Cancellation</h4>
          <p>
            Vendors and trek organizers reserve the right to verify the identity and age of participants using valid
            government-issued identification. Any misrepresentation may result in the immediate cancellation of the
            booking without refund. In such cases, the User assumes full liability.
          </p>
        </li>
      </ul>

      {/* 8. Vendor Responsibilities */}
      <h3 id="vendor-responsibilities">8. Vendor Responsibilities</h3>
      <p>
        Vendors are independently responsible for the quality, safety, and legality of the services they offer. They must
        ensure compliance with all relevant government regulations and must honor the terms agreed upon with Users.
      </p>

      {/* 9. Platform Usage and Restrictions */}
      <h3 id="platform-usage">9. Platform Usage and Restrictions</h3>
      <p>
        Users agree not to misuse the Platform, act as an agent, broker or reseller of bookings (see Section 4), engage in fraudulent activities, or infringe upon any intellectual
        property rights. Aorbo Treks reserves the right to suspend or terminate any User account found in violation of these Terms.
      </p>

      {/* 10. Intellectual Property */}
      <h3 id="intellectual-property">10. Intellectual Property</h3>
      <p>
        All content on the Platform—including but not limited to logos, text, graphics, and images—is the property of
        Aorbo Infocom or its licensors and is protected by applicable intellectual property laws. No part of the
        Platform content may be reproduced or distributed without prior written consent.
      </p>

      {/* 11. Limitation of Liability */}
      <h3 id="liability">11. Limitation of Liability</h3>
      <p>
        Aorbo Treks, operated by AORBO INFOCOM, is a technology platform that facilitates connections between Users and
        independent third-party Vendors offering trekking, travel, and adventure-related services. We do not operate,
        manage, or control the services provided by these Vendors.
      </p>
      <p>
        Accordingly, Aorbo Treks shall not be held liable for any direct or indirect loss, injury, damage, delay, failure
        of service, or inconvenience caused by the acts, omissions, or negligence of any Vendor. This includes, but is not limited to:
      </p>
      <ul>
        <li><p>Delayed commencement or early conclusion of treks or trips.</p></li>
        <li><p>Misconduct, negligence, or inappropriate behavior by Vendor staff or trek leaders.</p></li>
        <li><p>Issues related to the condition, safety, or cleanliness of vehicles or accommodations.</p></li>
        <li><p>Unfulfilled service components, such as welcome kits or advertised inclusions.</p></li>
        <li><p>Vendor-initiated cancellations due to operational, safety, or legal concerns.</p></li>
        <li><p>Loss, theft, or damage to User belongings or baggage.</p></li>
        <li><p>Last-minute changes in pickup or drop-off points or use of alternate transport.</p></li>
        <li><p>Failure to assign specific trek leaders or vehicles requested by the User.</p></li>
        <li><p>Vehicle breakdowns or substitutions during transit.</p></li>
        <li><p>Vendor’s failure to procure or maintain legal permits, licenses, or authorizations.</p></li>
      </ul>
      <p>
        All services available through the Platform are provided on an “as is” and “as available” basis, without any
        warranties—express or implied—including but not limited to warranties of merchantability, fitness for a
        particular purpose, or non-infringement.
      </p>
      <p>
        Aorbo Treks does not guarantee the availability, safety, quality, legality, or performance of the services
        provided by Sellers. Users acknowledge that all bookings are at their own risk and discretion.
      </p>
      <p>
        Under no circumstances shall AORBO INFOCOM or its affiliates be liable for any indirect, incidental, special,
        punitive, or consequential damages, including but not limited to loss of data, loss of profits, personal injury,
        or travel disruption.
      </p>
      <p>
        Our maximum aggregate liability, if any, shall be strictly limited to the amount paid by the User for the
        specific booking in question. No further claims shall be entertained.
      </p>
      <p>
        The responsibility for legal compliance, service execution, and customer satisfaction lies solely with the
        Vendor. While Aorbo Treks may, at its discretion, facilitate communication between Users and Vendors in the
        event of a grievance, we do not guarantee the availability of remedies, alternatives, or compensation.
      </p>
      <p>
        For any complaints or service-related concerns, Users are advised to directly contact the Vendor using the
        contact information provided in their booking confirmation.
      </p>

      {/* 12. Privacy Policy */}
      <h3 id="privacy-policy">12. Privacy Policy</h3>
      <p>
        By using the Platform, Users consent to our Privacy Policy, which outlines how personal information is collected,
        used, and safeguarded. Users are encouraged to review the Privacy Policy available on our Platform.
      </p>

      {/* 13. Governing Law and Jurisdiction */}
      <h3 id="insurance">13. Governing Law and Jurisdiction</h3>
      <p>
        These Terms and Conditions shall be governed by, interpreted, and enforced in accordance with the laws of the
        Republic of India. Any dispute, claim, or controversy arising out of or in connection with these Terms,
        including any question regarding their existence, validity, or termination, shall be subject to the exclusive
        juris jurisdiction of the competent courts of Hyderabad, Telangana, unless otherwise expressly agreed by the parties in writing.
      </p>

      {/* 14. Amendments */}
      <h3 id="direct-dealings">14. Amendments</h3>
      <p>
        Aorbo Treks reserves the right to modify or update these Terms at any time. Any changes will be posted on the
        Platform and will become effective immediately upon posting. Continued use of the Platform constitutes
        acceptance of the revised Terms.
      </p>

      {/* 15. Miscellaneous Terms */}
      <h3 id="personalized-treks">15. Miscellaneous Terms</h3>
      <ul>
        <li>
          <p>
            Trek organizers are solely responsible for ensuring compliance with all applicable government regulations
            related to trekking and tourism, including but not limited to safety standards and operational guidelines.
          </p>
        </li>
        <li><p>Any disputes regarding service quality, legality, or cancellations must be resolved directly between the User and the respective trek organizer or Vendor.</p></li>
        <li>
          <p>
            Any legal disputes, claims, or proceedings arising out of or in connection with these Terms or the services
            provided through the Aorbo Treks Platform shall be subject to the exclusive jurisdiction of the competent
            courts in Hyderabad, Telangana, unless otherwise expressly specified in writing.
          </p>
        </li>
        <li><p>Aorbo Treks shall not be held liable for any indirect, incidental, or consequential damages beyond the actual amount paid by the User for the specific service in question.</p></li>
      </ul>

      {/* 16. Contact Information */}
      <h3 id="contact">16. Contact Information</h3>
      <p>16.1 If the User has any questions or concerns regarding this Agreement or the services provided by Aorbo Treks, they can contact us at:</p>
      <ul>
        <li><p>Company: AORBO INFOCOM</p></li>
        <li><p>Platform: Aorbo Treks (www.aorbotreks.com)</p></li>
        <li><p>Support Email: care@aorbotreks.com</p></li>
        <li><p>Phone and WhatsApp: +91 79892 51063</p></li>
        <li><p>Registered Office: [Aorbo Treks, Sri Krupa Market, Malakpet, Hyderabad, Telangana]</p></li>
      </ul>

      {/* 17. Additional Provisions */}
      <h3 id="additional-provisions">17. Additional Provisions</h3>
      <ul>
        <li>
          <h5>17.1 Force Majeure</h5>
          <p>We are not liable for delays or failures caused by events beyond our reasonable control, including natural disasters, strikes, or internet outages.</p>
        </li>
        <li>
          <h5>17.2 Severability</h5>
          <p>If any provision is invalid or unenforceable, it will be severed without affecting the remaining Terms.</p>
        </li>
        <li>
          <h5>17.3 Entire Agreement</h5>
          <p>These Terms, together with our Privacy Policy and other policies, constitute the entire agreement between you and AORBO INFOCOM regarding Platform use.</p>
        </li>
        <li>
          <h5>17.4 Termination and Suspension</h5>
          <ul>
            <li><p>We may suspend or terminate your access to the Platform without notice if you breach these Terms or engage in harmful conduct.</p></li>
            <li><p>Termination does not affect accrued rights or liabilities.</p></li>
          </ul>
        </li>
      </ul>

      {/* 18. Direct Dealings with Vendors */}
      <h3 id="additional-provisions">18. Direct Dealings with Vendors or Organizers</h3>
      <p>
        If users choose to engage directly with any trek operator outside of the Aorbo Treks platform, Aorbo Treks shall
        bear no responsibility or liability for any disputes, claims, losses, damages, or inconveniences that may arise.
        All such dealings are undertaken at the sole risk and discretion of the user. Aorbo Treks disclaims any and all
        liability for any transactions, communications, agreements, or arrangements made independently between the user
        and the trek operator.
      </p>

      {/* 19. Personalized Treks Disclaimer */}
      <h3 id="contact">19. Personalized Treks Disclaimer</h3>
      <p>
        For personalized or custom trek requests submitted through Aorbo Treks, our role is strictly limited to acting
        as a platform to connect users with trek operators. Once a trek inquiry is submitted, Aorbo Treks forwards the
        request to relevant trek operators, who will directly engage with the user to discuss requirements, prepare a
        customized itinerary, and finalize availability.
      </p>
      <p>
        All prices, services, and terms related to these personalized treks are solely determined by the trek operator,
        and Aorbo Treks does not set prices, manage services, or participate in any negotiations. Aorbo Treks shall not
        be held responsible or liable for any aspect of the trek, including but not limited to the service quality,
        pricing, itinerary, or any issues, disputes, or claims that may arise from interactions between the user and the
        trek operator.
      </p>
    </LegalPage>
  );
}
