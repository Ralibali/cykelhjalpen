// V2 billing portal for workshop subscriptions. Cancellation runs through
// Stripe's hosted customer portal (contract §3.8: "cancel via customer
// portal"). The legacy `customer-portal` function is Updro-wired
// (updro.se defaults, supplier routes) and is intentionally NOT modified —
// this v2- function is the bike-side portal entry point.
//
// Flag-gated by v2.subscriptions.enabled (OFF by default). No-op 403 while
// off; never touches the live pay-per-win charging flow.

import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor, CYKELHJALPENS_SITE_ORIGIN } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.', code: 'config_missing' }, 500, corsHeaders)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const enabled = await v2FlagEnabled(admin, 'v2.subscriptions.enabled')
    if (!enabled) return json({ error: 'Prenumerationer är inte aktiverade ännu.', code: 'feature_disabled' }, 403, corsHeaders)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Du behöver logga in.', code: 'unauthorized' }, 401, corsHeaders)

    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !userData.user) return json({ error: 'Du behöver logga in igen.', code: 'unauthorized' }, 401, corsHeaders)

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, stripe_customer_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) return json({ error: 'Verkstaden hittades inte.', code: 'workshop_not_found' }, 404, corsHeaders)

    // Prefer the customer id stored on the subscription row; fall back to the
    // workshop's existing Stripe customer (created by winner-fee payments).
    const { data: subRow } = await admin
      .from('v2_workshop_subscriptions')
      .select('stripe_customer_id')
      .eq('workshop_id', workshop.id)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const customerId = (subRow as { stripe_customer_id: string | null } | null)?.stripe_customer_id
      ?? (workshop.stripe_customer_id as string | null)
    if (!customerId) return json({ error: 'Ingen Stripe-kund finns ännu.', code: 'no_stripe_customer' }, 404, corsHeaders)

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) return json({ error: 'Stripe är inte konfigurerat.', code: 'stripe_not_configured' }, 503, corsHeaders)
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${CYKELHJALPENS_SITE_ORIGIN}/dashboard/verkstad/betalningar`,
    })

    return json({ url: portalSession.url }, 200, corsHeaders)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('v2-subscription-portal', message)
    return json({ error: message, code: 'internal_error' }, 500, corsHeaders)
  }
})
