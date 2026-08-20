import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { allowedPublicOrigin, corsFor } from '../_shared/cors.ts'

const BodySchema = z.object({
  quantity: z.number().int().min(1).max(100).default(10),
})

const LEAD_FEE_ORE = 5000 // 50 kr per lead

const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(
  JSON.stringify(body),
  { status, headers: { ...headers, 'Content-Type': 'application/json' } },
)

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret) {
    return json({ error: 'Backend konfiguration saknas.' }, 500, corsHeaders)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Du behöver logga in')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !userData.user) throw new Error('Du behöver logga in igen')

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) throw new Error('Ogiltig mängd')

    const { quantity } = parsed.data
    const totalOre = quantity * LEAD_FEE_ORE

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, company_name, email, stripe_customer_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (workshopError) throw workshopError
    if (!workshop) throw new Error('Ingen verkstad hittades för detta konto')

    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

    let customerId = workshop.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: workshop.email,
        name: workshop.company_name,
      })
      customerId = customer.id
      await admin.from('workshops').update({ stripe_customer_id: customerId }).eq('id', workshop.id)
    }

    const origin = allowedPublicOrigin(req.headers.get('origin'))

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: workshop.id,
      mode: 'payment',
      locale: 'sv',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      billing_address_collection: 'required',
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      line_items: [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: `Cykelhjälpen – ${quantity} lead-credits`,
            description: `Förbetala ${quantity} leads till din verkstad. Varje lead ger dig rätt att svara på en kundförfrågan.`,
          },
          unit_amount: totalOre,
          tax_behavior: 'exclusive',
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard/verkstad/betalningar?success=true&lead_credits=${quantity}`,
      cancel_url: `${origin}/dashboard/verkstad/betalningar?canceled=true`,
      metadata: {
        workshop_id: workshop.id,
        type: 'lead_credits',
        quantity: String(quantity),
      },
      payment_intent_data: {
        metadata: {
          workshop_id: workshop.id,
          type: 'lead_credits',
          quantity: String(quantity),
        },
      },
    })

    // Spara pending purchase
    const { error: purchaseError } = await admin.from('lead_credit_purchases').insert({
      workshop_id: workshop.id,
      stripe_session_id: session.id,
      quantity,
      amount_ore: totalOre,
      currency: 'sek',
      status: 'pending',
    })

    if (purchaseError) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined)
      throw purchaseError
    }

    return json({ url: session.url }, 200, corsHeaders)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Okänt fel'
    console.error('create-lead-credits-checkout error', msg)
    return json({ error: msg }, 400, corsHeaders)
  }
})
