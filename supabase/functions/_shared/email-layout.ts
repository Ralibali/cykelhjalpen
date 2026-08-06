// Gemensam varumärkesmall för alla utgående mejl från Cykelhjälpen.
// Wrappern körs centralt i send-transactional-email så att varje mejl får
// samma header, typografi och footer utan att varje funktion behöver ändras.

const BRAND = '#4338CA'
const INK = '#111827'
const MUTED = '#6B7280'
const BORDER = '#E5E7EB'
const SOFT = '#F5F5F7'

/** Plockar bort gamla inline-wrappers så vi inte får dubbla ramar. */
const stripLegacyWrapper = (html: string) => {
  const trimmed = html.trim()
  const match = trimmed.match(/^<div style="font-family:Arial[^"]*">([\s\S]*)<\/div>$/)
  return (match ? match[1] : trimmed)
    // Gammal teal-knappfärg → varumärkesfärg
    .replaceAll('#157A6E', BRAND)
}

export const renderBrandedEmail = (rawHtml: string, subject = 'Cykelhjälpen') => {
  const content = stripLegacyWrapper(rawHtml)
  const preheader = subject.replace(/[<>]/g, '')

  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${preheader}</title>
  </head>
  <body style="margin:0;padding:0;background:${SOFT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:18px;overflow:hidden">
            <tr>
              <td style="background:${BRAND};padding:22px 28px">
                <span style="font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">
                  Cykelhjälpen
                </span>
                <span style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#DDD6FE;float:right;padding-top:4px">
                  Cykelverkstäder som svarar
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${INK}">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid ${BORDER};padding:20px 28px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED}">
                <p style="margin:0 0 6px">
                  <a href="https://cykelhjalpen.se" style="color:${BRAND};text-decoration:none;font-weight:600">cykelhjalpen.se</a>
                  &nbsp;·&nbsp;
                  <a href="mailto:info@cykelhjalpen.se" style="color:${MUTED};text-decoration:none">info@cykelhjalpen.se</a>
                </p>
                <p style="margin:0">Du får detta mejl för att du använder Cykelhjälpen. Svara gärna direkt på mejlet om du har frågor.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
