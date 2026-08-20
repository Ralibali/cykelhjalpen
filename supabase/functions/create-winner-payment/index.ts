// Vinnande verkstad betalar vinstavgiften (50 kr exkl. moms) för att låsa upp
// kundens kontaktuppgifter. Skapar en Stripe Checkout-session för ett svar som
// redan är 'won' men ännu inte betalat.
import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { LEAD_FEE_ORE } from '../_shared/pricing.ts'
import { allowedPublicOrigin, corsFor } from '../_shared/cors.ts'

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
      .select('id, approved, company_name, stripe_customer_id, email')
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
    if (response.status !== 'won') throw new Error('Endast vinnande offerter kan betalas.')
    if (response.paid) throw new Error('Vinstavgiften är redan betald.')

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) throw new Error('Stripe är inte konfigurerat')
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

    const origin = allowedPublicOrigin(req.headers.get('origin'))

    // Återanvänd en öppen Checkout-session om en redan finns för svaret.
    const { data: pendingCharges, error: pendingError } = await admin
      .from('lead_charges')
      .select('id, stripe_session_id')
      .eq('response_id', response.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)
    if (pendingError) throw pendingError

    let reusableUrl: string | null = null
    for (const charge of pendingCharges || []) {
      if (!charge.stripe_session_id) {
        await admin.from('lead_charges').update({ status: 'expired' }).eq('id', charge.id)
        continue
      }

      try {
        const previousSession = await stripe.checkout.sessions.retrieve(charge.stripe_session_id)
        if (previousSession.status === 'complete' && previousSession.payment_status === 'paid') {
          throw new Error('Betalningen behandlas redan. Uppdatera sidan om några sekunder.')
        }
        if (previousSession.status === 'open' && previousSession.url && !reusableUrl) {
          reusableUrl = previousSession.url
          continue
        }
        if (previousSession.status === 'open') await stripe.checkout.sessions.expire(previousSession.id)
        await admin.from('lead_charges').update({ status: 'expired' }).eq('id', charge.id)
      } catch (sessionError) {
        if (sessionError instanceof Error && sessionError.message.includes('behandlas redan')) throw sessionError
        await admin.from('lead_charges').update({ status: 'expired' }).eq('id', charge.id)
      }
    }

    if (reusableUrl) {
      return new Response(JSON.stringify({ url: reusableUrl, reused: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    let customerId = workshop.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: workshop.email, name: workshop.company_name })
      customerId = customer.id
      const { error: customerSaveError } = await admin.from('workshops').update({ stripe_customer_id: customerId }).eq('id', workshop.id)
      if (customerSaveError) console.error('Could not save Stripe customer id', customerSaveError)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: response.id,
      mode: 'payment',
      locale: 'sv',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      billing_address_collection: 'required',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: { name: 'Cykelhjälpen – vinstavgift', description: `Kunden valde er för ärende ${response.request_id.slice(0, 8)}` },
          unit_amount: LEAD_FEE_ORE,
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard/verkstad?won_paid=true&response_id=${response.id}`,
      cancel_url: `${origin}/dashboard/verkstad?won_canceled=true&response_id=${response.id}`,
      metadata: { kind: 'winner_fee', response_id: response.id, request_id: response.request_id, workshop_id: workshop.id },
      payment_intent_data: {
        metadata: { kind: 'winner_fee', response_id: response.id, request_id: response.request_id, workshop_id: workshop.id },
      },
    })

    const { error: chargeError } = await admin.from('lead_charges').insert({
      response_id: response.id,
      request_id: response.request_id,
      workshop_id: workshop.id,
      stripe_session_id: session.id,
      amount: LEAD_FEE_ORE,
      currency: 'sek',
      status: 'pending',
    })

    if (chargeError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined)

      if (chargeError.code === '23505') {
        const { data: existingCharge } = await admin
          .from('lead_charges')
          .select('stripe_session_id')
          .eq('response_id', response.id)
          .eq('status', 'pending')
          .maybeSingle()

        if (existingCharge?.stripe_session_id) {
          const existingSession = await stripe.checkout.sessions.retrieve(existingCharge.stripe_session_id)
          if (existingSession.status === 'open' && existingSession.url) {
            return new Response(JSON.stringify({ url: existingSession.url, reused: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            })
          }
        }
      }

      throw chargeError
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('create-winner-payment', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
