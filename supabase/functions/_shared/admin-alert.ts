// Gemensam admin-avisering via e-post. Alla nya händelser (ärenden, verkstäder,
// offerter) skickar en kort notis till adressen i ADMIN_NOTIFY_EMAIL.

export const getAdminNotifyEmail = () =>
  Deno.env.get('ADMIN_NOTIFY_EMAIL') || 'info@auroramedia.se'

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export interface AdminAlertOptions {
  supabaseUrl: string
  serviceRoleKey: string
  subject: string
  heading: string
  rows: Array<[string, unknown]>
  ctaUrl?: string
  ctaLabel?: string
}

export const buildAdminAlertHtml = ({ heading, rows, ctaUrl, ctaLabel }: Omit<AdminAlertOptions, 'supabaseUrl' | 'serviceRoleKey' | 'subject'>) => `
  <h2 style="margin:0 0 16px">${escapeHtml(heading)}</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${rows
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(
        ([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#111"><strong>${escapeHtml(value)}</strong></td>
      </tr>`,
      )
      .join('')}
  </table>
  ${
    ctaUrl
      ? `<p style="margin-top:24px">
      <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">
        ${escapeHtml(ctaLabel || 'Öppna i admin')}
      </a>
    </p>`
      : ''
  }
`

export const sendAdminAlert = async (options: AdminAlertOptions): Promise<void> => {
  const { supabaseUrl, serviceRoleKey, subject } = options
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: getAdminNotifyEmail(),
        subject,
        html: buildAdminAlertHtml(options),
      }),
    })
    if (!response.ok) {
      console.error('Admin alert email failed', response.status, await response.text().catch(() => ''))
    }
  } catch (error) {
    console.error('Admin alert email failed', error)
  }
}
