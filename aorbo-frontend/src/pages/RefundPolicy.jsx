import { Link } from 'react-router-dom';
import LegalPage from '../components/legal/LegalPage';

const CARE_EMAIL = 'care@aorbotreks.com';
const careLink = <a href={`mailto:${CARE_EMAIL}`}>{CARE_EMAIL}</a>;
const carePhone = <a href="tel:+917989251063">+91 79892 51063</a>;
const careWhatsApp = <a href="https://wa.me/917989251063" target="_blank" rel="noreferrer">WhatsApp</a>;

// No `contentKind`: the Django admin has no "refund" sections, so this page
// is the fixed text only.
export default function RefundPolicy() {
  return (
    <LegalPage title="Refund & Cancellation Policy" audience="For bookings made on the Aorbo Treks website and mobile app" updated="2 October 2026">
      <p>
        This policy explains how to cancel a trek booked on Aorbo Treks and how much of your money is refunded.
        It is part of our <Link to="/terms">Terms and Conditions</Link>.
      </p>
      <p>
        Every trek follows one of two cancellation policies: the <strong>Standard Policy</strong> or the{' '}
        <strong>Flexible Policy</strong>. The trek page shows which one applies before you book, and the app shows
        the exact refund amount before you confirm a cancellation.
      </p>

      {/* 1. Key terms */}
      <h3 id="key-terms">1. Key terms</h3>
      <ul>
        <li>
          <p>
            <strong>Departure</strong> means the scheduled departure time from the boarding point in your booking,
            in Indian Standard Time (IST). If no departure time has been set, it means 00:00 IST on the first day of
            the trek. All the time limits below are counted back from departure.
          </p>
        </li>
        <li>
          <p>
            <strong>Trek fare</strong> means the price of the trek for all the travellers in your booking, after any
            organizer discount or coupon. It does not include GST or the platform fee.
          </p>
        </li>
        <li>
          <p>
            <strong>Organizer</strong> means the independent trek operator who runs your trek.
          </p>
        </li>
      </ul>

      {/* 2. How to cancel */}
      <h3 id="how-to-cancel">2. How to cancel</h3>
      <ul>
        <li>
          <p>
            In the Aorbo Treks app, open <strong>My Bookings</strong>, choose the booking and tap{' '}
            <strong>Cancel Booking</strong>. The app shows your refund before you confirm.
          </p>
        </li>
        <li>
          <p>
            You can cancel in the app until 6 hours before departure. After that, write to {careLink} with your
            Booking ID. A cancellation made then counts as less than 24 hours before departure.
          </p>
        </li>
        <li>
          <p>
            A booking can only be cancelled as a whole. Cancelling only some of the travellers in a booking is not
            available at present.
          </p>
        </li>
        <li>
          <p>
            Your cancellation takes effect when it is confirmed in the app or by e-mail, and the refund is worked out
            from that time.
          </p>
        </li>
      </ul>

      {/* 3. Standard Policy */}
      <h3 id="standard-policy">3. Standard Policy</h3>
      <p>
        Under the Standard Policy you pay the full amount in the app when you book. If you cancel, this share of the
        trek fare is deducted:
      </p>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th scope="col">When you cancel</th>
              <th scope="col">Deducted from the trek fare</th>
              <th scope="col">Trek fare refunded</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>72 hours or more before departure</td>
              <td>20%</td>
              <td>80%</td>
            </tr>
            <tr>
              <td>48 hours or more, but less than 72 hours, before departure</td>
              <td>50%</td>
              <td>50%</td>
            </tr>
            <tr>
              <td>24 hours or more, but less than 48 hours, before departure</td>
              <td>70%</td>
              <td>30%</td>
            </tr>
            <tr>
              <td>Less than 24 hours before departure, after departure, or if you do not turn up</td>
              <td>100%</td>
              <td>Nothing (no refund)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        GST, the platform fee and payment gateway fees are explained in <a href="#not-refunded">section 5</a>.
      </p>

      {/* 4. Flexible Policy */}
      <h3 id="flexible-policy">4. Flexible Policy</h3>
      <p>
        Some treks offer the Flexible Policy. You can book by paying an advance of <strong>₹999 per traveller</strong>{' '}
        in the app, together with the GST and the platform fee, and pay the rest of the trek fare (the{' '}
        <strong>balance</strong>) directly to the organizer. You can also choose to pay the full amount in the app.
      </p>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Your situation</th>
              <th scope="col">What happens</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>You paid only the ₹999 advance, and you cancel at any time</td>
              <td>The ₹999 advance per traveller is non-refundable. You do not have to pay the balance.</td>
            </tr>
            <tr>
              <td>You paid the full amount in the app, and you cancel 24 hours or more before departure</td>
              <td>₹999 per traveller is kept. The rest of the trek fare is refunded.</td>
            </tr>
            <tr>
              <td>
                You paid the full amount in the app, and you cancel less than 24 hours before departure, after
                departure, or do not turn up
              </td>
              <td>100% of the trek fare is deducted. No refund.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Any balance you paid directly to the organizer is settled between you and the organizer. Aorbo Treks does
        not receive that money, so it cannot refund it. If you have trouble getting it back, write to {careLink} and
        we will help.
      </p>

      {/* 5. What is not refunded */}
      <h3 id="not-refunded">5. What is not refunded</h3>
      <ul>
        <li>
          <p>
            <strong>Platform fee (₹10 per booking).</strong> This is Aorbo Treks’ fee for its own service. It is
            not refunded when a booking is cancelled, whoever cancels it.
          </p>
        </li>
        <li>
          <p>
            <strong>Payment gateway fee.</strong> The payment gateway may charge a fee on your payment, and it does
            not return that fee when a refund is made. If a fee was charged, it is deducted from your refund. We
            deduct the actual fee charged on your payment, not an estimate. It depends on how you paid: a UPI
            payment from a bank account usually has no fee, while a card, net banking or wallet payment, or a
            credit card used through UPI, may have one.
          </p>
        </li>
        <li>
          <p>
            <strong>GST.</strong> If you cancel before the trek starts, the GST you paid is refunded in full:
            cancellation charges apply only to the trek fare, never to the GST. GST is not refunded only when the
            trek has already started, because nothing is refunded then.
          </p>
        </li>
      </ul>

      {/* 6. Cancellation by the organizer */}
      <h3 id="organizer-cancellation">6. If the organizer cancels your trek</h3>
      <p>
        If your booking is cancelled for a reason that is not your fault (for example, the organizer or Aorbo Treks
        cancels the trek, or it cannot start because of bad weather, permits or safety), no cancellation charge
        applies. You get back everything you paid in the app, including the ₹999 advance under the Flexible Policy,
        except:
      </p>
      <ul>
        <li><p>the ₹10 platform fee; and</p></li>
        <li><p>the payment gateway fee, if one was charged on your payment (see <a href="#not-refunded">section 5</a>).</p></li>
      </ul>
      <p>
        Any balance you paid directly to the organizer is refunded by the organizer. Write to {careLink} if you need
        our help with it.
      </p>

      {/* 7. Rescheduling */}
      <h3 id="rescheduling">7. Rescheduling</h3>
      <p>
        Aorbo Treks does not offer rescheduling. If you want to go on a different date, cancel your booking under
        this policy (the charges above apply) and make a new booking for the new date.
      </p>

      {/* 8. Payment taken but booking not confirmed */}
      <h3 id="unconfirmed-payment">8. If you paid but your booking was not confirmed</h3>
      <p>
        If money was taken from your account but your booking was not confirmed (for example, the last seats were
        taken while you were paying, or bookings closed during your payment), the full amount, including the
        platform fee, is refunded automatically to your original payment method.
      </p>

      {/* 9. Refund timeline */}
      <h3 id="refund-timeline">9. When you get your refund</h3>
      <ul>
        <li><p>Refunds start immediately and usually reach you in 5–7 business days.</p></li>
        <li>
          <p>
            Refunds always go back to the original payment method. We cannot send a refund to a different card,
            bank account or UPI ID.
          </p>
        </li>
        <li><p>You can check the status of your refund in the app.</p></li>
        <li>
          <p>If your refund has not reached you after 7 business days, write to {careLink} with your Booking ID.</p>
        </li>
      </ul>

      {/* 10. Questions, complaints and disputes */}
      <h3 id="contact">10. Questions, complaints and disputes</h3>
      <p>
        For any question about a cancellation or refund, or if you think your refund was calculated wrongly, write
        to {careLink}, or call or message us on {careWhatsApp} at {carePhone} (Monday to Saturday, 10:00 to 18:00
        IST), with your Booking ID. The same contacts handle all complaints and grievances.
      </p>
      <p>
        If the trek itself was not as described (for example, something included in the listing was not provided),
        tell us at {careLink}, ideally within 15 days of the trek ending, with any photos or other details. We will
        take it up with the organizer and let you know our decision.
      </p>
    </LegalPage>
  );
}
