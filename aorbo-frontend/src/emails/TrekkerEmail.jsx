import React from 'react';

// Converted from aorboweb/templates/emails/trekker.html
// Reference/preview component only — see note in EmailLayout.jsx.
export default function TrekkerEmail({
  message,
  name,
  email,
  displayCategory,
  exploreLink,
  currentYear,
}) {
  const year = currentYear ?? new Date().getFullYear();

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
                  <td align="center" style={{ paddingBottom: 16 }}>
                    <h2 style={{ margin: 0, color: '#ff7a00', fontSize: 22, fontWeight: 700 }}>
                      AORBO TREKS
                    </h2>
                  </td>
                </tr>

                <tr>
                  <td style={{ paddingTop: 25 }}>
                    <div
                      style={{
                        background: '#fff6ed',
                        borderLeft: '4px solid #ff7a00',
                        padding: 15,
                        borderRadius: 6,
                      }}
                    >
                      <strong style={{ color: '#333' }}>📩 Your Query</strong>
                      <p style={{ margin: '8px 0 0', color: '#222', lineHeight: 1.6 }}>
                        {message}
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style={{ paddingTop: 25, color: '#333', lineHeight: 1.6, fontSize: 15 }}>
                    <p>
                      Hi <strong>{name}</strong>,
                    </p>
                    <p>
                      Thank you for reaching out to <strong>Aorbo Treks</strong>. Based on your
                      query, we recommend exploring our <strong>{displayCategory} treks</strong>.
                    </p>
                    <p style={{ textAlign: 'center', margin: '30px 0' }}>
                      <a
                        href={exploreLink}
                        style={{
                          background: '#ff7a00',
                          color: '#ffffff',
                          padding: '12px 22px',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontWeight: 'bold',
                        }}
                      >
                        Explore {displayCategory} Treks
                      </a>
                    </p>
                    <p>
                      Warm regards,
                      <br />
                      <strong>Team Aorbo Treks</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style={{ background: '#f4f7fe', padding: 30, textAlign: 'center' }}>
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
                      This is an auto-generated email sent to <strong>{email}</strong> for
                      submitting a query on Aorbo Treks.
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
