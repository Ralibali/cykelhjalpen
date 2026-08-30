// V2 subscription / entitlement resolver (edge side).
// Contract: docs/v2/CONTRACTS.md §2.8, flag v2.subscriptions.enabled (OFF).
//
// HARD RULE: while the flag is off (default) this module returns the
// pay-per-win default with NO entitlements and performs NO Stripe/DB writes.
// It never touches the live 50 SEK pay-per-win charging path.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  resolveV2Entitlements,
  V2_DEFAULT_PLAN_CODE,
  V2_SUBSCRIPTION_LIVE_STATUSES,
  type V2EntitlementMap,
  type V2EntitlementOverrideRow,
  type V2PlanRow,
  type V2SubscriptionStatus,
  type V2WorkshopSubscriptionRow,
} from './config-schema.ts'
import { v2FlagEnabled } from './flags.ts'

export interface V2WorkshopEntitlements {
  planCode: string
  subscriptionStatus: V2SubscriptionStatus | null
  entitlements: V2EntitlementMap
  /** 'default' = flag off / no subscription; 'resolved' = real plan state. */
  source: 'default' | 'resolved'
}

const DEFAULT_RESULT: V2WorkshopEntitlements = {
  planCode: V2_DEFAULT_PLAN_CODE,
  subscriptionStatus: null,
  entitlements: {},
  source: 'default',
}

/**
 * Resolve a workshop's effective entitlements. Fails CLOSED: any read error
 * or a disabled flag yields the pay-per-win default. Never throws.
 */
export async function getWorkshopEntitlements(
  supabase: SupabaseClient,
  workshopId: string,
): Promise<V2WorkshopEntitlements> {
  try {
    const enabled = await v2FlagEnabled(supabase, 'v2.subscriptions.enabled')
    if (!enabled) return DEFAULT_RESULT

    const [{ data: subs, error: subsError }, { data: overrides, error: ovError }] =
      await Promise.all([
        supabase
          .from('v2_workshop_subscriptions')
          .select(
            'id, workshop_id, plan_code, status, stripe_subscription_id, stripe_customer_id, trial_ends_at, current_period_end, cancelled_at, granted_by_admin, override_reason',
          )
          .eq('workshop_id', workshopId)
          .in('status', [...V2_SUBSCRIPTION_LIVE_STATUSES])
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('v2_entitlement_overrides')
          .select('id, workshop_id, entitlement_key, value, expires_at, granted_by, reason, created_at')
          .eq('workshop_id', workshopId),
      ])

    if (subsError || ovError) return DEFAULT_RESULT

    const subscription = ((subs ?? [])[0] ?? null) as V2WorkshopSubscriptionRow | null
    let planEntitlements: Record<string, unknown> | null = null

    if (subscription) {
      const { data: plan, error: planError } = await supabase
        .from('v2_plans')
        .select('code, name, price_ore_monthly, currency, stripe_price_id, trial_days, entitlements, active')
        .eq('code', subscription.plan_code)
        .maybeSingle()
      if (planError) return DEFAULT_RESULT
      planEntitlements = ((plan as V2PlanRow | null)?.entitlements ?? {}) as Record<string, unknown>
    }

    return {
      planCode: subscription?.plan_code ?? V2_DEFAULT_PLAN_CODE,
      subscriptionStatus: subscription?.status ?? null,
      entitlements: resolveV2Entitlements({
        planEntitlements,
        subscriptionStatus: subscription?.status ?? null,
        overrides: (overrides ?? []) as V2EntitlementOverrideRow[],
      }),
      source: 'resolved',
    }
  } catch {
    return DEFAULT_RESULT
  }
}

/**
 * Convenience: does the workshop currently hold a given entitlement?
 */
export async function workshopHasEntitlement(
  supabase: SupabaseClient,
  workshopId: string,
  key: keyof V2EntitlementMap & string,
): Promise<boolean> {
  const { entitlements } = await getWorkshopEntitlements(supabase, workshopId)
  const value = entitlements[key]
  return value !== undefined && value !== false && value !== null
}
