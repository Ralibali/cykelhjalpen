// Delad mall- och validerings-logik för verkstadsrekrytering.
// HTML/text-strängar produceras här så att både prospect-action (utkast)
// och prospect-send-outreach (skarpt mejl) använder EXAKT samma innehåll.

export const OUTREACH_FROM = 'Christoffer på Cykelhjalpen.se <info@cykelhjalpen.se>'
export const OUTREACH_REPLY_TO = 'info@cykelhjalpen.se'
export const OUTREACH_SITE_URL = 'https://cykelhjalpen.se'
export const OUTREACH_WORKSHOP_URL = 'https://cykelhjalpen.se/for-verkstader'
export const OUTREACH_DAILY_CAP = 20
export const OUTREACH_MIN_DAYS_BETWEEN_CONTACT = 30

export interface ProspectForDraft {
  company_name: string
  city: string
  website: string | null
  ai_summary: string | null
  services: string[] | null
  unsubscribe_token: string
}

// Escapa HTML-attribut/textnoder för allt Firecrawl-innehåll.
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const truncate = (value: string, max: number): string => {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max).trim()}…`
}

const firstWord = (raw: string): string => {
  const trimmed = raw.trim().split(/\s+/)[0]
  return trimmed && trimmed.length > 1 ? trimmed : 'ni'
}

const buildVerifiedDetail = (prospect: ProspectForDraft): string | null => {
  const service = (prospect.services || []).find((s) => typeof s === 'string' && s.length > 2)
  if (service) return `Vi såg att ni erbjuder ${service.toLowerCase()} i ${prospect.city}`
  if (prospect.ai_summary) return `Vi läste kort på er sajt: "${truncate(prospect.ai_summary, 140)}"`
  if (prospect.website) return `Vi hittade er verkstad i ${prospect.city}`
  return null
}

export const unsubscribeUrl = (token: string) =>
  `${OUTREACH_SITE_URL}/avregistrera/${encodeURIComponent(token)}`

// Publik URL som Gmail/Yahoo POST:ar till för RFC 8058 one-click unsubscribe.
// Måste svara på POST utan JWT och peka på edge-functionen (SPA:n kan inte servera POST).
export const oneClickUnsubscribeUrl = (supabaseUrl: string, token: string) =>
  `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/prospect-unsubscribe?token=${encodeURIComponent(token)}`

// Renderar admin-godkänd brödtext till säker HTML + textbundle. Brödtexten
// escapas och nyrader blir <br>/paragraf. Avregistreringsfot läggs alltid till
// server-side så att admin inte kan råka ta bort den.
export const buildEditedEmail = (
  prospect: Pick<ProspectForDraft, 'unsubscribe_token'>,
  approvedMessage: string,
): { text: string; html: string } => {
  const unsub = unsubscribeUrl(prospect.unsubscribe_token)
  const trimmed = approvedMessage.replace(/\s+$/g, '')
  const includesUnsub = trimmed.includes(unsub)

  const footerText = includesUnsub
    ? ''
    : `\n\n---\nVill ni inte få fler mejl från oss? Avregistrera er här: ${unsub}\nNi får detta mejl som offentlig cykelverkstad i vårt lokala nätverk. Rättelse eller radering: info@cykelhjalpen.se.`

  const text = trimmed + footerText

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((para) => {
      const safe = escapeHtml(para).replace(/\n/g, '<br>')
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${safe}</p>`
    })
    .join('')

  const safeUnsub = escapeHtml(unsub)
  const footerHtml = includesUnsub
    ? ''
    : `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="margin:0 0 8px;font-size:12px;color:#6b7280;">
  Vill ni inte få fler mejl från oss? <a href="${safeUnsub}" style="color:#6b7280;text-decoration:underline;">Avregistrera er här</a>.
</p>
<p style="margin:0;font-size:12px;color:#6b7280;">
  Ni får detta mejl som offentlig cykelverkstad i vårt lokala nätverk. Rättelse eller radering: info@cykelhjalpen.se.
</p>`

  const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(15,23,42,0.05);">
<tr><td>
${paragraphs}
${footerHtml}
</td></tr></table>
</td></tr></table>
</body></html>`

  return { text, html }
}

interface DraftBundle {
  subject: string
  text: string
  html: string
}

export const buildEmailDraft = (prospect: ProspectForDraft): DraftBundle => {
  const greeting = firstWord(prospect.company_name)
  const detail = buildVerifiedDetail(prospect)
  const unsub = unsubscribeUrl(prospect.unsubscribe_token)
  const subject = `Kundförfrågningar från cykelägare i ${prospect.city}`

  const textLines = [
    `Hej ${greeting}!`,
    '',
    `Jag heter Christoffer och driver Cykelhjalpen.se. Vi hjälper cykelägare i ${prospect.city} att hitta lokala verkstäder när de behöver service eller reparation.`,
  ]
  if (detail) textLines.push('', `${detail} – därför vill jag berätta hur det funkar hos oss:`)
  textLines.push(
    '',
    '• Ni väljer själva vilka kundförfrågningar ni vill svara på.',
    '• Inga fasta månadsavgifter – ni betalar bara per ärende ni tar emot.',
    '• De fem första kundförfrågningarna är gratis så ni kan testa i lugn och ro.',
    '',
    `Vill ni testa? Kika på ${OUTREACH_WORKSHOP_URL} eller svara på det här mejlet, så visar jag hur det ser ut i er stad.`,
    '',
    'Vänliga hälsningar,',
    'Christoffer',
    'Cykelhjalpen.se',
    'info@cykelhjalpen.se',
    '',
    `Vill ni inte få fler mejl från oss? Avregistrera er här: ${unsub}`,
    'Ni får detta mejl som offentlig cykelverkstad i vårt lokala nätverk. Rättelse eller radering: info@cykelhjalpen.se.',
  )
  const text = textLines.join('\n')

  const safeGreeting = escapeHtml(greeting)
  const safeCity = escapeHtml(prospect.city)
  const safeDetail = detail ? `<p style="margin:0 0 16px">${escapeHtml(detail)} – därför vill jag berätta hur det funkar hos oss:</p>` : ''
  const safeUnsub = escapeHtml(unsub)
  const safeWorkshopUrl = escapeHtml(OUTREACH_WORKSHOP_URL)

  const html = `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(15,23,42,0.05);">
<tr><td>
<p style="margin:0 0 16px;font-size:16px;">Hej ${safeGreeting}!</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">
  Jag heter Christoffer och driver <a href="${escapeHtml(OUTREACH_SITE_URL)}" style="color:#4338CA;text-decoration:underline;">Cykelhjalpen.se</a>.
  Vi hjälper cykelägare i ${safeCity} att hitta lokala verkstäder när de behöver service eller reparation.
</p>
${safeDetail}
<ul style="margin:0 0 20px 0;padding-left:20px;font-size:15px;line-height:1.7">
  <li>Ni väljer själva vilka kundförfrågningar ni vill svara på.</li>
  <li>Inga fasta månadsavgifter – ni betalar bara per ärende ni tar emot.</li>
  <li>De fem första kundförfrågningarna är gratis så ni kan testa i lugn och ro.</li>
</ul>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">
  Vill ni testa? Läs mer på <a href="${safeWorkshopUrl}" style="color:#4338CA;text-decoration:underline;">${safeWorkshopUrl}</a>
  eller svara på det här mejlet, så visar jag hur det ser ut i er stad.
</p>
<p style="margin:24px 0 4px;font-size:15px;">Vänliga hälsningar,</p>
<p style="margin:0;font-size:15px;font-weight:600;">Christoffer</p>
<p style="margin:0;font-size:14px;color:#374151;">Cykelhjalpen.se</p>
<p style="margin:0 0 24px;font-size:14px;color:#374151;">info@cykelhjalpen.se</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="margin:0 0 8px;font-size:12px;color:#6b7280;">
  Vill ni inte få fler mejl från oss? <a href="${safeUnsub}" style="color:#6b7280;text-decoration:underline;">Avregistrera er här</a>.
</p>
<p style="margin:0;font-size:12px;color:#6b7280;">
  Ni får detta mejl som offentlig cykelverkstad i vårt lokala nätverk. Rättelse eller radering: info@cykelhjalpen.se.
</p>
</td></tr></table>
</td></tr></table>
</body></html>`

  return { subject, text, html }
}
