// V2 subscription webhook (contract §3.8). Stripe-signed handler that keeps
// v2_workshop_subscriptions in sync with Stripe subscription state.
//
// Safety:
// - Signature verification via STRIPE_WEBHOOK_SECRET_V2_SUBSCRIPTION; without
//   env config the function is a verified no-op (ignores everything).
// - Idempotent via the existing stripe_events reservation pattern (same as
//   stripe-webhook-bike); failed processing releases the reservation so
//   Stripe retries work.
// - Only events for V2 subscriptions (metadata.kind = 'v2_subscription' or a
//   matching stored stripe_subscription_id) are processed. The live 50 SEK
//   pay-per-win webhook (stripe-webhook-bike) is untouched.

import Stripe from 'npm:stripe@18.5.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  v2SubscriptionPatchFromStripe,
  type V2StripeSubscriptionLike,
} from '../_shared/v2/config-schema.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'

const HANDLED_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
])

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('no signature', { status: 400 })

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_V2_SUBSCRIPTION')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    // Safe no-op: without config this endpoint cannot verify or process, so it
    // must never mutate state. 200 avoids Stripe retry storms on an endpoint
    // that was never meant to be registered yet.
    console.error('v2-subscription-webhook configuration missing; ignoring event')
    return jsonResponse({ received: true, ignored: true, configured: false })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' })
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
  } catch (error) {
    console.error('v2 subscription webhook signature failed', error)
    return new Response('bad signature', { status: 400 })
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return jsonResponse({ received: true, ignored: true })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  // Reserve the event before side effects (unique index = concurrency-safe).
  const { error: reservationError } = await admin.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
  })
  if (reservationError?.code === '23505') {
    return jsonResponse({ received: true, duplicate: true })
  }
  if (reservationError) {
    console.error('could not reserve stripe event', reservationError)
    return jsonResponse({ error: 'event reservation failed' }, 500)
  }

  try {
    const result = await processEvent(admin, event)
    return jsonResponse({ received: true, ...result })
  } catch (error) {
    const { error: cleanupError } = await admin
      .from('stripe_events')
      .delete()
      .eq('stripe_event_id', event.id)
    if (cleanupError) console.error('could not release failed event reservation', cleanupError)
    console.error('v2 subscription webhook processing failed', event.id, error)
    return jsonResponse({ error: 'processing failed' }, 500)
  }
})

type AdminClient = ReturnType<typeof createClient>

async function processEvent(admin: AdminClient, event: Stripe.Event): Promise<Record<string, unknown>> {
  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as unknown as V2StripeSubscriptionLike
    const metadata = sub.metadata ?? {}
    const patch = v2SubscriptionPatchFromStripe(sub)
    if (!patch) return { ignored: true, reason: 'unknown_status' }

    // Existing row? (covers updates/deletes and metadata-less renewals)
    const { data: existing, error: lookupError } = await admin
      .from('v2_workshop_subscriptions')
      .select('id, workshop_id, plan_code, status')
      .eq('stripe_subscription_id', sub.id)
      .maybeSingle()
    if (lookupError) throw lookupError

    if (event.type === 'customer.subscription.created' && !existing) {
      if (metadata.kind !== 'v2_subscription' || !metadata.workshop_id || !metadata.plan_code) {
        return { ignored: true, reason: 'not_a_v2_subscription' }
      }
      const { error: insertError } = await admin.from('v2_workshop_subscriptions').insert({
        workshop_id: metadata.workshop_id,
        plan_code: metadata.plan_code,
        ...patch,
      })
      if (insertError?.code === '23505') {
        // Race: the workshop already has a live row (double checkout). Attach
        // this Stripe subscription to the live row instead of retry-storming.
        const { error: raceError } = await admin
          .from('v2_workshop_subscriptions')
          .update({ ...patch, plan_code: metadata.plan_code, updated_at: new Date().toISOString() })
          .eq('workshop_id', metadata.workshop_id)
          .in('status', ['trialing', 'active', 'past_due'])
        if (raceError) throw raceError
        return { processed: 'subscription.created', race_resolved: true }
      }
      if (insertError) throw insertError
      await emitDomainEvent(admin, {
        eventName: 'subscription.started',
        actorType: 'workshop',
        workshopId: metadata.workshop_id,
        payload: { plan_code: metadata.plan_code, trial: patch.status === 'trialing' },
      })
      return { processed: 'subscription.created' }
    }

    if (!existing) return { ignored: true, reason: 'unknown_subscription' }

    const { error: updateError } = await admin
      .from('v2_workshop_subscriptions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (updateError) throw updateError

    if (existing.status === 'trialing' && patch.status === 'active') {
      await emitDomainEvent(admin, {
        eventName: 'subscription.trial_ended',
        actorType: 'system',
        workshopId: existing.workshop_id,
        payload: { plan_code: existing.plan_code, trial: true },
      })
    }
    if (event.type === 'customer.subscription.deleted' || patch.status === 'cancelled') {
      if (existing.status !== 'cancelled') {
        await emitDomainEvent(admin, {
          eventName: 'subscription.cancelled',
          actorType: 'system',
          workshopId: existing.workshop_id,
          payload: { plan_code: existing.plan_code, trial: existing.status === 'trialing' },
        })
      }
    }
    return { processed: event.type }
  }

  // invoice.paid / invoice.payment_failed → recover/mark past_due.
  const invoice = event.data.object as Stripe.Invoice
  const stripeSubscriptionId = extractSubscriptionId(invoice)
  if (!stripeSubscriptionId) return { ignored: true, reason: 'invoice_without_subscription' }

  const { data: subRow, error: subError } = await admin
    .from('v2_workshop_subscriptions')
    .select('id, workshop_id, plan_code, status')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle()
  if (subError) throw subError
  if (!subRow) return { ignored: true, reason: 'unknown_subscription' }

  if (event.type === 'invoice.paid' && subRow.status === 'past_due') {
    const { error } = await admin
      .from('v2_workshop_subscriptions')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', subRow.id)
    if (error) throw error
    return { processed: 'invoice.paid', status: 'active' }
  }
  if (event.type === 'invoice.payment_failed' && subRow.status !== 'past_due') {
    const { error } = await admin
      .from('v2_workshop_subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', subRow.id)
    if (error) throw error
    return { processed: 'invoice.payment_failed', status: 'past_due' }
  }
  return { ignored: true, reason: 'no_state_change' }
}

/** Stripe basil: invoice.subscription may be id string or expanded object. */
function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = (invoice as unknown as { subscription?: string | { id?: string } | null }).subscription
  if (typeof raw === 'string') return raw
  return raw?.id ?? null
}
