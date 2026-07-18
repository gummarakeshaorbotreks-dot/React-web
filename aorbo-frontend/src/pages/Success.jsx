import React from 'react';
import '../styles/Success.css';

// Converted from aorboweb/treks_app/templates/success.html
// Shown after a visitor's contact-form submission succeeds.
export default function Success() {
  return (
    <div className="success-page">
      <div className="success-card">
        <h2>Thank You!</h2>
        <p>Your message has been sent successfully.</p>
        <a className="success-btn" href="https://www.aorbotreks.com">
          Visit Aorbo Treks
        </a>
      </div>
    </div>
  );
}
