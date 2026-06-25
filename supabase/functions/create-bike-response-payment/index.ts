import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { LEAD_FEE_ORE } from '../_shared/pricing.ts'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({ response_id: z.string().uuid() })

const allowedOrigin = (origin: string | null) => {
  if (origin && /^(https:\/\/(www\.)?cykelhjalpen\.se|https:\/\/[a-z0-9-]+\.lovable\.app|http:\/\/localhost(:\d+)?)$/i.test(origin)) return origin
  return 'https://cykelhjalpen.se'
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

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
      .select('id, approved, company_name, stripe_customer_id, email, free_leads_remaining')
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
    if (response.paid) throw new Error('Offerten är redan skickad')

    const { count, error: countError } = await admin
      .from('workshop_responses')
      .select('*', { head: true, count: 'exact' })
      .eq('request_id', response.request_id)
      .eq('paid', true)
    if (countError) throw countError
    if ((count || 0) >= 5) throw new Error('Ärendet är fullt – fem verkstäder har redan svarat.')

    const origin = allowedOrigin(req.headers.get('origin'))

    if ((workshop.free_leads_remaining || 0) > 0) {
      const previousBalance = workshop.free_leads_remaining || 0
      const { data: balanceUpdate, error: balanceError } = await admin
        .from('workshops')
        .update({ free_leads_remaining: previousBalance - 1 })
        .eq('id', workshop.id)
        .eq('free_leads_remaining', previousBalance)
        .select('id')
        .maybeSingle()
      if (balanceError) throw balanceError
      if (!balanceUpdate) throw new Error('Gratis-leaden hann användas av en annan offert. Försök igen.')

      const { error: paidError } = await admin
        .from('workshop_responses')
        .update({ paid: true, used_free_lead: true, status: 'sent' })
        .eq('id', response.id)
        .eq('paid', false)
      if (paidError) {
        await admin.from('workshops').update({ free_leads_remaining: previousBalance }).eq('id', workshop.id)
        throw paidError
      }

      const { error: chargeError } = await admin.from('lead_charges').insert({
        response_id: response.id,
        request_id: response.request_id,
        workshop_id: workshop.id,
        amount: 0,
        currency: 'sek',
        status: 'free_lead',
      })
      if (chargeError) console.error('Could not record free lead charge', chargeError)

      await admin.from('bike_repair_requests').update({ status: 'has_offers' }).eq('id', response.request_id)

      const { data: requestRow } = await admin
        .from('bike_repair_requests')
        .select('customer_name, customer_email, repair_category, view_token')
        .eq('id', response.request_id)
        .maybeSingle()

      if (requestRow?.customer_email) {
        const requestUrl = `https://cykelhjalpen.se/mitt-arende/${encodeURIComponent(requestRow.view_token || '')}`
        const emailTask = fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            to: requestRow.customer_email,
            subject: `Nytt prisförslag på din cykel – ${requestRow.repair_category}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111"><h2>Hej ${escapeHtml(requestRow.customer_name)}!</h2><p><strong>${escapeHtml(workshop.company_name)}</strong> har lämnat ett prisförslag på ditt cykelärende.</p><p><a href="${requestUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Se prisförslaget</a></p></div>`,
          }),
        }).catch((emailError) => console.error('Free lead customer notification failed', emailError))

        const edgeRuntime = (globalThis as any).EdgeRuntime
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(emailTask)
        else await emailTask
      }

      return new Response(JSON.stringify({ url: `${origin}/dashboard/verkstad/arenden?paid=true&free=1`, free_lead: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) throw new Error('Stripe är inte konfigurerat')
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      mode: 'payment',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      billing_address_collection: 'required',
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: { name: 'Cykelhjälpen – offert till kund', description: `Lead-avgift för ärende ${response.request_id.slice(0, 8)}` },
          unit_amount: LEAD_FEE_ORE,
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard/verkstad/arenden?paid=true`,
      cancel_url: `${origin}/dashboard/verkstad/arenden?canceled=true`,
      metadata: { response_id: response.id, request_id: response.request_id, workshop_id: workshop.id },
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
      throw chargeError
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('create-bike-response-payment', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
