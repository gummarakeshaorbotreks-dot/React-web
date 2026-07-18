import React from 'react';
import '../../styles/Auth.css';

// Converted from aorboweb/treks_app/templates/registration/password_reset_complete.html
export default function ResetPasswordComplete() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Password reset complete</h2>
        <p>Your password has been set. You may go ahead and log in now.</p>
        <p>
          <a href="/accounts/login/">Log in</a>
        </p>
      </div>
    </div>
  );
}
