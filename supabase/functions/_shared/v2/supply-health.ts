// V2 supply-health snapshot loader (edge side). Contract: docs/v2/CONTRACTS.md
// §2.2 (v2_supply_snapshots). This is the metrics surface other swarms read:
// it computes per-city rows (row-compatible with v2_supply_snapshots) plus
// per-cluster aggregates. Persistence (upsert into v2_supply_snapshots) is
// owned by S10's v2-supply-snapshot cron — this module only computes.
//
// All heavy logic lives in the pure supply-health-core.ts (vitest-tested).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getV2CityConfigs, type V2CityConfig } from './city-state.ts'
import {
  computeClusterSupplyHealth,
  computeSupplyHealthForScope,
  supplyWindowStart,
  type V2CitySupplyHealth,
  type V2ClusterSupplyHealth,
  type V2SupplyHealthQuote,
  type V2SupplyHealthRequest,
  type V2SupplyHealthWorkshop,
} from './supply-health-core.ts'

export interface V2SupplyHealthReport {
  captured_on: string
  window_days: number
  cities: V2CitySupplyHealth[]
  clusters: V2ClusterSupplyHealth[]
}

interface WorkshopRow {
  id: string
  approved: boolean
  city: string | null
}

interface RequestRow {
  id: string
  city: string
  admin_status: string
  created_at: string
  approved_at: string | null
}

interface QuoteRow {
  id: string
  request_id: string
  workshop_id: string
  created_at: string
}

/**
 * Compute the supply-health report for every configured city and active
 * cluster. Read-only; never throws on missing data (empty report instead).
 */
export async function computeV2SupplyHealth(
  supabase: SupabaseClient,
  opts: { now?: Date; windowDays?: number } = {},
): Promise<V2SupplyHealthReport> {
  const now = opts.now ?? new Date()
  const windowDays = opts.windowDays ?? 30
  const capturedOn = now.toISOString().slice(0, 10)
  const windowStartIso = supplyWindowStart(now, windowDays).toISOString()

  const configs = await getV2CityConfigs(supabase)
  const configList = Object.values(configs)

  const [workshopResult, requestResult, quoteResult] = await Promise.all([
    supabase.from('workshops').select('id, approved, city'),
    supabase
      .from('bike_repair_requests')
      .select('id, city, admin_status, created_at, approved_at')
      .gte('created_at', windowStartIso),
    supabase
      .from('workshop_responses')
      .select('id, request_id, workshop_id, created_at')
      .gte('created_at', windowStartIso),
  ])

  const workshops: V2SupplyHealthWorkshop[] = ((workshopResult.data ?? []) as WorkshopRow[])
    .map((w) => ({ id: w.id, approved: w.approved, city: w.city }))
  const requestsInWindow: V2SupplyHealthRequest[] = ((requestResult.data ?? []) as RequestRow[])
    .map((r) => ({
      id: r.id,
      city: r.city,
      adminStatus: r.admin_status,
      createdAt: r.created_at,
      approvedAt: r.approved_at,
    }))
  const quotesInWindow: V2SupplyHealthQuote[] = ((quoteResult.data ?? []) as QuoteRow[])
    .map((q) => ({ id: q.id, requestId: q.request_id, workshopId: q.workshop_id, createdAt: q.created_at }))

  // Quotes may belong to requests created before the window — fetch just
  // those request rows to resolve their city for scoping.
  const knownRequestIds = new Set(requestsInWindow.map((r) => r.id))
  const missingIds = [...new Set(quotesInWindow.map((q) => q.requestId))]
    .filter((id) => !knownRequestIds.has(id))
  const requestCityById = new Map<string, string>()
  if (missingIds.length > 0) {
    const { data: olderRequests } = await supabase
      .from('bike_repair_requests')
      .select('id, city')
      .in('id', missingIds)
    for (const row of (olderRequests ?? []) as { id: string; city: string }[]) {
      requestCityById.set(row.id, row.city)
    }
  }

  const cities = configList.map((config: V2CityConfig) => computeSupplyHealthForScope({
    scopeSlug: config.citySlug,
    cityNames: [config.cityName],
    clusterSlug: config.clusterSlug,
    capturedOn,
    windowDays,
    now,
    workshops,
    requestsInWindow,
    quotesInWindow,
    requestCityById,
  }))

  const clusterSlugs = [...new Set(configList.map((c) => c.clusterSlug).filter((s): s is string => s !== null))]
  const clusters = clusterSlugs.map((clusterSlug) => computeClusterSupplyHealth({
    clusterSlug,
    members: configList
      .filter((c) => c.clusterSlug === clusterSlug)
      .map((c) => ({ citySlug: c.citySlug, cityName: c.cityName })),
    capturedOn,
    windowDays,
    now,
    workshops,
    requestsInWindow,
    quotesInWindow,
    requestCityById,
  }))

  return { captured_on: capturedOn, window_days: windowDays, cities, clusters }
}
