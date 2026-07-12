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

    // Global dagskvot (UTC)
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const { count: sentToday } = await admin
      .from('outreach_activities')
      .select('id', { count: 'exact', head: true })
      .eq('channel', 'email')
      .in('status', ['sent', 'sending'])
      .gte('sent_at', startOfDay.toISOString())
    if ((sentToday || 0) >= OUTREACH_DAILY_CAP) {
      throw new Error(`Dagskvoten på ${OUTREACH_DAILY_CAP} rekryteringsmejl per dygn är nådd.`)
    }

    // Atomiskt lås – kräver att statusen fortfarande är approved
    const idempotencyKey = `outreach:${activity.id}`
    const { data: locked, error: lockErr } = await admin
      .from('outreach_activities')
      .update({
        status: 'sending',
        send_lock_at: new Date().toISOString(),
        sent_by: userData.user.id,
        provider: 'resend',
        idempotency_key: idempotencyKey,
        error: null,
      })
      .eq('id', activity.id)
      .eq('status', 'approved')
      .select('*')
      .maybeSingle()
    if (lockErr) throw lockErr
    if (!locked) throw new Error('Utkastet är redan låst för sändning eller ändrat.')

    // Bygg alltid färsk HTML/text för att garantera unsubscribe + escapning
    const draft = buildEmailDraft({
      company_name: prospect.company_name,
      city: prospect.city,
      website: prospect.website,
      ai_summary: prospect.ai_summary,
      services: prospect.services,
      unsubscribe_token: prospect.unsubscribe_token,
    })
    const subject = (activity.subject && activity.subject.trim().length > 0) ? activity.subject : draft.subject

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
