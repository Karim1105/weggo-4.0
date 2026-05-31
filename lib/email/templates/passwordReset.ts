interface PasswordResetEmailParams {
  resetLink: string
  userName?: string | null
  expiresInMinutes?: number
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderPasswordResetEmail({
  resetLink,
  userName,
  expiresInMinutes = 60,
}: PasswordResetEmailParams) {
  const safeLink = escapeHtml(resetLink)
  const greeting = userName?.trim()
    ? `Hi ${escapeHtml(userName.trim().split(' ')[0])},`
    : 'Hi,'

  const subject = 'Reset your Weggo password'

  const text = [
    greeting,
    '',
    'We received a request to reset the password on your Weggo account.',
    '',
    `Open this link to set a new password (valid for ${expiresInMinutes} minutes):`,
    resetLink,
    '',
    'If you did not request this, you can ignore this email — your password will not change.',
    '',
    '— The Weggo team',
  ].join('\n')

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;box-shadow:0 4px 14px rgba(15,23,42,0.06);overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <div style="font-size:22px;font-weight:700;letter-spacing:-0.01em;background:linear-gradient(135deg,#0ea5e9,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent;">Weggo</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.4;color:#0f172a;">Reset your password</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
                  We received a request to reset the password on your Weggo account. Click the button below to set a new one. The link is valid for <strong>${expiresInMinutes} minutes</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:999px;background:linear-gradient(135deg,#0284c7,#7c3aed);">
                      <a href="${safeLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">Reset password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#64748b;">
                  If the button doesn't work, copy and paste this URL into your browser:
                </p>
                <p style="margin:8px 0 0 0;font-size:13px;line-height:1.6;color:#0284c7;word-break:break-all;">
                  <a href="${safeLink}" style="color:#0284c7;text-decoration:none;">${safeLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <hr style="border:0;border-top:1px solid #e2e8f0;margin:0 0 16px 0;" />
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  Didn't request a reset? You can safely ignore this email — your password won't change.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Weggo · Made in Egypt</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, html, text }
}
