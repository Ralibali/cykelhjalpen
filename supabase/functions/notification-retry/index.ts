// Admin-only retry för notification_events. Skickar inga riktiga SMS eller mejl –
// för in-app-notiser återinsätts raden i `notifications` (om det saknas).
// För SMS/email loggas ett nytt försök men provider-anrop utförs endast om
// credentials finns; annars markeras eventet som 'skipped'.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { logNotificationEvent, logSmsAttempt } from '../_shared/notifications.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('unauthenticated')

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) throw new Error('unauthenticated')

    const { data: profile } = await admin
      .from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') throw new Error('forbidden')

    const body = await req.json().catch(() => ({}))
    const eventId = body?.event_id as string | undefined
    if (!eventId || typeof eventId !== 'string') throw new Error('event_id krävs')

    const { data: event, error: eventError } = await admin
      .from('notification_events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()
    if (eventError) throw eventError
    if (!event) throw new Error('Händelsen hittades inte')
    if (event.status === 'sent') {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'already_sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Markera som retrying så UI syns direkt
    await admin.from('notification_events').update({
      status: 'retrying',
      attempts: (event.attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      error: null,
    }).eq('id', eventId)

    if (event.channel === 'in_app') {
      const payload = (event.payload || {}) as Record<string, unknown>
      const { error: insertError } = await admin.from('notifications').insert({
        user_id: event.recipient,
        type: (payload.type as string) || 'notification',
        title: (payload.title as string) || 'Notis',
        message: (payload.message as string | null) ?? null,
        link: (payload.link as string | null) ?? null,
      })
      await admin.from('notification_events').update({
        status: insertError ? 'failed' : 'sent',
        error: insertError ? insertError.message : null,
      }).eq('id', eventId)
      if (insertError) throw insertError

    } else if (event.channel === 'sms') {
      const payload = (event.payload || {}) as Record<string, unknown>
      const result = await logSmsAttempt(admin, {
        to: event.recipient,
        message: (payload.message as string) || '',
        from: payload.from as string | undefined,
        idempotencyKey: `retry:${eventId}:${(event.attempts || 0) + 1}`,
        reason: (payload.reason as string) || 'manual_retry',
      })
      await admin.from('notification_events').update({
        status: result.status === 'pending' ? 'pending' : 'skipped',
      }).eq('id', eventId)

    } else {
      // email eller okänd kanal – logga endast, inget externt
      await logNotificationEvent(admin, {
        channel: event.channel,
        provider: event.provider,
        recipient: event.recipient,
        idempotencyKey: `retry:${eventId}:${(event.attempts || 0) + 1}`,
        status: 'skipped',
        payload: event.payload || {},
        error: 'retry_not_supported_for_channel',
      })
      await admin.from('notification_events').update({
        status: 'skipped',
        error: 'retry_not_supported_for_channel',
      }).eq('id', eventId)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    const status = message === 'unauthenticated' ? 401 : message === 'forbidden' ? 403 : 400
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
