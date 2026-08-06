// Skickar ett sparat offertutkast till kunden – helt utan betalning.
// I betala-vid-vinst-modellen kostar det inget att svara; avgiften tas först
// ut när kunden väljer verkstaden som vinnare (se select-bike-winner).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { notifyCustomerOfNewResponse } from '../_shared/customer-response.ts'

// Stödjer två former:
//  1. { response_id }                       – skickar ett redan sparat utkast (bakåtkompatibelt)
//  2. { request_id, message, ... }          – skapar OCH skickar offerten i ett enda anrop
const QuoteSchema = z.object({
  request_id: z.string().uuid(),
  message: z.string().trim().min(20, 'Beskriv ditt svar lite mer, minst tjugo tecken.').max(4000),
  estimated_price_min: z.number().int().min(0).max(1000000).nullable().optional(),
  estimated_price_max: z.number().int().min(0).max(1000000).nullable().optional(),
  estimated_time: z.string().trim().max(200).nullable().optional(),
  can_pickup: z.boolean().optional(),
})
const BodySchema = z.union([z.object({ response_id: z.string().uuid() }), QuoteSchema])


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
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || 'Ogiltiga uppgifter i offerten.')
    }
    const body = parsed.data

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved, company_name, city')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) throw new Error('Verkstaden är inte godkänd ännu')

    type ResponseRow = { id: string; request_id: string; workshop_id: string; paid: boolean; status: string }
    let response: ResponseRow | null = null

    if ('response_id' in body) {
      const { data, error: responseError } = await admin
        .from('workshop_responses')
        .select('id, request_id, workshop_id, paid, status')
        .eq('id', body.response_id)
        .maybeSingle()
      if (responseError) throw responseError
      response = (data as ResponseRow | null)
      if (!response || response.workshop_id !== workshop.id) throw new Error('Offerten hittades inte')
    } else {
      const priceMin = body.estimated_price_min ?? null
      const priceMax = body.estimated_price_max ?? null
      if (priceMin !== null && priceMax !== null && priceMax < priceMin) {
        throw new Error('Pris till måste vara samma som eller högre än pris från.')
      }

      const fields = {
        message: body.message,
        estimated_price_min: priceMin,
        estimated_price_max: priceMax,
        estimated_time: body.estimated_time || null,
        can_pickup: body.can_pickup ?? false,
      }

      // Ett svar per verkstad och ärende – återanvänd eventuellt utkast.
      const { data: existing, error: existingError } = await admin
        .from('workshop_responses')
        .select('id, request_id, workshop_id, paid, status')
        .eq('request_id', body.request_id)
        .eq('workshop_id', workshop.id)
        .maybeSingle()
      if (existingError) throw existingError

      if (existing) {
        response = existing as ResponseRow
        if (response.status !== 'sent' && response.status !== 'won' && response.status !== 'lost') {
          const { error: fieldsError } = await admin
            .from('workshop_responses')
            .update(fields)
            .eq('id', response.id)
          if (fieldsError) throw new Error(friendlyDatabaseError(fieldsError.message))
        }
      } else {
        const { data: created, error: createError } = await admin
          .from('workshop_responses')
          .insert({ ...fields, request_id: body.request_id, workshop_id: workshop.id, status: 'draft' })
          .select('id, request_id, workshop_id, paid, status')
          .single()
        if (createError) throw new Error(friendlyDatabaseError(createError.message))
        response = created as ResponseRow
      }
    }

    // Idempotent: redan skickade svar rapporteras som klara utan ny notis.
    if (response.status === 'sent' || response.status === 'won') {
      return new Response(JSON.stringify({ ok: true, already_sent: true, response_id: response.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }
    if (response.status === 'lost') throw new Error('Kunden har redan valt en annan verkstad för det här ärendet.')


    // Ärendet måste fortfarande vara öppet och i verkstadens stad.
    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, status, admin_status, city')
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

    // Notifiera kunden om det nya svaret – mejl + SMS, idempotent per svar.
    const notifyTask = notifyCustomerOfNewResponse(admin, {
      supabaseUrl,
      serviceRoleKey,
      requestId: response.request_id,
      responseId: response.id,
      workshopName: workshop.company_name,
    }).catch((notifyError) => console.error('Customer notification failed', notifyError))

    const edgeRuntime = (globalThis as any).EdgeRuntime
    if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(notifyTask)
    else await notifyTask

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
