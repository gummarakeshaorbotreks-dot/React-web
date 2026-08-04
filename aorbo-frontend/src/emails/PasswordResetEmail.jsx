


export default function PasswordResetEmail({ email, protocol, domain, uidb64, token }) {
  const resetUrl = `${protocol}://${domain}/accounts/reset/${uidb64}/${token}/`;

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
                  <td style={{ paddingTop: 25, color: '#333', lineHeight: 1.6, fontSize: 15 }}>
                    <p>Hi there,</p>
                    <p>
                      Someone asked for a password reset for the email address{' '}
                      <strong>{email}</strong>.
                    </p>
                    <p>Follow the link below to reset your password:</p>
                    <p style={{ textAlign: 'center', margin: '30px 0' }}>
                      <a
                        href={resetUrl}
                        style={{
                          background: '#ff7a00',
                          color: '#ffffff',
                          padding: '12px 22px',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontWeight: 'bold',
                          display: 'inline-block',
                        }}
                      >
                        Reset Your Password
                      </a>
                    </p>
                    <p>
                      If you didn't ask for a password reset, you can ignore this email. Your
                      password won't change until you access the link above and create a new one.
                    </p>
                    <p>
                      Warm regards,
                      <br />
                      <strong>Team Aorbo Treks</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style={{ background: '#f4f7fe', padding: 30, textAlign: 'center', fontSize: 12, color: '#aaa' }}>
                    <p style={{ margin: '6px 0', fontSize: 13, color: '#777' }}>
                      © {new Date().getFullYear()} Aorbo Treks. All rights reserved.
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
                    <p style={{ marginTop: 14, fontSize: 12, color: '#aaa' }}>
                      This is an auto-generated email sent to <strong>{email}</strong> for password
                      reset on Aorbo Treks.
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
