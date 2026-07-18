import React from 'react';
import '../../styles/Auth.css';

// Converted from aorboweb/treks_app/templates/registration/lockout.html
// Shown by django-axes when a login has too many failed attempts.
export default function Lockout() {
  return (
    <div className="auth-page">
      <div className="auth-card locked">
        <h2>Account Locked</h2>
        <p>Your account has been temporarily locked due to too many failed login attempts.</p>
        <p>Please try again later, or contact support if you believe this is an error.</p>
        <p>
          You can also try to <a href="/accounts/password_reset/">reset your password</a>.
        </p>
      </div>
    </div>
  );
}
