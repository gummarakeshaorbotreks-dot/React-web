import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/Auth.css';
import { getCsrfToken } from '../../utils/csrf';

// Converted from aorboweb/treks_app/templates/registration/password_reset_confirm.html
//
// Django's PasswordResetConfirmView does a one-time redirect the first time
// this link is opened: /accounts/reset/<uidb64>/<token>/ -> .../set-password/
// (storing token validity in the session so the real token never sits in
// browser history). This component follows that same redirect on mount,
// then posts the new password to whatever URL Django lands on.
//
// Route this component at: /accounts/reset/:uidb64/:token
export default function ResetPasswordConfirm() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [postUrl, setPostUrl] = useState(`/accounts/reset/${uidb64}/${token}/`);
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/accounts/reset/${uidb64}/${token}/`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setValidLink(data.valid);
        setPostUrl(`/accounts/reset/${uidb64}/${token}/`);
        setChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setValidLink(false);
        setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uidb64, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password1 !== password2) {
      setError('The two password fields do not match.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(postUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken() || '',
        },
        body: JSON.stringify({ new_password1: password1, new_password2: password2 }),
      });

      const data = await res.json();

      if (data.success) {
        navigate('/accounts/reset/done', { replace: true });
      } else {
        setError(data.error || 'The password could not be reset. Please check the requirements and try again.');
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
        <h2>Set a new password</h2>

        {checking && <p>Checking your reset link…</p>}

        {!checking && validLink && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="password1">New password</label>
            <input
              id="password1"
              type="password"
              required
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
            />

            <label htmlFor="password2">Confirm new password</label>
            <input
              id="password2"
              type="password"
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? 'Changing password…' : 'Change password'}
            </button>
          </form>
        )}

        {!checking && !validLink && (
          <p>
            The password reset link was invalid, possibly because it has already been used.
            Please request a new password reset.
          </p>
        )}
      </div>
    </div>
  );
}
