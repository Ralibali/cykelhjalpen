// V2 subscription checkout (contract §3.8). Capability only — flag-gated by
// v2.subscriptions.enabled (OFF by default, gate G-S1). While the flag is off
// the function returns 403 { code: 'feature_disabled' } and touches nothing.
//
// Safety: no Stripe objects are created unless the plan is active AND a price
// id is configured (plan.stripe_price_id or env V2_STRIPE_PRICE_<PLAN_CODE>).
// The live 50 SEK pay-per-win flow is untouched by this function.

import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor, CYKELHJALPENS_SITE_ORIGIN } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { isV2PlanCode, type V2PlanRow } from '../_shared/v2/config-schema.ts'

const BodySchema = z.object({ plan_code: z.string().trim().min(1).max(40) })

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
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Backend-konfiguration saknas.', code: 'config_missing' }, 500, corsHeaders)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    // Feature gate first: OFF = hard no-op.
    const enabled = await v2FlagEnabled(admin, 'v2.subscriptions.enabled')
    if (!enabled) return json({ error: 'Prenumerationer är inte aktiverade ännu.', code: 'feature_disabled' }, 403, corsHeaders)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Du behöver logga in.', code: 'unauthorized' }, 401, corsHeaders)

    const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
    if (userError || !userData.user) return json({ error: 'Du behöver logga in igen.', code: 'unauthorized' }, 401, corsHeaders)

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success || !isV2PlanCode(parsed.data.plan_code)) {
      return json({ error: 'Ogiltig plan.', code: 'invalid_plan' }, 400, corsHeaders)
    }
    const planCode = parsed.data.plan_code
    if (planCode === 'pay_per_win') {
      return json({ error: 'Basplanen kräver ingen betalning.', code: 'plan_not_purchasable' }, 400, corsHeaders)
    }

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved, company_name, stripe_customer_id, email')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) return json({ error: 'Verkstaden är inte godkänd ännu.', code: 'workshop_not_approved' }, 403, corsHeaders)

    const { data: plan, error: planError } = await admin
      .from('v2_plans')
      .select('code, name, price_ore_monthly, currency, stripe_price_id, trial_days, entitlements, active')
      .eq('code', planCode)
      .maybeSingle()
    if (planError) throw planError
    const planRow = plan as V2PlanRow | null
    if (!planRow || !planRow.active) return json({ error: 'Planen är inte tillgänglig.', code: 'plan_inactive' }, 403, corsHeaders)

    // Price id: DB row first, env fallback (V2_STRIPE_PRICE_PRO / _PRO_PLUS).
    const priceId = planRow.stripe_price_id
      ?? Deno.env.get(`V2_STRIPE_PRICE_${planCode.toUpperCase()}`)
      ?? ''
    if (!priceId) return json({ error: 'Planen är inte konfigurerad i Stripe ännu.', code: 'stripe_not_configured' }, 503, corsHeaders)

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) return json({ error: 'Stripe är inte konfigurerat.', code: 'stripe_not_configured' }, 503, corsHeaders)
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })

    // One live subscription per workshop (the DB partial unique index is the
    // hard guard; this is the friendly pre-check).
    const { data: liveSubs, error: liveError } = await admin
      .from('v2_workshop_subscriptions')
      .select('id')
      .eq('workshop_id', workshop.id)
      .in('status', ['trialing', 'active', 'past_due'])
      .limit(1)
    if (liveError) throw liveError
    if ((liveSubs ?? []).length > 0) {
      return json({ error: 'Det finns redan en aktiv prenumeration.', code: 'subscription_exists' }, 409, corsHeaders)
    }

    let customerId = workshop.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: workshop.email, name: workshop.company_name, metadata: { workshop_id: workshop.id } },
        { idempotencyKey: `v2-sub-customer-${workshop.id}` },
      )
      customerId = customer.id
      const { error: saveError } = await admin.from('workshops').update({ stripe_customer_id: customerId }).eq('id', workshop.id)
      if (saveError) console.error('could not save stripe customer id', saveError)
    }

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: 'subscription',
        locale: 'sv',
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        customer_update: { address: 'auto', name: 'auto' },
        subscription_data: {
          trial_period_days: planRow.trial_days > 0 ? planRow.trial_days : undefined,
          metadata: { kind: 'v2_subscription', workshop_id: workshop.id, plan_code: planCode },
        },
        metadata: { kind: 'v2_subscription', workshop_id: workshop.id, plan_code: planCode },
        success_url: `${CYKELHJALPENS_SITE_ORIGIN}/dashboard/verkstad/betalningar?subscription=started`,
        cancel_url: `${CYKELHJALPENS_SITE_ORIGIN}/dashboard/verkstad/betalningar?subscription=cancelled`,
      },
      { idempotencyKey: `v2-sub-checkout-${workshop.id}-${planCode}` },
    )

    if (!session.url) return json({ error: 'Kunde inte skapa checkout.', code: 'stripe_error' }, 502, corsHeaders)
    return json({ checkout_url: session.url }, 200, corsHeaders)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('v2-create-subscription-checkout', message)
    return json({ error: message, code: 'internal_error' }, 500, corsHeaders)
  }
})
