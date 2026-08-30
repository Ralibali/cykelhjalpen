// V2 pricing config client (frontend). Contract: docs/v2/CONTRACTS.md §2.1.
// Fallback = today's live constants from src/lib/pricing.ts (identical values),
// so rendering never breaks and never shows a different price than charged.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'
import { LEAD_FEE_ORE } from '@/lib/pricing'
import type { V2PricingConfigRow } from './contracts'
import type { V2Client } from './flags'

// Lazy default client — the shared client module needs env at import time.
let defaultClient: V2Client | null = null
async function db(client?: V2Client): Promise<V2Client> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase
  }
  return defaultClient
}

export interface V2Pricing {
  amountOre: number
  currency: string
  vatRate: number
  commissionBps: number // always 0 — invariant I1
  freeWinsOnSignup: number
  creditUnitOre: number
  source: 'config_table' | 'live_constants'
}

export const V2_LIVE_PRICING_FALLBACK: V2Pricing = {
  amountOre: LEAD_FEE_ORE, // 5000 öre = 50 kr exkl. moms
  currency: 'SEK',
  vatRate: 0.25,
  commissionBps: 0,
  freeWinsOnSignup: 2,
  creditUnitOre: LEAD_FEE_ORE,
  source: 'live_constants',
}

export function pricingFromRows(rows: V2PricingConfigRow[] | null | undefined): V2Pricing {
  const row = (rows ?? [])
    .filter((r) => r.key === 'winner_fee' && r.active)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0]
  if (!row) return V2_LIVE_PRICING_FALLBACK

  return {
    amountOre: row.amount_ore,
    currency: row.currency || 'SEK',
    vatRate: Number(row.vat_rate),
    commissionBps: 0, // invariant I1 — never read from input
    freeWinsOnSignup: row.free_wins_on_signup,
    creditUnitOre: row.credit_unit_ore,
    source: 'config_table',
  }
}

export async function getV2Pricing(opts: { client?: V2Client } = {}): Promise<V2Pricing> {
  try {
    const { data, error } = await (await db(opts.client))
      .from('v2_pricing_config')
      .select(
        'key, amount_ore, currency, vat_rate, commission_bps, credit_pack_min, credit_pack_max, credit_unit_ore, free_wins_on_signup, effective_from, active',
      )
      .eq('key', 'winner_fee')
      .eq('active', true)
    if (error) return V2_LIVE_PRICING_FALLBACK
    return pricingFromRows(data)
  } catch {
    return V2_LIVE_PRICING_FALLBACK
  }
}

/** 50 kr exkl. → 62,50 kr inkl. moms (öre). */
export function v2GrossOre(netOre: number, vatRate: number): number {
  return Math.round(netOre * (1 + vatRate))
}
