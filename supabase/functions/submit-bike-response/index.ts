// Skickar ett sparat offertutkast till kunden – helt utan betalning.
// I betala-vid-vinst-modellen kostar det inget att svara; avgiften tas först
// ut när kunden väljer verkstaden som vinnare (se select-bike-winner).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { notifyCustomerOfNewResponse } from '../_shared/customer-response.ts'
import { sendAdminAlert } from '../_shared/admin-alert.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'

const BodySchema = z.object({ response_id: z.string().uuid() })

const friendlyDatabaseError = (message: string) => {
  if (message.includes('bike_request_full')) return 'Ärendet är fullt – tre verkstäder har redan svarat.'
  if (message.includes('response_not_found')) return 'Offerten hittades inte.'
  if (message.includes('workshop_not_approved')) return 'Verkstaden är inte godkänd ännu.'
  return message
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoden stöds inte.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Du behöver logga in')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Backend configuration is missing')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Du behöver logga in igen')

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) throw new Error('Ogiltigt offert-id')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved, company_name, city')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) throw new Error('Verkstaden är inte godkänd ännu')

    const { data: response, error: responseError } = await admin
      .from('workshop_responses')
      .select('id, request_id, workshop_id, paid, status, estimated_price_min, estimated_price_max')
      .eq('id', parsed.data.response_id)
      .maybeSingle()
    if (responseError) throw responseError
    if (!response || response.workshop_id !== workshop.id) throw new Error('Offerten hittades inte')

    // Idempotent: redan skickade svar rapporteras som klara utan ny notis.
    if (response.status === 'sent' || response.status === 'won') {
      return new Response(JSON.stringify({ ok: true, already_sent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }
    if (response.status === 'lost') throw new Error('Kunden har redan valt en annan verkstad för det här ärendet.')

    // Ärendet måste fortfarande vara öppet och i verkstadens stad.
    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, status, admin_status, city, created_at, approved_at')
      .eq('id', response.request_id)
      .maybeSingle()
    if (requestError) throw requestError
    if (!request) throw new Error('Ärendet hittades inte')
    if (request.admin_status !== 'approved') throw new Error('Ärendet är inte publicerat ännu.')
    if (request.city !== workshop.city) throw new Error('Ärendet ligger inte i din stad.')
    if (request.status === 'completed') throw new Error('Kunden har redan valt en verkstad för det här ärendet.')
    if (request.status !== 'new' && request.status !== 'has_offers') {
      throw new Error('Ärendet är fullt – tre verkstäder har redan svarat.')
    }

    // Triggern enforce_bike_response_sent_limit stoppar det fjärde svaret även
    // om flera verkstäder skickar samtidigt.
    const { error: updateError } = await admin
      .from('workshop_responses')
      .update({ status: 'sent' })
      .eq('id', response.id)
      .in('status', ['draft', 'pending_payment'])
    if (updateError) throw new Error(friendlyDatabaseError(updateError.message))

    // V2 data-moat (S6): quote.sent + workshop.first_quote, best-effort and
    // flag-gated inside the helper. No PII in payloads (contract §4).
    const citySlug = citySlugFromName(request.city ?? '')
    const openAt = Date.parse((request.approved_at as string | null) || request.created_at)
    const responseTimeHours = Number.isFinite(openAt)
      ? Math.round(Math.max(0, (Date.now() - openAt) / 3_600_000) * 100) / 100
      : null
    const eventTasks: Promise<unknown>[] = [emitDomainEvent(admin, {
      eventName: 'quote.sent',
      actorType: 'workshop',
      actorId: userData.user.id,
      citySlug,
      requestId: response.request_id,
      workshopId: workshop.id,
      responseId: response.id,
      payload: {
        city_slug: citySlug,
        price_min: response.estimated_price_min ?? null,
        price_max: response.estimated_price_max ?? null,
        response_time_hours: responseTimeHours,
      },
    })]
    // First quote ever from this workshop → onboarding milestone event.
    eventTasks.push((async () => {
      const { count } = await admin
        .from('workshop_responses')
        .select('id', { count: 'exact', head: true })
        .eq('workshop_id', workshop.id)
        .in('status', ['sent', 'won', 'lost'])
      if ((count ?? 0) <= 1) {
        await emitDomainEvent(admin, {
          eventName: 'workshop.first_quote',
          actorType: 'workshop',
          actorId: userData.user.id,
          citySlug,
          workshopId: workshop.id,
          responseId: response.id,
          payload: { city_slug: citySlug },
        })
      }
    })())

    // Notifiera kunden om det nya svaret – mejl + SMS, idempotent per svar.
    const notifyTask = notifyCustomerOfNewResponse(admin, {
      supabaseUrl,
      serviceRoleKey,
      requestId: response.request_id,
      responseId: response.id,
      workshopName: workshop.company_name,
    }).catch((notifyError) => console.error('Customer notification failed', notifyError))

    // E-postnotis till admin om den nya offerten.
    const adminAlertTask = sendAdminAlert({
      supabaseUrl,
      serviceRoleKey,
      subject: `Ny offert från ${workshop.company_name} (${workshop.city})`,
      heading: 'Ny offert skickad till kund',
      rows: [
        ['Verkstad', workshop.company_name],
        ['Stad', workshop.city],
        ['Ärende-ID', response.request_id],
      ],
      ctaUrl: 'https://cykelhjalpen.se/admin/offerter',
      ctaLabel: 'Se offerten',
    })

    const edgeRuntime = (globalThis as any).EdgeRuntime
    const backgroundTasks = [notifyTask, adminAlertTask, ...eventTasks]
    if (edgeRuntime?.waitUntil) {
      for (const task of backgroundTasks) edgeRuntime.waitUntil(task)
    } else {
      await Promise.all(backgroundTasks)
    }



    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Okänt fel'
    const message = friendlyDatabaseError(rawMessage)
    console.error('submit-bike-response', rawMessage)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
