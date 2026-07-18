import React from 'react';
import '../../styles/Auth.css';

// Converted from aorboweb/treks_app/templates/registration/password_reset_done.html
export default function ResetPasswordSent() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Password reset sent</h2>
        <p>
          We've emailed you instructions for setting your password, if an account exists with
          the email you entered. You should receive them shortly.
        </p>
        <p>
          If you don't receive an email, please make sure you've entered the address you
          registered with, and check your spam folder.
        </p>
      </div>
    </div>
  );
}
