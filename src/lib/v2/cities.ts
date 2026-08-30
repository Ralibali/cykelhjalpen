// V2 city-state client (frontend). Contract: docs/v2/CONTRACTS.md §2.1.
// Used by wizard soft-gating (RESEARCH/PAUSED → notify-me), city pages, and
// directory/prisindex render gating. Fails to null (unknown city = no V2
// behavior change).

import type { SupabaseClient } from '@supabase/supabase-js'
import type { V2CityConfigRow, V2CityState } from './contracts'

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

/** Default behavior per state; mirrors stateDefaults in _shared/v2/config-schema.ts. */
export function v2StateDefaults(state: V2CityState): {
  demandOpen: boolean
  autoApprove: boolean
  publicSurfaces: boolean
} {
  switch (state) {
    case 'ACTIVE':
      return { demandOpen: true, autoApprove: true, publicSurfaces: true }
    case 'LIMITED':
      return { demandOpen: true, autoApprove: true, publicSurfaces: false }
    case 'SUPPLY_BUILDING':
      return { demandOpen: true, autoApprove: false, publicSurfaces: false }
    case 'PAUSED':
    case 'RESEARCH':
      return { demandOpen: false, autoApprove: false, publicSurfaces: false }
  }
}

export async function getV2CityConfigs(
  opts: { client?: UntypedClient } = {},
): Promise<V2CityConfigRow[]> {
  try {
    const { data, error } = await (await db(opts.client))
      .from('v2_city_configs')
      .select(
        'city_slug, city_name, state, cluster_slug, demand_open, auto_approve_requests, directory_indexable, price_index_public, target_active_workshops, notes',
      )
    if (error || !data) return []
    return data as V2CityConfigRow[]
  } catch {
    return []
  }
}

export async function getV2CityConfig(
  citySlug: string,
): Promise<V2CityConfigRow | null> {
  const configs = await getV2CityConfigs()
  return configs.find((c) => c.city_slug === citySlug) ?? null
}

/** Wizard soft-gate: may this city accept new demand right now? */
export function v2CityAcceptsDemand(config: V2CityConfigRow | null): boolean {
  if (!config) return true // no config row → V1 behavior (accept)
  return config.demand_open
}

/** Directory pages indexable for this city? (gate G-D1 — threshold part is admin-side) */
export function v2CityDirectoryIndexable(config: V2CityConfigRow | null): boolean {
  return config?.directory_indexable === true && config.state === 'ACTIVE'
}
