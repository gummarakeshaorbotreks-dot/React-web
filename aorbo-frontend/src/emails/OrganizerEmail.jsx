import React from 'react';

// Converted from aorboweb/templates/emails/organizer.html
// Reference/preview component only — see note in EmailLayout.jsx.
export default function OrganizerEmail({ name, message, email, currentYear }) {
  const year = currentYear ?? new Date().getFullYear();
  const displayName = name || 'there';

  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f4f6f8' }}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: '30px 0' }}>
            <table
              width="600"
              cellPadding="0"
              cellSpacing="0"
              style={{ background: '#ffffff', borderRadius: 8, padding: 30 }}
            >
              <tbody>
                <tr>
                  <td align="center" style={{ paddingBottom: 18 }}>
                    <h2 style={{ margin: 0, color: '#ff7a00', fontSize: 22, fontWeight: 700 }}>
                      AORBO TREKS
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td style={{ color: '#333', fontSize: 15, lineHeight: 1.6 }}>
                    <p>
                      Hi <strong>{displayName}</strong>,
                    </p>

                    <div
                      style={{
                        background: '#fff6ed',
                        borderLeft: '4px solid #ff7a00',
                        padding: 15,
                        borderRadius: 6,
                        margin: '18px 0 24px',
                      }}
                    >
                      <strong style={{ color: '#333' }}>📩 Query</strong>
                      <p style={{ margin: '8px 0 0', color: '#222', lineHeight: 1.6 }}>
                        {message}
                      </p>
                    </div>

                    <p>
                      Thank you for showing interest in partnering with <strong>Aorbo Treks</strong>.
                    </p>
                    <p>
                      We collaborate with verified trek operators to deliver high-quality
                      trekking experiences, while we handle{' '}
                      <strong>marketing, customer acquisition, and platform visibility</strong>.
                    </p>
                    <p>To continue the partnership process, please visit the link below for further onboarding steps:</p>

                    <p style={{ textAlign: 'center', margin: '28px 0' }}>
                      <a
                        href="https://www.partner.aorbotreks.co.in"
                        style={{
                          background: '#ff7a00',
                          color: '#ffffff',
                          padding: '12px 24px',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontWeight: 'bold',
                          display: 'inline-block',
                        }}
                      >
                        Visit Partnership Portal
                      </a>
                    </p>

                    <p>Our partnerships team will review your interest and reach out if there is a suitable opportunity to collaborate.</p>

                    <p>
                      Regards,
                      <br />
                      <strong>Aorbo Treks – Partnerships</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style={{ background: '#f4f7fe', padding: 25, textAlign: 'center' }}>
                    <img
                      src="https://raw.githubusercontent.com/sahoojanmejaya-aorbotreks/assets/main/Logo.png"
                      alt="Aorbo Treks"
                      width="80"
                      style={{ display: 'block', margin: '0 auto 12px' }}
                    />
                    <p style={{ margin: '6px 0', fontSize: 13, color: '#777' }}>
                      © {year} Aorbo Treks. All rights reserved.
                    </p>
                    <p style={{ margin: '4px 0', fontSize: 13, color: '#777' }}>
                      Hyderabad, Telangana, India
                    </p>
                    <p style={{ margin: '6px 0' }}>
                      <a
                        href="https://www.aorbotreks.com"
                        style={{ color: '#ff7a00', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
                      >
                        www.aorbotreks.com
                      </a>
                    </p>
                    <p style={{ marginTop: 14, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
                      This is an auto-generated email sent to <strong>{email}</strong> regarding
                      partnership interest with Aorbo Treks.
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
