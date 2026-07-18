import React from 'react';

// Converted from aorboweb/treks_app/templates/treks_app/mail.html
// Reference/preview component only — see note in EmailLayout.jsx.
// The original template's <style> media query and MSO/Outlook resets don't
// translate to inline-style React output; email-client compatibility for
// a real send still needs the original Django template's <style> block.
export default function ContactThankYouEmail({
  name,
  ctaUrl,
  ctaLabel,
  currentYear,
  socialLinks = [],
  email,
}) {
  const displayName = name || 'there';
  const year = currentYear ?? 2025;
  const url = ctaUrl || 'https://aorbotreks.com';
  const label = ctaLabel || 'Visit Our Website';
  const displayEmail = email || 'contact@example.com';

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      style={{ background: 'transparent', tableLayout: 'fixed', padding: '20px 0' }}
    >
      <tbody>
        <tr>
          <td align="center">
            <table
              role="presentation"
              width="100%"
              cellPadding="0"
              cellSpacing="0"
              style={{
                maxWidth: 600,
                margin: '0 auto',
                background: '#ffffff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: 30, background: '#ffffff' }}>
                    <h2 style={{ color: '#004aad', fontSize: 24, marginTop: 0 }}>Hi {displayName},</h2>
                    <p style={{ fontSize: 16, lineHeight: 1.6, color: '#333' }}>
                      Thank you for contacting us! We've received your message and our team will
                      get back to you shortly.
                    </p>
                    <p style={{ fontSize: 16, lineHeight: 1.6, color: '#333' }}>
                      In the meantime, feel free to explore our website or check the latest updates.
                    </p>

                    <div style={{ textAlign: 'center', margin: '30px 0' }}>
                      <a
                        href={url}
                        style={{
                          display: 'inline-block',
                          background: '#004aad',
                          color: '#ffffff',
                          textDecoration: 'none',
                          fontWeight: 700,
                          padding: '14px 28px',
                          borderRadius: 8,
                          fontSize: 16,
                          letterSpacing: 0.3,
                        }}
                      >
                        {label}
                      </a>
                    </div>

                    <p style={{ fontSize: 14, color: '#777', marginTop: 0 }}>
                      Best regards,
                      <br />
                      <strong>Aorbo Treks Team</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style={{ background: '#f4f7fe', textAlign: 'center', padding: 30, fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>
                    <img
                      src="https://raw.githubusercontent.com/sahoojanmejaya-aorbotreks/assets/main/Logo.png"
                      alt="Aorbo Treks Logo"
                      width="80"
                      style={{ display: 'block', margin: '0 auto 10px' }}
                    />
                    <p>© {year} Aorbo Treks. All rights reserved.</p>
                    <p>Hyderabad, Telangana, India</p>

                    {socialLinks.length > 0 && (
                      <table role="presentation" cellPadding="0" cellSpacing="0" style={{ margin: '16px auto 0' }}>
                        <tbody>
                          <tr>
                            {socialLinks.map(({ platform, url: linkUrl, svgUrl }) => (
                              <td key={platform} style={{ padding: '0 5px' }}>
                                <a href={linkUrl} aria-label={platform}>
                                  <img src={svgUrl} alt={platform} width="28" height="28" style={{ display: 'block' }} />
                                </a>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    )}

                    <p style={{ marginTop: 15, fontSize: 12, color: '#bbb', lineHeight: 1.4 }}>
                      This is an auto-generated email sent to <strong>{displayEmail}</strong> for
                      filling out the contact form on the Aorbo Treks website.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
