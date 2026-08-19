import React, { useEffect, useState } from 'react';
import '../styles/Safety.css'; // Links directly to your external styles sheet

export default function Safety() {
  const [safetyTips, setSafetyTips] = useState([]);

  const BACKEND_URL =
    import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/safety-tips/`)
      .then((response) => response.json())
      .then((data) => setSafetyTips(data))
      .catch((error) =>
        console.error('Failed to load safety tips:', error)
      );
  }, []);
  return (
    <main className="safety-page">
      <div className="safety-container-fluid">
        
        <h1 className="safety-main-title">Safety</h1>

        {/* HERO SECTION */}
        <section className="safety-hero full-width animate-fade-up">
          <div className="safety-image">
            <img src="/images/safe_1.webp" alt="Safe Trekking Experience" />
          </div>
          <div className="safety-content">
            <h2>Explore the Wild with Confidence</h2>
            <p>
              At Aorbo Treks, the safety of our users is our top priority. We ensure a secure and structured
              trekking experience by partnering with Verified Organizers - you are in safe hands!
            </p>
          </div>
        </section>

        {/* SAFETY FEATURES */}
        <section className="animate-fade-up">
          <h2 className="section-title">Safety Features</h2>
          <div className="scrollable-row">
            <div className="feature-item interactive-card">
              <h3>Female-Friendly Treks</h3>
              <p className="card-text-full">
                Offering women-specific treks with experienced female guides who bring a supportive and inclusive atmosphere.
              </p>
            </div>
            <div className="feature-item interactive-card">
              <h3>24/7 Support</h3>
              <p className="card-text-full">
                We have a dedicated team that is available around the clock to assist with any emergencies or help you need.
              </p>
            </div>
            <div className="feature-item interactive-card">
              <h3>Emergency Preparedness</h3>
              <p className="card-text-full">
                All treks are equipped with an emergency kit, have clear protocols in place, and medical support if needed.
              </p>
            </div>
            <div className="feature-item interactive-card">
              <h3>Safety Drills</h3>
              <p className="card-text-full">
                Our trek guides are skilled in handling all types of situations and conduct regular training drills for all trek team members.
              </p>
            </div>
          </div>
        </section>

        {/* INDIVIDUAL TREKKER */}
        <section className="animate-fade-up">
          <h2 className="section-title">Individual Trekker..?</h2>
          <div className="safety-card-image interactive-image-wrapper">
            <img src="/images/Group 1000001380.webp" alt="Individual Trekker Info" />
          </div>
          <div className="scrollable-row">
            <div className="safety-item interactive-card">
              <h3>Solo Experience</h3>
              <p className="card-text-full">An individual trekker often plans their trek independently, relying on their own research to find treks and organizers.</p>
            </div>
            <div className="safety-item interactive-card">
              <h3>Limited Access</h3>
              <p className="card-text-full">They may not have access to a wide variety of trekking options or specialized services without extensive research.</p>
            </div>
            <div className="safety-item interactive-card">
              <h3>Greater Uncertainty</h3>
              <p className="card-text-full">Solo trekkers may feel uncertain about the reliability of organizers and safety, as they're usually working with unverified sources.</p>
            </div>
            <div className="safety-item interactive-card">
              <h3>Higher Costs</h3>
              <p className="card-text-full">Solo trekkers might face higher costs since they aren't benefiting from group discounts or tailored packages that offer better value.</p>
            </div>
          </div>
        </section>

        {/* PLATFORM */}
        <section className="animate-fade-up">
          <h2 className="section-title">On Aorbo Treks Platform</h2>
          <div className="platform-image interactive-image-wrapper">
            <img src="/images/Group 1000001376.webp" alt="Platform Comparison Info" />
          </div>
          <div className="scrollable-row">
            <div className="platform-item interactive-card">
              <h3>Access to Multiple Organizers</h3>
              <p className="card-text-full">Users can browse trusted trekking organizers on Aorbo, making it easy to compare options.</p>
            </div>
            <div className="platform-item interactive-card">
              <h3>Tailored Trek Options</h3>
              <p className="card-text-full">Users can filter treks by preferences, ensuring a personalized experience.</p>
            </div>
            <div className="platform-item interactive-card">
              <h3>Safety and Assurance</h3>
              <p className="card-text-full">Aorbo ensures partner organizers follow safety standards, providing reliable services for peace of mind.</p>
            </div>
            <div className="platform-item interactive-card">
              <h3>Cost-Effective Packages</h3>
              <p className="card-text-full">Aorbo offers group discounts, special deals, and customizable packages to help users save.</p>
            </div>
            <div className="platform-item interactive-card">
              <h3>24/7 Support</h3>
              <p className="card-text-full">Users have direct access to customer support, ensuring a secure and stress-free experience.</p>
            </div>
            <div className="platform-item interactive-card">
              <h3>Streamlined Booking Process</h3>
              <p className="card-text-full">With Aorbo, users can easily book, pay, and manage their trips in one place.</p>
            </div>
          </div>
        </section>

        {/* 🎯 GROUP BOOKINGS (COMPLETELY DIFFERENT RECONSTRUCTED CSS LAYOUT CLASSES) */}
        <section className="animate-fade-up group-section-wrapper">
          <h2 className="group-section-title">At Aorbo Treks, we make group bookings easy, affordable, and hassle-free</h2>
          <div className="group-image-wrapper">
            <img src="/images/money2.webp" alt="Group Discount Benefit" className="group-center-banner" />
          </div>
          <div className="group-cards-grid">
            <div className="group-interactive-card">
              <h3>Simple Booking</h3>
              <p>Group leaders can book for the entire group online with customizable trek options.</p>
            </div>
            <div className="group-interactive-card">
              <h3>Exclusive Discounts</h3>
              <p>Get special pricing and flexible payment options for groups.</p>
            </div>
            <div className="group-interactive-card">
              <h3>Dedicated Support</h3>
              <p>Enjoy personalized assistance and 24/7 customer support for a smooth experience.</p>
            </div>
            <div className="group-interactive-card">
              <h3>Safety & Logistics</h3>
              <p>We manage safety, transport, and accommodation for your group's comfort.</p>
            </div>
            <div className="group-interactive-card">
              <h3>Team Building</h3>
              <p>Engage in activities that promote bonding and collaboration.</p>
            </div>
            <div className="group-interactive-card">
              <h3>Seamless Communication</h3>
              <p>Keep everyone informed with clear details and updates.</p>
            </div>
          </div>
        </section>
        {/* ADMIN-CONTROLLED SAFETY TIPS */}
        {Object.entries(
          safetyTips.reduce((groups, tip) => {
            const section = tip.section_title || 'Safety Tips';

            if (!groups[section]) {
              groups[section] = [];
             }

            groups[section].push(tip);

            return groups;
          }, {})
        ).map(([sectionTitle, tips]) => (
          <section
            key={sectionTitle}
            className="animate-fade-up safety-tips-section"
          >
            <h2 className="section-title">{sectionTitle}</h2>

            <div className="scrollable-row">
              {tips.map((tip) => (
                <div
                  key={tip.id}
                  className="feature-item interactive-card"
                >
                  <h3>{tip.title}</h3>

                  <p className="card-text-full">
                    {tip.content}
                  </p>
                </div>
              ))}
            </div>
          </section>  
        ))}      
          </div>
    </main>
  );
}
