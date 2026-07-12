// Admin-only skarpt e-postutskick via Resend för verkstadsrekrytering.
// Kräver uttryckligt { activity_id, confirm_send: true }. Ingen bulk-sändning.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  buildEditedEmail,
  buildEmailDraft,
  OUTREACH_DAILY_CAP,
  OUTREACH_FROM,
  OUTREACH_MIN_DAYS_BETWEEN_CONTACT,
  OUTREACH_REPLY_TO,
  oneClickUnsubscribeUrl,
  unsubscribeUrl,
} from '../_shared/outreach.ts'
import { looksLikeBusinessEmail } from '../_shared/prospect.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

interface Body {
  activity_id: string
  confirm_send: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error('Resend är inte anslutet – saknar API-nyckel.')
    }
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('unauthenticated')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) throw new Error('unauthenticated')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') throw new Error('forbidden')

    const body = await req.json() as Body
    if (!body?.activity_id || body.confirm_send !== true) {
      throw new Error('activity_id och confirm_send:true krävs')
    }

    // Hämta aktivitet + prospekt
    const { data: activity, error: actErr } = await admin
      .from('outreach_activities').select('*').eq('id', body.activity_id).maybeSingle()
    if (actErr) throw actErr
    if (!activity) throw new Error('Utkastet hittades inte')
    if (activity.channel !== 'email') throw new Error('Endast e-post kan skickas skarpt just nu.')
    if (activity.status !== 'approved') throw new Error(`Utkastet är inte godkänt (status: ${activity.status}).`)

    const { data: prospect, error: prospErr } = await admin
      .from('workshop_prospects').select('*').eq('id', activity.prospect_id).maybeSingle()
    if (prospErr) throw prospErr
    if (!prospect) throw new Error('Prospekt hittades inte')
    if (prospect.do_not_contact) throw new Error('Prospektet är markerat som do-not-contact.')
    if (prospect.status !== 'approved_for_contact' && prospect.status !== 'contacted') {
      throw new Error(`Prospektet har fel status: ${prospect.status}.`)
    }

    // Mottagaren MÅSTE vara publikt företagsmejl
    if (!looksLikeBusinessEmail(activity.recipient) || !looksLikeBusinessEmail(prospect.normalized_email)) {
      throw new Error('Mottagaren är inte klassad som publikt företagsmejl – blockerat.')
    }

    // Suppression
    const { data: suppressed } = await admin
      .from('contact_suppression')
      .select('id, contact_type, value')
      .in('value', [prospect.normalized_email, prospect.normalized_domain].filter(Boolean) as string[])
    if (suppressed && suppressed.length > 0) {
      throw new Error('Mottagarens e-post eller domän finns i suppression-listan.')
    }

    // 30-dagars kontaktcooldown per prospekt
    if (prospect.last_contacted_at) {
      const daysSince = (Date.now() - new Date(prospect.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < OUTREACH_MIN_DAYS_BETWEEN_CONTACT) {
        throw new Error(`Prospektet kontaktades senast för ${Math.round(daysSince)} dagar sedan – minst ${OUTREACH_MIN_DAYS_BETWEEN_CONTACT} dagar krävs mellan mejl.`)
      }
    }

    // (Dagskvot + atomiskt lås görs i RPC:n nedan.)

    // Atomiskt reservera plats: RPC håller advisory lock, kontrollerar dagskvot
    // och byter status approved/failed -> sending. Retry efter failed hanteras här.
    const { data: reserved, error: rpcErr } = await admin.rpc('reserve_outreach_send_slot', {
      _activity_id: activity.id,
      _cap: OUTREACH_DAILY_CAP,
      _sender: userData.user.id,
    })
    if (rpcErr) {
      const raw = (rpcErr as { message?: string })?.message || ''
      if (raw.includes('daily_cap_reached')) {
        throw new Error(`Dagskvoten på ${OUTREACH_DAILY_CAP} rekryteringsmejl per dygn är nådd.`)
      }
      throw new Error(`Kunde inte reservera utskicksplats: ${raw}`)
    }
    const locked = Array.isArray(reserved) ? reserved[0] : reserved
    if (!locked) {
      throw new Error('Utkastet är redan låst för sändning eller inte i status approved/failed.')
    }
    const idempotencyKey = locked.idempotency_key as string

    // Bygg brödtext från admin-godkänd text; fall tillbaka till standardmall om saknas.
    const approvedMessage = (locked.message ?? activity.message ?? '').toString().trim()
    let subject = (locked.subject ?? activity.subject ?? '').toString().trim()
    let text: string
    let html: string
    if (approvedMessage.length > 0) {
      const rendered = buildEditedEmail({ unsubscribe_token: prospect.unsubscribe_token }, approvedMessage)
      text = rendered.text
      html = rendered.html
      if (!subject) {
        subject = `Kundförfrågningar från cykelägare i ${prospect.city}`
      }
    } else {
      const draft = buildEmailDraft({
        company_name: prospect.company_name,
        city: prospect.city,
        website: prospect.website,
        ai_summary: prospect.ai_summary,
        services: prospect.services,
        unsubscribe_token: prospect.unsubscribe_token,
      })
      text = draft.text
      html = draft.html
      if (!subject) subject = draft.subject
    }

    const oneClickUrl = oneClickUnsubscribeUrl(SUPABASE_URL, prospect.unsubscribe_token)
    const humanUnsubUrl = unsubscribeUrl(prospect.unsubscribe_token)

    // Skicka via Resend genom Lovable gateway
    let resendResponse: Response
    try {
      resendResponse = await fetch(`${GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY!,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: OUTREACH_FROM,
          to: [activity.recipient],
          reply_to: OUTREACH_REPLY_TO,
          subject,
          text: draft.text,
          html: draft.html,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl(prospect.unsubscribe_token)}>, <mailto:info@cykelhjalpen.se?subject=Avregistrera>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          tags: [
            { name: 'category', value: 'workshop_outreach' },
            { name: 'city', value: prospect.city },
          ],
        }),
      })
    } catch (fetchError) {
      await admin.from('outreach_activities').update({
        status: 'failed',
        error: `Nätverksfel mot Resend: ${(fetchError as Error).message}`,
      }).eq('id', locked.id)
      throw fetchError
    }

    if (!resendResponse.ok) {
      const errText = await resendResponse.text()
      await admin.from('outreach_activities').update({
        status: 'failed',
        error: `Resend [${resendResponse.status}]: ${errText.slice(0, 500)}`,
        retry_count: (locked.retry_count || 0) + 1,
      }).eq('id', locked.id)
      return new Response(JSON.stringify({ error: 'Resend refused', status: resendResponse.status, details: errText }), {
        status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const providerBody = await resendResponse.json().catch(() => ({})) as { id?: string }
    const providerMessageId = providerBody?.id ?? null

    const sentAt = new Date().toISOString()
    await admin.from('outreach_activities').update({
      status: 'sent',
      sent_at: sentAt,
      provider_message_id: providerMessageId,
    }).eq('id', locked.id)

    await admin.from('workshop_prospects').update({
      status: 'contacted',
      last_contacted_at: sentAt,
      contact_count: (prospect.contact_count || 0) + 1,
    }).eq('id', prospect.id)

    // Logga i notification_events för spårbarhet
    await admin.from('notification_events').insert({
      channel: 'email',
      provider: 'resend',
      recipient: activity.recipient,
      status: 'sent',
      idempotency_key: idempotencyKey,
      attempts: 1,
      payload: { activity_id: locked.id, prospect_id: prospect.id, subject },
      sent_at: sentAt,
    }).select().maybeSingle().catch(() => null)

    return new Response(JSON.stringify({ ok: true, provider_message_id: providerMessageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    const status = message === 'unauthenticated' ? 401 : message === 'forbidden' ? 403 : 400
    console.error('prospect-send-outreach', message)
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
