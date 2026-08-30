// V2 supply-health snapshot computation — PURE core.
// Contract: docs/v2/CONTRACTS.md §2.2 (v2_supply_snapshots) + §8 glossary.
//
// Dependency-free (no Deno/npm imports, no I/O) so vitest can import it
// directly — same convention as _shared/v2/config-schema.ts. The DB-touching
// wrapper lives in _shared/v2/supply-health.ts; S10's v2-supply-snapshot cron
// persists the rows.
//
// Definitions (contract §8):
//   active workshop = approved AND >=1 quote in trailing 30d (existing
//     definition, cykelMarketplaceHealth.ts)
//   fill rate       = % published (admin_status='approved') requests created in
//     the window that received >=1 quote within the window

export interface V2SupplyHealthWorkshop {
  id: string
  approved: boolean
  city: string | null
}

export interface V2SupplyHealthRequest {
  id: string
  city: string
  adminStatus: string
  createdAt: string
  approvedAt?: string | null
}

export interface V2SupplyHealthQuote {
  id: string
  requestId: string
  workshopId: string
  createdAt: string
}

/** Row-compatible with public.v2_supply_snapshots (plus derived metrics). */
export interface V2CitySupplyHealth {
  captured_on: string
  city_slug: string
  approved_workshops: number
  active_workshops: number
  requests_30d: number
  quotes_30d: number
  fill_rate: number | null
  median_hours_to_first_quote: number | null
  /** Derived metrics surface (not table columns): */
  quotes_per_week: number
  cluster_slug: string | null
}

export interface V2ClusterSupplyHealth {
  cluster_slug: string
  city_slugs: string[]
  approved_workshops: number
  active_workshops: number
  requests_30d: number
  quotes_30d: number
  fill_rate: number | null
  quotes_per_week: number
  median_hours_to_first_quote: number | null
}

const DAY_MS = 86_400_000

export function supplyWindowStart(now: Date, windowDays = 30): Date {
  return new Date(now.getTime() - windowDays * DAY_MS)
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const med = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  return Math.round(med * 100) / 100
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

/**
 * Compute supply health for one scope (a single city, or every city of a
 * cluster when `cityNames` has several entries). `quotesInWindow` must contain
 * ALL quotes created inside the window (any city) — activity standing is
 * global per the existing definition, while quotes_30d/fill rate are scoped
 * to requests in `cityNames`.
 */
export function computeSupplyHealthForScope(opts: {
  scopeSlug: string
  cityNames: string[]
  clusterSlug?: string | null
  capturedOn: string
  windowDays?: number
  now: Date
  workshops: V2SupplyHealthWorkshop[]
  /** Requests created inside the window (any city). */
  requestsInWindow: V2SupplyHealthRequest[]
  /** Quotes created inside the window (any city). */
  quotesInWindow: V2SupplyHealthQuote[]
  /** City lookup for quotes whose request predates the window. */
  requestCityById?: Map<string, string>
}): V2CitySupplyHealth {
  const windowDays = opts.windowDays ?? 30
  const inScope = new Set(opts.cityNames)

  const scopedWorkshops = opts.workshops.filter((w) => w.city !== null && inScope.has(w.city))
  const approved = scopedWorkshops.filter((w) => w.approved)

  const scopedRequests = opts.requestsInWindow.filter((r) => inScope.has(r.city))
  const scopedRequestIds = new Set(scopedRequests.map((r) => r.id))

  // Quotes attached to this scope's requests. A quote counts when its request
  // belongs to the scope — either it is in the window set, or its city is
  // known via requestCityById (request created before the window).
  const cityOf = (quote: V2SupplyHealthQuote): string | null => {
    const fromWindow = opts.requestsInWindow.find((r) => r.id === quote.requestId)
    if (fromWindow) return fromWindow.city
    return opts.requestCityById?.get(quote.requestId) ?? null
  }
  const scopedQuotes = opts.quotesInWindow.filter((q) => {
    const city = cityOf(q)
    return city !== null && inScope.has(city)
  })

  // Active workshops: approved in scope + >=1 quote anywhere in the window.
  const quotedWorkshopIds = new Set(opts.quotesInWindow.map((q) => q.workshopId))
  const active = approved.filter((w) => quotedWorkshopIds.has(w.id))

  // Fill rate over published requests created in the window.
  const published = scopedRequests.filter((r) => r.adminStatus === 'approved')
  const quotedRequestIds = new Set(scopedQuotes.map((q) => q.requestId))
  const publishedWithQuote = published.filter((r) => quotedRequestIds.has(r.id))
  const fillRate = published.length > 0
    ? round4(publishedWithQuote.length / published.length)
    : null

  // Median hours from publish (approved_at || created_at) to first quote,
  // over published requests created in the window.
  const firstQuoteByRequest = new Map<string, number>()
  for (const quote of scopedQuotes) {
    if (!scopedRequestIds.has(quote.requestId)) continue
    const at = Date.parse(quote.createdAt)
    if (!Number.isFinite(at)) continue
    const current = firstQuoteByRequest.get(quote.requestId)
    if (current === undefined || at < current) firstQuoteByRequest.set(quote.requestId, at)
  }
  const hours: number[] = []
  for (const request of published) {
    const first = firstQuoteByRequest.get(request.id)
    if (first === undefined) continue
    const start = Date.parse(request.approvedAt || request.createdAt)
    if (!Number.isFinite(start)) continue
    hours.push(Math.max(0, (first - start) / 3_600_000))
  }

  return {
    captured_on: opts.capturedOn,
    city_slug: opts.scopeSlug,
    approved_workshops: approved.length,
    active_workshops: active.length,
    requests_30d: scopedRequests.length,
    quotes_30d: scopedQuotes.length,
    fill_rate: fillRate,
    median_hours_to_first_quote: medianOf(hours),
    quotes_per_week: Math.round((scopedQuotes.length / (windowDays / 7)) * 10) / 10,
    cluster_slug: opts.clusterSlug ?? null,
  }
}

/**
 * Aggregate per-city results into a cluster-level view (Östergötland as ONE
 * supply market, contract §2.1). Workshops are not double-counted (a workshop
 * has exactly one home city); fill rate is recomputed from the raw inputs via
 * a scoped re-computation so denominators stay honest.
 */
export function computeClusterSupplyHealth(opts: {
  clusterSlug: string
  members: { citySlug: string; cityName: string }[]
  capturedOn: string
  windowDays?: number
  now: Date
  workshops: V2SupplyHealthWorkshop[]
  requestsInWindow: V2SupplyHealthRequest[]
  quotesInWindow: V2SupplyHealthQuote[]
  requestCityById?: Map<string, string>
}): V2ClusterSupplyHealth {
  const scope = computeSupplyHealthForScope({
    scopeSlug: opts.clusterSlug,
    cityNames: opts.members.map((m) => m.cityName),
    capturedOn: opts.capturedOn,
    windowDays: opts.windowDays,
    now: opts.now,
    workshops: opts.workshops,
    requestsInWindow: opts.requestsInWindow,
    quotesInWindow: opts.quotesInWindow,
    requestCityById: opts.requestCityById,
  })
  return {
    cluster_slug: opts.clusterSlug,
    city_slugs: opts.members.map((m) => m.citySlug),
    approved_workshops: scope.approved_workshops,
    active_workshops: scope.active_workshops,
    requests_30d: scope.requests_30d,
    quotes_30d: scope.quotes_30d,
    fill_rate: scope.fill_rate,
    quotes_per_week: scope.quotes_per_week,
    median_hours_to_first_quote: scope.median_hours_to_first_quote,
  }
}
