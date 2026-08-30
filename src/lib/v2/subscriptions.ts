// V2 subscriptions / entitlements (frontend). Contract: docs/v2/CONTRACTS.md
// §2.8/§3.8. Everything here is inert while flag v2.subscriptions.enabled is
// OFF (default): resolvers return the pay-per-win default, fetchers return
// empty results, and checkout/portal calls are never made by gated UI.
//
// The live 50 SEK pay-per-win flow is untouched — subscriptions are a future
// capability layer (gate G-S1).

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  V2_DEFAULT_PLAN_CODE,
  V2_ENTITLEMENT_KEYS,
  V2_SUBSCRIPTION_LIVE_STATUSES,
  type V2CreateSubscriptionCheckoutResponse,
  type V2EntitlementKey,
  type V2EntitlementMap,
  type V2EntitlementOverrideRow,
  type V2PlanRow,
  type V2SubscriptionPortalResponse,
  type V2SubscriptionStatus,
  type V2WorkshopSubscriptionRow,
} from './contracts'
import { isV2FlagOn } from './flags'

type UntypedClient = SupabaseClient<any, 'public', any>

// Lazy default client — the shared client module needs env at import time.
let defaultClient: UntypedClient | null = null
async function db(client?: UntypedClient): Promise<UntypedClient> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase as unknown as UntypedClient
  }
  return defaultClient
}

export const isV2EntitlementKey = (value: string): value is V2EntitlementKey =>
  (V2_ENTITLEMENT_KEYS as readonly string[]).includes(value)

/**
 * Pure entitlement resolution (mirror of resolveV2Entitlements in
 * _shared/v2/config-schema.ts — parity tested). Plan entitlements apply only
 * in live statuses; admin overrides apply until expires_at; value false/null
 * revokes; unknown keys are dropped.
 */
export function resolveV2Entitlements(input: {
  planEntitlements?: Record<string, unknown> | null
  subscriptionStatus?: V2SubscriptionStatus | null
  overrides?: V2EntitlementOverrideRow[] | null
  now?: Date
}): V2EntitlementMap {
  const now = input.now ?? new Date()
  const resolved: V2EntitlementMap = {}

  const planIsLive =
    input.subscriptionStatus != null &&
    V2_SUBSCRIPTION_LIVE_STATUSES.includes(input.subscriptionStatus)

  if (planIsLive) {
    for (const [key, value] of Object.entries(input.planEntitlements ?? {})) {
      if (!isV2EntitlementKey(key)) continue
      if (value === false || value == null) continue
      resolved[key] = value
    }
  }

  for (const override of input.overrides ?? []) {
    if (!isV2EntitlementKey(override.entitlement_key)) continue
    if (override.expires_at && new Date(override.expires_at) <= now) continue
    if (override.value === false || override.value == null) {
      delete resolved[override.entitlement_key]
    } else {
      resolved[override.entitlement_key] = override.value
    }
  }

  return resolved
}

export interface V2WorkshopBillingState {
  enabled: boolean
  subscription: V2WorkshopSubscriptionRow | null
  plan: V2PlanRow | null
  entitlements: V2EntitlementMap
}

const DISABLED_STATE: V2WorkshopBillingState = {
  enabled: false,
  subscription: null,
  plan: null,
  entitlements: {},
}

/**
 * Load the workshop's billing/plan state. Flag OFF (default) → the disabled
 * state with zero queries beyond the flag read. Fails closed. Never throws.
 */
export async function getV2WorkshopBillingState(
  workshopId: string,
  opts: { client?: UntypedClient } = {},
): Promise<V2WorkshopBillingState> {
  try {
    const enabled = await isV2FlagOn('v2.subscriptions.enabled')
    if (!enabled) return DISABLED_STATE

    const client = await db(opts.client)
    const [{ data: subs }, { data: overrides }] = await Promise.all([
      client
        .from('v2_workshop_subscriptions')
        .select(
          'id, workshop_id, plan_code, status, stripe_subscription_id, stripe_customer_id, trial_ends_at, current_period_end, cancelled_at, granted_by_admin, override_reason',
        )
        .eq('workshop_id', workshopId)
        .in('status', [...V2_SUBSCRIPTION_LIVE_STATUSES])
        .order('created_at', { ascending: false })
        .limit(1),
      client
        .from('v2_entitlement_overrides')
        .select('id, workshop_id, entitlement_key, value, expires_at, granted_by, reason, created_at')
        .eq('workshop_id', workshopId),
    ])

    const subscription = ((subs ?? [])[0] ?? null) as V2WorkshopSubscriptionRow | null
    let plan: V2PlanRow | null = null
    if (subscription) {
      const { data } = await client
        .from('v2_plans')
        .select('code, name, price_ore_monthly, currency, stripe_price_id, trial_days, entitlements, active')
        .eq('code', subscription.plan_code)
        .maybeSingle()
      plan = (data as V2PlanRow | null) ?? null
    }

    return {
      enabled: true,
      subscription,
      plan,
      entitlements: resolveV2Entitlements({
        planEntitlements: plan?.entitlements ?? null,
        subscriptionStatus: subscription?.status ?? null,
        overrides: (overrides ?? []) as V2EntitlementOverrideRow[],
      }),
    }
  } catch {
    return DISABLED_STATE
  }
}

/** Public: list sellable plans (active only, per RLS). Empty while none are active. */
export async function fetchV2ActivePlans(
  opts: { client?: UntypedClient } = {},
): Promise<V2PlanRow[]> {
  try {
    const { data, error } = await (await db(opts.client))
      .from('v2_plans')
      .select('code, name, price_ore_monthly, currency, stripe_price_id, trial_days, entitlements, active')
      .eq('active', true)
    if (error) return []
    return (data as V2PlanRow[]) ?? []
  } catch {
    return []
  }
}

/**
 * Start a subscription checkout. Throws Error with the server's message on
 * failure — callers (flag-gated UI) catch and toast. Never called while the
 * flag is off (the server would 403 feature_disabled anyway).
 */
export async function createV2SubscriptionCheckout(
  planCode: string,
  opts: { client?: UntypedClient } = {},
): Promise<string> {
  const client = await db(opts.client)
  const { data, error } = await client.functions.invoke('v2-create-subscription-checkout', {
    body: { plan_code: planCode },
  })
  if (error) throw new Error(error.message)
  const payload = data as V2CreateSubscriptionCheckoutResponse | { error?: string } | null
  if (payload && 'checkout_url' in payload && payload.checkout_url) return payload.checkout_url
  throw new Error((payload as { error?: string } | null)?.error || 'Kunde inte starta checkout.')
}

/** Open the Stripe billing portal (cancellation/payment method). */
export async function openV2SubscriptionPortal(
  opts: { client?: UntypedClient } = {},
): Promise<string> {
  const client = await db(opts.client)
  const { data, error } = await client.functions.invoke('v2-subscription-portal', { body: {} })
  if (error) throw new Error(error.message)
  const payload = data as V2SubscriptionPortalResponse | { error?: string } | null
  if (payload && 'url' in payload && payload.url) return payload.url
  throw new Error((payload as { error?: string } | null)?.error || 'Kunde inte öppna kundportalen.')
}

/** Display helper: current plan code (default pay_per_win). */
export function v2DisplayPlanCode(state: V2WorkshopBillingState): string {
  return state.subscription?.plan_code ?? V2_DEFAULT_PLAN_CODE
}
