// V2 Cykelprisindex client (frontend). Contract: docs/v2/CONTRACTS.md §2.5/§3.5.
//
// Public price reads go through the anon-safe, sample-gated RPC
// public.v2_get_price_index (SQL enforces the gate — flag
// v2.prisindex.public_display + city price_index_public + confidence >= 'low').
// When the gate fails the RPC returns guide rows with kind='riktpris' and
// sample_gated=true; the UI MUST label them as riktpriser, never as
// Cykelhjälpen statistics (adversarial critique: price-moat honesty).

import type { SupabaseClient } from '@supabase/supabase-js'

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

export interface V2PriceIndexRow {
  repair_category: string
  sample_count: number | null
  median_sek: number | null
  p25_sek: number | null
  p75_sek: number | null
  confidence: string
  window_end: string | null
  kind: 'stats' | 'riktpris'
}

export interface V2PriceIndexResult {
  rows: V2PriceIndexRow[]
  /** true = rows are external guide prices (riktpris), NOT real statistics. */
  sampleGated: boolean
}

/**
 * Fetch the sample-gated price index for a city. Never throws: on any error
 * returns an empty gated result so the caller can render its local, clearly
 * labelled riktpris fallback (identical honesty semantics).
 */
export async function getV2PriceIndex(
  citySlug: string,
  opts: { category?: string | null; client?: UntypedClient } = {},
): Promise<V2PriceIndexResult> {
  try {
    const { data, error } = await (await db(opts.client)).rpc('v2_get_price_index', {
      p_city_slug: citySlug,
      p_category: opts.category ?? null,
    })
    if (error) return { rows: [], sampleGated: true }
    const payload = (data ?? {}) as { rows?: V2PriceIndexRow[]; sample_gated?: boolean }
    const rows = Array.isArray(payload.rows) ? payload.rows : []
    const sampleGated = payload.sample_gated !== false
    return { rows: sampleGated ? rows.filter((r) => r.kind === 'riktpris') : rows, sampleGated }
  } catch {
    return { rows: [], sampleGated: true }
  }
}
