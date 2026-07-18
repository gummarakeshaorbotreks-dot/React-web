import React from 'react';

// Converted from aorboweb/templates/emails/osm_draft_notification.html
// Reference/preview component only — see note in EmailLayout.jsx.
export default function OsmDraftNotificationEmail({
  imageUrl,
  trekName,
  state,
  shortDesc,
  adminUrl,
}) {
  // Mirrors Django's |truncatewords:30 filter for the short description.
  const truncated = shortDesc
    ? shortDesc.split(/\s+/).slice(0, 30).join(' ') +
      (shortDesc.split(/\s+/).length > 30 ? '…' : '')
    : '';

  return (
    <table
      width="100%"
      cellPadding="0"
      cellSpacing="0"
      style={{ background: '#f4f4f4', padding: '24px 0' }}
    >
      <tbody>
        <tr>
          <td align="center">
            <table
              width="480"
              cellPadding="0"
              cellSpacing="0"
              style={{ background: '#ffffff', borderRadius: 12, overflow: 'hidden' }}
            >
              <tbody>
                <tr>
                  <td style={{ background: '#1a2e1a', padding: '20px 24px' }}>
                    <span style={{ color: '#FFE100', fontSize: 18, fontWeight: 'bold' }}>
                      🆕 New OSM Draft Trek
                    </span>
                  </td>
                </tr>

                {imageUrl && (
                  <tr>
                    <td>
                      <img
                        src={imageUrl}
                        width="480"
                        style={{ display: 'block', width: '100%', maxHeight: 220, objectFit: 'cover' }}
                        alt=""
                      />
                    </td>
                  </tr>
                )}

                <tr>
                  <td style={{ padding: 24 }}>
                    <h2 style={{ margin: '0 0 8px', color: '#111827', fontSize: 20 }}>{trekName}</h2>
                    <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13 }}>
                      {state || 'State not detected'}
                    </p>
                    {shortDesc && (
                      <p style={{ margin: '0 0 20px', color: '#374151', fontSize: 14, lineHeight: 1.6 }}>
                        {truncated}
                      </p>
                    )}
                    <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 13 }}>
                      A visitor searched for this destination and it's not yet in your Trek List.
                      Fill in the remaining details (operators, price, schedule) and publish it
                      when ready.
                    </p>
                    <a
                      href={adminUrl}
                      style={{
                        display: 'inline-block',
                        background: '#FFE100',
                        color: '#1a1a1a',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: 14,
                        padding: '12px 24px',
                        borderRadius: 8,
                      }}
                    >
                      Review &amp; Publish →
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '16px 24px', background: '#f9fafb', color: '#9ca3af', fontSize: 11 }}>
                    Aorbo Treks · Automated draft notification
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
