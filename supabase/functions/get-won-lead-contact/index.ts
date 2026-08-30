// Låser upp kundens kontaktuppgifter för den vinnande verkstaden – först när
// vinstavgiften är betald (eller reglerad med gratis-lead). Det är den här
// spärren som gör betala-vid-vinst-modellen säker.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { getEffectivePricing } from '../_shared/v2/pricing-config.ts'

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
      .select('id, approved')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) throw new Error('Verkstaden är inte godkänd ännu')

    const { data: response, error: responseError } = await admin
      .from('workshop_responses')
      .select('id, request_id, workshop_id, paid, status')
      .eq('id', parsed.data.response_id)
      .maybeSingle()
    if (responseError) throw responseError
    if (!response || response.workshop_id !== workshop.id) throw new Error('Offerten hittades inte')
    if (response.status !== 'won') throw new Error('Kunden har inte valt er för det här ärendet.')
    if (!response.paid) {
      // Canonical pricing (contract §2.1): same value whether read from the
      // config table or the compile-time live rule — the fee shown here always
      // matches what create-winner-payment charges.
      const pricing = await getEffectivePricing(admin)
      throw new Error(`Betala vinstavgiften (${pricing.amountOre / 100} kr exkl. moms) för att låsa upp kontaktuppgifterna.`)
    }

    const { data: request, error: requestError } = await admin
      .from('bike_repair_requests')
      .select('customer_name, customer_email, customer_phone, bike_type, repair_category, description, area, postcode, urgency, customer_language')
      .eq('id', response.request_id)
      .maybeSingle()
    if (requestError) throw requestError
    if (!request) throw new Error('Ärendet hittades inte')

    return new Response(JSON.stringify({ contact: request }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('get-won-lead-contact', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
