import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCsrfToken } from '../../utils/csrf';
import '../../styles/Auth.css';

// Converted from aorboweb/treks_app/templates/registration/password_reset_form.html
// Posts to Django's built-in password_reset endpoint (django.contrib.auth.urls),
// so no backend changes are required for this to work.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/accounts/password_reset/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': getCsrfToken() || '',
        },
        body: new URLSearchParams({ email }),
      });

      if (res.ok || res.redirected) {
        navigate('/accounts/password_reset/done', { replace: true });
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Forgot your password?</h2>
        <p>Enter your email address below, and we'll email instructions for setting a new one.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Reset my password'}
          </button>
        </form>
      </div>
    </div>
  );
}
