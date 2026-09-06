// Skickar ett sparat offertutkast till kunden – helt utan betalning.
// I betala-vid-vinst-modellen kostar det inget att svara; avgiften tas först
// ut när kunden väljer verkstaden som vinnare (se select-bike-winner).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import {
  friendlyDatabaseError,
  sendExistingWorkshopResponse,
} from '../_shared/send-workshop-quote.ts'

const BodySchema = z.object({ response_id: z.string().uuid() })

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
      .select('id, approved, company_name, city, user_id')
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

    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('id, status, admin_status, city, created_at, approved_at')
      .eq('id', response.request_id)
      .maybeSingle()
    if (requestError) throw requestError

    const result = await sendExistingWorkshopResponse({
      admin,
      supabaseUrl,
      serviceRoleKey,
      workshop,
      request,
      response,
      actorUserId: userData.user.id,
      requireSameCity: true,
    })

    return new Response(JSON.stringify(result), {
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
