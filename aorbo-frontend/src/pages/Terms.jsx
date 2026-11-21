import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';
import useSeo from '../seo/useSeo';
import { staticPageMeta } from '../seo/meta';

export default function Terms() {
  useSeo(staticPageMeta('/terms'));
  return (
    <LegalPage title="Terms and Conditions" audience="For customers of the Aorbo Treks website and mobile app" updated="21 November 2026" contentKind="terms" numberSection={(i) => 18 + i + 1}>

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
        A business that lists and runs treks, travel experiences or related services on the platform (an
        &ldquo;organiser&rdquo;). Organisers are independent businesses, not agents or employees of Aorbo Treks. They are
        bound by Aorbo Treks&rsquo; Partner Terms and are solely responsible for the accuracy, safety, delivery and legal
        compliance of the services they offer.
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
        All trek information on the platform, such as prices, dates, itineraries and inclusions, is provided by the
        organiser. A booking creates an agreement for the trek between you and the organiser. Aorbo Treks is not a
        party to that agreement and is not responsible for how the organiser performs it.
      </p>
      <p>
        <strong>What Aorbo Treks does:</strong> it shows treks listed by organisers; reviews each listing before it goes
        live; checks each organiser&rsquo;s identity and bank details (KYC) before approving it; takes your booking and
        payment in the app and passes the organiser&rsquo;s share to the organiser; processes cancellations and refunds
        under the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>; passes your complaints to the
        organiser; and gives customer support. The listing review and KYC are not checks of a trek&rsquo;s safety,
        permits, staff, equipment or quality. Aorbo Treks does not run, guide, staff, transport, house or supervise any trek.
      </p>
      <p>
        Aorbo Treks gives no warranty, express or implied, about the accuracy, quality, legality, safety or fitness for
        purpose of any organiser&rsquo;s services. Our liability is limited as set out in section 11.
      </p>

      {/* 4. Booking and Payment Terms */}
      <h3 id="booking-payment">4. Booking and Payment Terms</h3>
      <h4>Booking Process:</h4>
      <p>
        Users may browse, select and book treks on the Aorbo Treks Platform. All bookings are subject to availability
        and to the trek details shown in the listing. By completing a booking, the User enters into an agreement for the
        trek with the organiser, not with Aorbo Treks. Cancellations and refunds of every booking follow
        the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>, which the organiser has agreed to apply;
        it prevails over any different term of the organiser.
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
          <h4>2. Flexible Policy (advance in the app, balance to the organiser):</h4>
          <p>
            Where the trek offers the Flexible Policy, the User may pay an advance of ₹999 per traveller, together with
            the GST and the platform fee, in the app, and pay the rest of the trek fare directly to the organiser as shown
            in the booking; or the User may pay the full amount in the app. The advance is refundable only as set out in
            the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>.
          </p>
        </li>
      </ul>
      <h4>Balance Paid to the Organizer:</h4>
      <p>
        If you choose to pay part of the fare later, you pay the balance directly to the Vendor (your trek organizer), as
        shown in your booking &mdash; either before the trek or at the trek start point. Please pay only as shown in your
        booking and keep the receipt. Because this amount is paid to the Vendor and not to Aorbo Treks, the Vendor is
        responsible for it, including any refund of it that becomes due. The &ldquo;balance paid&rdquo; status shown on
        the Platform is updated by the organiser, or automatically after the trek ends.
      </p>
      <p>
        If you face any problem with it, contact Aorbo Treks customer care: we will take it up with the Vendor and help
        you get it resolved.
      </p>
      <h4>Liability Disclaimer:</h4>
      <p>
        Aorbo Treks takes your booking and payment in the app and processes refunds under the Refund &amp; Cancellation
        Policy. It is not responsible for errors in an organiser&rsquo;s listing, failures of your bank or payment app, or
        disputes about money you pay the organiser directly. Keep proof of every payment.
      </p>
      <p>
        If an organiser refuses to take you on a confirmed booking without a reason allowed in section 6 or 7, tell us at
        once at care@aorbotreks.com or +91 79892 51063. Once we confirm it, you get back everything you paid in the app
        except the ₹10 platform fee (Refund &amp; Cancellation Policy, section 6).
      </p>
      <h4>What the Fare Includes</h4>
      <p>
        The amount shown before you pay is the trek fare, GST and the ₹10 platform fee. The trek page lists what the fare
        includes (&ldquo;What&rsquo;s included&rdquo;) and what it does not (&ldquo;Not included&rdquo;). Anything listed as
        not included is not in the fare; if you need or choose it, you pay for it directly to the organiser or the seller.
        You do not have to pay the organiser for anything the listing shows as included; if you are asked to, tell us.
      </p>
      <h4>Booking for Family and Friends</h4>
      <p>
        A User may make a booking from their own account for themselves and for other persons personally known to
        them, such as members of their family and their friends, provided that:
      </p>
      <ul>
        <li><p>each such person has consented to the User furnishing their particulars and making the booking for them;</p></li>
        <li><p>the User is responsible for the accuracy of their particulars and for informing them of the trek details, these Terms and the applicable cancellation policy;</p></li>
        <li><p>the booking is paid for by the User, and any refund is made to the original method of payment;</p></li>
        <li><p>the User remains the person responsible to Aorbo Treks for the booking, including for its cancellation; and</p></li>
        <li><p>the User confirms that they are authorised to accept these Terms, the Refund &amp; Cancellation Policy and the risks described in section 6 on behalf of each such person, and will make good any loss Aorbo Treks suffers from a claim by such a person that arises because the User did not have that authority or did not tell them of these terms.</p></li>
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
            The ₹10 platform fee is never refunded. When you cancel, the payment gateway fee is not taken from your
            refund, and if you cancel before the trek starts, the GST you paid is refunded in full.
          </p>
        </li>
        <li>
          <p>
            If the departure is cancelled, the organiser refuses you, or we find the organiser at fault, you get back
            everything you paid in the app except the ₹10 platform fee. If a trek is stopped part-way, a part refund may
            be made as set out in the Refund &amp; Cancellation Policy. No refund or compensation is given by Aorbo
            Treks after a trek has ended.
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

      {/* 6. User Responsibilities, Risks and Conduct */}
      <h3 id="user-responsibilities">6. User Responsibilities, Risks and Conduct</h3>
      <ul>
        <li>
          <h4>a. Accuracy of Information</h4>
          <p>
            Users must give accurate, complete and true information when registering and booking, including each
            traveller&rsquo;s name, age and gender and the contact details asked for.
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
          <h4>c. Risks of Trekking</h4>
          <p>
            Trekking and outdoor travel carry risks that no one can fully remove and that are nobody&rsquo;s fault,
            including altitude, weather, rough or slippery ground, falling rocks, landslides, river crossings, wildlife,
            illness, distance from medical help, slow rescue and no mobile network. By booking, you accept these risks for
            yourself and for the people you book for. The organiser runs the trek and is responsible for its safety
            arrangements.
          </p>
        </li>
        <li>
          <h4>d. Fitness and Health</h4>
          <p>
            When you book, you confirm that each traveller is fit for the difficulty shown in the listing and will tell
            the organiser before departure about any medical condition that matters for the trek. The organiser may refuse
            to take, or send back, a traveller who in its reasonable view cannot continue safely.
          </p>
        </li>
        <li>
          <h4>e. Conduct</h4>
          <p>
            Every traveller must follow the trek leader&rsquo;s safety instructions and the rules of the forest, park and
            local authorities, and must not harass, endanger or abuse anyone or be intoxicated in a way that puts anyone at
            risk. The organiser may refuse or remove a traveller whose conduct puts themselves or others at risk.
          </p>
        </li>
        <li>
          <h4>f. Rescue, Medical Costs and Insurance</h4>
          <p>
            Aorbo Treks does not arrange or pay for rescue, evacuation, medical treatment or travel home; agree these with
            the organiser before you go. Aorbo Treks does not provide insurance. You may buy your own travel or health
            insurance.
          </p>
        </li>
      </ul>

      {/* 7. Age Restriction and User Accountability */}
      <h3 id="age-restriction">7. Age Restriction and User Accountability</h3>
      <ul>
        <li>
          <h4>7.1 Eligibility</h4>
          <p>
            The User who books, and every traveller booked, must be 18 years of age or older. The app does not accept a
            traveller under 18. Booking a person under 18, or giving a false age, is a breach of these Terms; the
            organiser may refuse that traveller, and section 7.3 applies.
          </p>
        </li>
        <li>
          <h4>7.2 User Responsibility</h4>
          <p>
            Users are solely responsible for submitting accurate and truthful information at the time of registration
            and booking, including each traveller&rsquo;s name, age and gender. Aorbo Treks
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
                Check the booking confirmation shown in the app and sent by e-mail for accuracy and promptly initiate
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
            Organisers may check travellers&rsquo; identity and age at boarding. No refund is due for a traveller who is
            refused at boarding or removed during the trek because their details were false or for a reason in section 6
            or 7.1, unless Aorbo Treks finds that the organiser was at fault, in which case section 6 of
            the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link> applies. If an organiser refuses a
            traveller for such a reason before the day of departure, tell us at once; Aorbo Treks will decide the refund
            under the Refund &amp; Cancellation Policy.
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
      <h4>How Treks Are Shown</h4>
      <p>
        Search results match what you search for and show the newest listings first unless you sort by price or rating.
        &ldquo;Top&rdquo; and featured sections are chosen by Aorbo Treks. The app may show advertisements served by Google;
        any paid or sponsored place for a trek will be labelled. We may change how treks are ranked and featured at any time.
      </p>

      {/* 10. Intellectual Property */}
      <h3 id="intellectual-property">10. Intellectual Property</h3>
      <p>
        All content on the Platform—including but not limited to logos, text, graphics, and images—is the property of
        AORBO INFOCOM PRIVATE LIMITED or its licensors and is protected by applicable intellectual property laws. No part of the
        Platform content may be reproduced or distributed without prior written consent.
      </p>
      <h4>Ratings and Reviews</h4>
      <p>
        You may rate and review a trek you completed. Your review is shown publicly with your name. Reviews must be
        honest and about your own trek. You keep ownership of your review and give Aorbo Treks a free, permanent,
        worldwide licence to show, translate and reuse it, with your name, on the app, the website and in our promotions.
        We check low-star reviews before they appear and may remove reviews that are unlawful, abusive, fake, off-topic or
        contain personal data, but we do not remove genuine negative feedback. Until an organiser has 5 Aorbo reviews, we
        may show the rating and review count from its Google listing.
      </p>

      {/* 11. Limitation of Liability */}
      <h3 id="liability">11. Limitation of Liability</h3>
      <p>
        Aorbo Treks, operated by AORBO INFOCOM PRIVATE LIMITED, is a technology platform that facilitates connections between Users and
        independent third-party Vendors offering trekking, travel, and adventure-related services. We do not operate,
        manage, or control the services provided by these Vendors.
      </p>
      <p>
        Aorbo Treks is not liable for loss, injury, damage, delay, failure of service or inconvenience caused by the acts,
        omissions or negligence of an organiser or its staff, including:
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
        The Platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows: (a) Aorbo
        Treks is not liable for any injury, illness or death, or loss of or damage to property, on or in connection with a
        trek, which the organiser runs; (b) Aorbo Treks is not liable for any indirect, incidental, special or
        consequential loss, or loss of profit, data, enjoyment or opportunity; and (c) Aorbo Treks&rsquo; total liability
        to you for a booking, on any basis, is limited to the amount you paid in the app for that booking. Nothing in these
        Terms excludes or limits any liability, or any right you have, that the law does not allow to be excluded or limited.
      </p>
      <p>
        The responsibility for legal compliance, service execution, and customer satisfaction lies solely with the
        Vendor. While Aorbo Treks may, at its discretion, facilitate communication between Users and Vendors in the
        event of a grievance, we do not guarantee the availability of remedies, alternatives, or compensation.
      </p>
      <p>
        For a complaint about a trek, contact the organiser using the details in your booking, or write to
        care@aorbotreks.com and we will pass it to the organiser (Refund &amp; Cancellation Policy, section 10).
      </p>

      {/* 12. Privacy Policy */}
      <h3 id="privacy-policy">12. Privacy Policy</h3>
      <p>
        By using the Platform, Users consent to our Privacy Policy, which outlines how personal information is collected,
        used, and safeguarded. Users are encouraged to review the Privacy Policy available on our Platform.
      </p>

      {/* 13. Governing Law and Jurisdiction */}
      <h3 id="governing-law">13. Governing Law and Jurisdiction</h3>
      <p>
        These Terms are governed by the laws of India. Subject to the next sentence, the courts at Hyderabad, Telangana
        have exclusive jurisdiction over any dispute arising out of or in connection with these Terms, the Platform or a
        booking. Nothing in these Terms affects your right to file a complaint before a Consumer Commission under the
        Consumer Protection Act, 2019.
      </p>

      {/* 14. Amendments */}
      <h3 id="amendments">14. Amendments</h3>
      <p>
        Aorbo Treks may change these Terms. The date at the top shows the latest version. When we make an important change,
        we will ask you to accept the new version in the app before you continue to use it.
      </p>

      {/* 15. Miscellaneous Terms */}
      <h3 id="miscellaneous">15. Miscellaneous Terms</h3>
      <ul>
        <li>
          <p>
            Trek organizers are solely responsible for ensuring compliance with all applicable government regulations
            related to trekking and tourism, including but not limited to safety standards and operational guidelines.
          </p>
        </li>
        <li><p>Disputes about how an organiser ran a trek are between the User and the organiser; Aorbo Treks passes complaints on as set out in the Refund &amp; Cancellation Policy. Cancellations and refunds of amounts paid in the app are handled by Aorbo Treks under that policy.</p></li>
      </ul>

      {/* 16. Contact Information */}
      <h3 id="contact">16. Contact Information</h3>
      <p>16.1 If the User has any questions or concerns regarding this Agreement or the services provided by Aorbo Treks, they can contact us at:</p>
      <ul>
        <li><p>Company: AORBO INFOCOM PRIVATE LIMITED (CIN U79900TS2026PTC226197)</p></li>
        <li><p>Platform: Aorbo Treks (www.aorbotreks.com)</p></li>
        <li><p>Support Email: care@aorbotreks.com</p></li>
        <li><p>Phone and WhatsApp: +91 79892 51063</p></li>
        <li><p>Registered office: Plot No. 56, H.No. 1-101/8, Srinivasa Nilayam, 4th Floor, Madhapur, Shaikpet, Hyderabad, Telangana 500081, India</p></li>
      </ul>
      <p>
        <strong>Grievance Officer:</strong> Abhishek Sakunam, AORBO INFOCOM PRIVATE LIMITED, care@aorbotreks.com, +91 79892 51063,
        Plot No. 56, H.No. 1-101/8, Srinivasa Nilayam, 4th Floor, Madhapur, Shaikpet, Hyderabad, Telangana 500081, India. We acknowledge a grievance within 24 hours and resolve it
        within 15 days.
      </p>

      {/* 17. Additional Provisions */}
      <h3 id="additional-provisions">17. Additional Provisions</h3>
      <ul>
        <li>
          <h5>17.1 Force Majeure</h5>
          <p>Aorbo Treks is not liable for any delay or failure caused by events beyond its reasonable control, including natural disasters, landslides, snow, floods, extreme weather, closure of a trail by forest or government authorities, refusal of permits, curfews, strikes, epidemics, and failures of networks, payment systems or hosting. Any refund is as set out in the <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
        </li>
        <li>
          <h5>17.2 Severability</h5>
          <p>If any provision is invalid or unenforceable, it will be severed without affecting the remaining Terms.</p>
        </li>
        <li>
          <h5>17.3 Entire Agreement</h5>
          <p>These Terms, together with the Refund &amp; Cancellation Policy, the User Agreement and the Privacy Policy, constitute the entire agreement between you and AORBO INFOCOM PRIVATE LIMITED regarding Platform use.</p>
        </li>
        <li>
          <h5>17.4 Termination and Suspension</h5>
          <ul>
            <li><p>We may suspend or terminate your access to the Platform without notice if you breach these Terms or engage in harmful conduct.</p></li>
            <li><p>Termination does not affect accrued rights or liabilities.</p></li>
          </ul>
        </li>
        <li>
          <h5>17.5 Indemnity</h5>
          <p>You will make good any loss, cost or claim (including reasonable legal costs) that Aorbo Treks suffers because you broke these Terms or the law, gave false information, committed fraud, or harmed another person.</p>
        </li>
        <li>
          <h5>17.6 Transfer</h5>
          <p>Aorbo Treks may transfer its rights and duties under these Terms to any entity that takes over the Aorbo Treks business. You may not transfer your account or your rights under these Terms.</p>
        </li>
      </ul>

      {/* 18. Direct Dealings with Vendors */}
      <h3 id="direct-dealings">18. Direct Dealings with Vendors or Organizers</h3>
      <p>
        If users choose to engage directly with any trek operator outside of the Aorbo Treks platform, Aorbo Treks shall
        bear no responsibility or liability for any disputes, claims, losses, damages, or inconveniences that may arise.
        All such dealings are undertaken at the sole risk and discretion of the user. Aorbo Treks disclaims any and all
        liability for any transactions, communications, agreements, or arrangements made independently between the user
        and the trek operator.
      </p>
    </LegalPage>
  );
}
