// Skickar mejl från adminportalen som info@cykelhjalpen.se – både svar på
// inkommande mejl (med tråd-headers) och helt nya mejl. Kräver inloggad admin.
// Skickade mejl sparas i sent_emails och loggas som outreach-aktivitet om de
// gäller ett prospekt.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const FROM_EMAIL = 'Christoffer på Cykelhjälpen <info@cykelhjalpen.se>'
const REPLY_TO = 'info@cykelhjalpen.se'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const payloadSchema = z.object({
  to: z.string().email().max(320),
  subject: z.string().trim().min(1, 'Ämne krävs').max(200),
  message: z.string().trim().min(1, 'Meddelande krävs').max(20000),
  inReplyToInboundId: z.string().uuid().optional(),
  prospectId: z.string().uuid().optional(),
})

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const buildHtml = (message: string): string =>
  `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111827">${
    escapeHtml(message).replace(/\n/g, '<br>')
  }</div>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'unauthenticated' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) return json({ error: 'unauthenticated' }, 401)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) return json({ error: 'email_not_configured' }, 500)

    const parsed = payloadSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, 400)
    }
    const { to, subject, message, inReplyToInboundId, prospectId } = parsed.data
    const normalizedTo = to.trim().toLowerCase()

    // Tråd-headers vid svar på ett inkommande mejl.
    let threadHeaders: Record<string, string> | undefined
    if (inReplyToInboundId) {
      const { data: inbound } = await admin.from('inbound_emails').select('id, message_id')
        .eq('id', inReplyToInboundId).maybeSingle()
      if (inbound?.message_id) {
        threadHeaders = { 'In-Reply-To': inbound.message_id, 'References': inbound.message_id }
      }
    }

    const text = message
    const html = buildHtml(message)
    const body: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [normalizedTo],
      reply_to: REPLY_TO,
      subject,
      text,
      html,
    }
    if (threadHeaders) body.headers = threadHeaders

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const resData = await res.json().catch(() => ({})) as { id?: string; message?: string }

    if (!res.ok) {
      console.error('Resend-fel vid utskick från portalen', res.status, resData)
      await admin.from('sent_emails').insert({
        to_emails: [normalizedTo],
        subject,
        text_body: text,
        html_body: html,
        in_reply_to: inReplyToInboundId ?? null,
        prospect_id: prospectId ?? null,
        status: 'failed',
        error: `HTTP ${res.status}: ${(resData.message || '').slice(0, 300)}`,
        created_by: userData.user.id,
      })
      return json({ error: resData.message || `Utskick misslyckades (${res.status})` }, 502)
    }

    const { error: storeError } = await admin.from('sent_emails').insert({
      to_emails: [normalizedTo],
      subject,
      text_body: text,
      html_body: html,
      in_reply_to: inReplyToInboundId ?? null,
      prospect_id: prospectId ?? null,
      resend_email_id: resData.id ?? null,
      status: 'sent',
      created_by: userData.user.id,
    })
    if (storeError) console.error('Kunde inte spara skickat mejl', storeError.message)

    if (inReplyToInboundId) {
      await admin.from('inbound_emails').update({ replied_at: new Date().toISOString() })
        .eq('id', inReplyToInboundId)
    }

    if (prospectId) {
      try {
        await admin.from('outreach_activities').insert({
          prospect_id: prospectId,
          channel: 'email',
          direction: 'outbound',
          status: 'sent',
          kind: 'reply',
          subject,
          message: text.slice(0, 4000),
          recipient: normalizedTo,
          performed_by: userData.user.id,
          sent_at: new Date().toISOString(),
        })
      } catch (activityError) {
        console.error('Aktivitetsloggning misslyckades', (activityError as Error).message)
      }
    }

    return json({ success: true, id: resData.id ?? null })
  } catch (error) {
    console.error('admin-send-email error:', error)
    return json({ error: error instanceof Error ? error.message : 'Okänt fel' }, 500)
  }
})
