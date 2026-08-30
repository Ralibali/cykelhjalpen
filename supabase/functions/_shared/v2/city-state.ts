// V2 city-state resolver (edge side). Contract: docs/v2/CONTRACTS.md §2.1, §7.
// Owns the city_slug ↔ city_name mapping for edge code (invariant I6).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  cityNameFromSlug,
  citySlugFromName,
  isV2CityState,
  stateDefaults,
  type V2CityState,
} from './config-schema.ts'

export interface V2CityConfig {
  citySlug: string
  cityName: string
  state: V2CityState
  clusterSlug: string | null
  demandOpen: boolean
  autoApproveRequests: boolean
  directoryIndexable: boolean
  priceIndexPublic: boolean
  targetActiveWorkshops: number
}

interface V2CityConfigRow {
  city_slug: string
  city_name: string
  state: string
  cluster_slug: string | null
  demand_open: boolean
  auto_approve_requests: boolean
  directory_indexable: boolean
  price_index_public: boolean
  target_active_workshops: number
}

function toConfig(row: V2CityConfigRow): V2CityConfig {
  const state: V2CityState = isV2CityState(row.state) ? row.state : 'RESEARCH'
  const defaults = stateDefaults(state)
  return {
    citySlug: row.city_slug,
    cityName: row.city_name,
    state,
    clusterSlug: row.cluster_slug,
    // Explicit columns win; defaults are only a safety net for partial rows.
    demandOpen: row.demand_open ?? defaults.demandOpen,
    autoApproveRequests: row.auto_approve_requests ?? defaults.autoApprove,
    directoryIndexable: row.directory_indexable ?? false,
    priceIndexPublic: row.price_index_public ?? false,
    targetActiveWorkshops: row.target_active_workshops ?? 5,
  }
}

/** All city configs keyed by slug. Missing table/error → empty map (safe: RESEARCH-like). */
export async function getV2CityConfigs(
  supabase: SupabaseClient,
): Promise<Record<string, V2CityConfig>> {
  const { data, error } = await supabase
    .from('v2_city_configs')
    .select(
      'city_slug, city_name, state, cluster_slug, demand_open, auto_approve_requests, directory_indexable, price_index_public, target_active_workshops',
    )

  if (error || !data) return {}

  const map: Record<string, V2CityConfig> = {}
  for (const row of data as V2CityConfigRow[]) {
    map[row.city_slug] = toConfig(row)
  }
  return map
}

/** Resolve by slug or V1 display name ('Linköping'). Unknown → null. */
export async function resolveV2CityConfig(
  supabase: SupabaseClient,
  citySlugOrName: string,
): Promise<V2CityConfig | null> {
  const slug = citySlugFromName(citySlugOrName) ?? citySlugOrName
  const configs = await getV2CityConfigs(supabase)
  return configs[slug] ?? null
}

/**
 * Should a new request in this city be auto-approved? V2 rule: the explicit
 * city config wins. When no config row exists, returns null so the caller
 * keeps the V1 behavior (active-workshop gate in cityAutoApprove.ts).
 */
export async function v2AutoApproveDecision(
  supabase: SupabaseClient,
  cityName: string,
): Promise<boolean | null> {
  const config = await resolveV2CityConfig(supabase, cityName)
  if (!config) return null
  return config.demandOpen && config.autoApproveRequests
}

/** Slugs of every city in the same cluster (for cluster matching, S1). */
export async function v2ClusterCitySlugs(
  supabase: SupabaseClient,
  citySlugOrName: string,
): Promise<string[]> {
  const config = await resolveV2CityConfig(supabase, citySlugOrName)
  if (!config?.clusterSlug) {
    const slug = citySlugFromName(citySlugOrName) ?? citySlugOrName
    return [slug]
  }
  const configs = await getV2CityConfigs(supabase)
  return Object.values(configs)
    .filter((c) => c.clusterSlug === config.clusterSlug)
    .map((c) => c.citySlug)
}

/** Display names of every city in the same cluster (for V1 table queries). */
export async function v2ClusterCityNames(
  supabase: SupabaseClient,
  citySlugOrName: string,
): Promise<string[]> {
  const slugs = await v2ClusterCitySlugs(supabase, citySlugOrName)
  return slugs
    .map((slug) => cityNameFromSlug(slug))
    .filter((name): name is string => name !== null)
}
