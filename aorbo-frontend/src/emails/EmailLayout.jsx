import React from 'react';

// Converted from aorboweb/templates/emails/base.html + footer.html.
//
// IMPORTANT: these /src/emails components are React equivalents of the
// Django email templates, for preview/reference purposes (e.g. rendering
// a live preview in an admin tool). They do NOT replace the Django
// templates for actually sending mail — Django's email backend still
// needs real server-rendered HTML strings to hand to SMTP. Table-based
// layout and inline styles are kept (rather than className) because
// that's still required for compatibility with email clients.
export default function EmailLayout({ message, currentYear, website, children }) {
  const year = currentYear ?? new Date().getFullYear();

  return (
    <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f4f6f8' }}>
      <tbody>
        <tr>
          <td align="center" style={{ padding: '24px 0' }}>
            <table
              width="600"
              cellPadding="0"
              cellSpacing="0"
              style={{ background: '#ffffff', padding: 28, borderRadius: 6 }}
            >
              <tbody>
                <tr>
                  <td style={{ paddingBottom: 18, textAlign: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#ff7a00' }}>
                      Aorbo Treks
                    </span>
                  </td>
                </tr>

                <tr>
                  <td style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>{children}</td>
                </tr>

                {message && (
                  <tr>
                    <td style={{ padding: '18px 0' }}>
                      <div
                        style={{
                          background: '#f4f8ff',
                          padding: 14,
                          borderLeft: '4px solid #ff7a00',
                          borderRadius: 5,
                        }}
                      >
                        <strong>📩 Your Query</strong>
                        <br />
                        {message}
                      </div>
                    </td>
                  </tr>
                )}

                <tr>
                  <td
                    style={{
                      fontSize: 12,
                      color: '#999',
                      textAlign: 'center',
                      paddingTop: 18,
                    }}
                  >
                    © {year} Aorbo Treks
                    <br />
                    <a href={website} style={{ color: '#999', textDecoration: 'none' }}>
                      {website}
                    </a>
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
