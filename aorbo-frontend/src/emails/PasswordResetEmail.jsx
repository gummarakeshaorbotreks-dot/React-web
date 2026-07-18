import React from 'react';

// Converted from aorboweb/treks_app/templates/registration/password_reset_email.html
// This is Django's built-in plain-text password reset email body, so
// there's no visual markup to convert — just its variables as props.
// Reference/preview component only — see note in EmailLayout.jsx.
export default function PasswordResetEmail({ email, protocol, domain, uidb64, token }) {
  const resetUrl = `${protocol}://${domain}/accounts/reset/${uidb64}/${token}/`;

  return (
    <pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
      {`Someone asked for a password reset for the email address ${email}.

Follow the link below:
${resetUrl}

If you didn't ask for a password reset, you can ignore this email.`}
    </pre>
  );
}
