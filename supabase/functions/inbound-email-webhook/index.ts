// Tar emot Resends inbound-webhook (email.received) för mejl till
// info@cykelhjalpen.se. Verifierar Svix-signaturen, hämtar mejlkroppen via
// Resend-gatewayn, lagrar i inbound_emails, länkar till prospekt och
// notifierar admins. Publik (verify_jwt=false) men kräver giltig signatur.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendInAppNotifications } from '../_shared/notifications.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const b64ToBytes = (b64: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
const bytesToB64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes))

const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Verifiering enligt Svix-standarden som Resend använder:
// signatur = base64(HMAC-SHA256(secret, "<svix-id>.<svix-timestamp>.<rå body>"))
const verifySvixSignature = async (
  secret: string, msgId: string, timestamp: string, rawBody: string, signatureHeader: string,
): Promise<boolean> => {
  const ts = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false
  const secretBytes = b64ToBytes(secret.replace(/^whsec_/, ''))
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${msgId}.${timestamp}.${rawBody}`))
  const expected = bytesToB64(new Uint8Array(signed))
  return signatureHeader.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    return version === 'v1' && Boolean(sig) && safeEqual(sig, expected)
  })
}

// "Företag AB <info@foretag.se>" -> { name: 'Företag AB', email: 'info@foretag.se' }
const parseFromHeader = (raw: string): { name: string | null; email: string } => {
  const match = raw.match(/^\s*(?:"([^"]+)"|([^<]*?))\s*<([^>]+)>\s*$/)
  if (match) {
    const name = (match[1] || match[2] || '').trim()
    return { name: name || null, email: match[3].trim().toLowerCase() }
  }
  return { name: null, email: raw.trim().toLowerCase() }
}

// Resend returnerar headers antingen som objekt eller som [{name,value}]
const normalizeHeaders = (headers: unknown): Record<string, string> => {
  if (Array.isArray(headers)) {
    const out: Record<string, string> = {}
    for (const h of headers) {
      if (h && typeof h === 'object') {
        const rec = h as Record<string, unknown>
        if (typeof rec.name === 'string' && typeof rec.value === 'string') out[rec.name.toLowerCase()] = rec.value
      }
    }
    return out
  }
  if (headers && typeof headers === 'object') {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (typeof v === 'string') out[k.toLowerCase()] = v
    }
    return out
  }
  return {}
}

const htmlToText = (html: string): string =>
  html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method === 'GET' || req.method === 'HEAD') {
    return json({ ok: true, version: '2026-08-01-inbox' }, 405)
  }

  // Fail-closed: utan konfigurerad hemlighet accepterar vi inga webhooks.
  if (!WEBHOOK_SECRET) {
    console.error('RESEND_WEBHOOK_SECRET saknas')
    return json({ error: 'webhook_not_configured' }, 500)
  }

  const rawBody = await req.text()
  const svixId = req.headers.get('svix-id') || ''
  const svixTimestamp = req.headers.get('svix-timestamp') || ''
  const svixSignature = req.headers.get('svix-signature') || ''
  if (!svixId || !svixTimestamp || !svixSignature) return json({ error: 'missing_signature' }, 401)

  const valid = await verifySvixSignature(WEBHOOK_SECRET, svixId, svixTimestamp, rawBody, svixSignature)
  if (!valid) return json({ error: 'invalid_signature' }, 401)

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (event.type !== 'email.received') return json({ ok: true, ignored: event.type || 'unknown' })

  const data = event.data || {}
  const resendEmailId = typeof data.email_id === 'string' ? data.email_id : null
  const fromRaw = typeof data.from === 'string' ? data.from : ''
  const { name: fromName, email: fromEmail } = parseFromHeader(fromRaw)
  const toEmails = Array.isArray(data.to) ? data.to.filter((t): t is string => typeof t === 'string') : []
  const subject = typeof data.subject === 'string' ? data.subject : null
  const messageId = typeof data.message_id === 'string' ? data.message_id : null
  if (!fromEmail) return json({ ok: true, ignored: 'no_from' })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Idempotens: samma Resend-mejl lagras bara en gång.
  if (resendEmailId) {
    const { data: existing } = await admin.from('inbound_emails').select('id')
      .eq('resend_email_id', resendEmailId).maybeSingle()
    if (existing) return json({ ok: true, duplicate: true })
  }

  // Hämta full mejlkropp via Resend-gatewayn (bästa försökan – mejlet lagras ändå).
  let textBody: string | null = null
  let htmlBody: string | null = null
  let headers: Record<string, string> = {}
  if (resendEmailId && LOVABLE_API_KEY && RESEND_API_KEY) {
    try {
      const res = await fetch(`${GATEWAY_URL}/emails/receiving/${resendEmailId}`, {
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const full = await res.json() as Record<string, unknown>
        textBody = typeof full.text === 'string' ? full.text : null
        htmlBody = typeof full.html === 'string' ? full.html : null
        headers = normalizeHeaders(full.headers)
      } else {
        console.error('Hämtning av mejlkropp misslyckades', res.status, (await res.text()).slice(0, 200))
      }
    } catch (fetchError) {
      console.error('Kunde inte hämta mejlkropp', (fetchError as Error).message)
    }
  }
  if (!textBody && htmlBody) textBody = htmlToText(htmlBody)

  // Koppla till prospekt via avsändaradressen.
  const { data: prospect } = await admin.from('workshop_prospects').select('id, status')
    .ilike('email', fromEmail).maybeSingle()

  const { data: inserted, error: insertError } = await admin.from('inbound_emails').insert({
    resend_email_id: resendEmailId,
    message_id: messageId,
    from_email: fromEmail,
    from_name: fromName,
    to_emails: toEmails,
    subject,
    text_body: textBody,
    html_body: htmlBody,
    headers,
    raw: data,
    prospect_id: prospect?.id ?? null,
  }).select('id').single()

  if (insertError) {
    // Unik-konflikt = dublettleverans från Resend – svara ok ändå.
    if (insertError.code === '23505') return json({ ok: true, duplicate: true })
    console.error('Kunde inte lagra inkommande mejl', insertError.message)
    return json({ error: 'store_failed' }, 500)
  }

  // Om avsändaren är ett kontaktat prospekt: markera som svarat och logga aktiviteten.
  if (prospect) {
    try {
      await admin.from('outreach_activities').insert({
        prospect_id: prospect.id,
        channel: 'email',
        direction: 'inbound',
        status: 'replied',
        kind: 'reply',
        subject,
        message: (textBody || '(mejl utan textinnehåll)').slice(0, 4000),
        recipient: fromEmail,
      })
      await admin.from('outreach_activities').update({ status: 'replied' })
        .eq('prospect_id', prospect.id).eq('direction', 'outbound').eq('status', 'sent')
      if (prospect.status === 'contacted') {
        await admin.from('workshop_prospects').update({ status: 'replied' }).eq('id', prospect.id)
      }
    } catch (linkError) {
      console.error('Prospektkoppling misslyckades', (linkError as Error).message)
    }
  }

  // Notifiera admins i portalen (idempotent per Resend-mejl).
  try {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin')
    const rows = (admins || []).map((row) => ({
      user_id: row.id as string,
      type: 'inbound_email',
      title: `Nytt mejl: ${subject || '(utan ämne)'}`,
      message: `Från ${fromName || fromEmail}${prospect ? ' · prospekt' : ''}`,
      link: '/admin/mejl',
    }))
    await sendInAppNotifications(admin, rows, `inbound_email:${resendEmailId || inserted?.id || crypto.randomUUID()}`)
  } catch (notifyError) {
    console.error('Admin-notis misslyckades', (notifyError as Error).message)
  }

  return json({ ok: true, id: inserted?.id ?? null, prospect: Boolean(prospect) })
})
