// V2 canonical pricing config reader (edge side).
// Contract: docs/v2/CONTRACTS.md §2.1, invariants I1–I2.
//
// HARD RULE: this module never changes live charging behavior by itself.
// - When flag v2.pricing.config_reader is OFF (default), callers must keep
//   using _shared/pricing.ts constants (LEAD_FEE_ORE).
// - When ON, values come from v2_pricing_config — seeded identical to the
//   constants, so the flip is behavior-neutral (gate G-X1).
// - commissionBps is ALWAYS 0 (0% commission forever), enforced here and by a
//   DB CHECK constraint.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  V2_LIVE_PRICING,
  resolvePricingConfig,
  type V2PricingConfig,
  type V2PricingConfigRow,
} from './config-schema.ts'
import { v2FlagEnabled } from './flags.ts'

/**
 * Read the canonical pricing config. Falls back to V2_LIVE_PRICING (identical
 * values) when the table is missing/unreadable. Never throws.
 */
export async function getCanonicalPricing(
  supabase: SupabaseClient,
  key = 'winner_fee',
): Promise<V2PricingConfig> {
  try {
    const { data, error } = await supabase
      .from('v2_pricing_config')
      .select(
        'key, amount_ore, currency, vat_rate, commission_bps, credit_pack_min, credit_pack_max, credit_unit_ore, free_wins_on_signup, effective_from, active',
      )
      .eq('key', key)
      .eq('active', true)

    if (error) return V2_LIVE_PRICING
    return resolvePricingConfig(data as V2PricingConfigRow[] | null, key)
  } catch {
    return V2_LIVE_PRICING
  }
}

/**
 * Gate-aware reader: returns table-backed config only when the
 * v2.pricing.config_reader flag is on; otherwise the compile-time live rule.
 * New charging code should call THIS, so the G-X1 flip is a config change,
 * not a deploy.
 */
export async function getEffectivePricing(
  supabase: SupabaseClient,
  key = 'winner_fee',
): Promise<V2PricingConfig> {
  const useConfigTable = await v2FlagEnabled(supabase, 'v2.pricing.config_reader')
  if (!useConfigTable) return V2_LIVE_PRICING
  return getCanonicalPricing(supabase, key)
}
