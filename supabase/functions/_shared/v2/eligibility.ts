// V2 eligibility engine — PURE matching and city-state decision logic.
// Contract: docs/v2/CONTRACTS.md §2.1–2.2, §3.1, §5 (v2.liquidity.areas_served_matching).
//
// This module is deliberately dependency-free (no Deno/npm imports, no I/O) so
// vitest (src/lib/v2) can import it directly — same convention as
// _shared/v2/config-schema.ts. DB-touching wrappers live in the edge functions
// and in _shared/v2/supply-health.ts.
//
// Insight 7 fix: exact-string city matching silos the Östergötland cluster.
// Matching here supports three modes per workshop (workshops.service_area_mode):
//   'city'    — exact city name (today's behavior, always on, flag-independent)
//   'areas'   — workshops.areas_served[] matched against the request city name
//   'cluster' — any city in the workshop's own cluster (requires cluster_opt_in)
// 'areas' and 'cluster' only apply when the v2.liquidity.areas_served_matching
// flag is ON for the context (gate G-L1); 'city' matching never changes.

// ---------------------------------------------------------------------------
// Types (plain data — callers map DB rows to these shapes)
// ---------------------------------------------------------------------------

export type V2ServiceAreaMode = 'city' | 'areas' | 'cluster'
export type V2MatchVia = 'city' | 'areas' | 'cluster'

export interface V2EligibilityWorkshop {
  id: string
  approved: boolean
  /** V1 display name ('Linköping'); exact-match string in workshops.city. */
  city: string | null
  areasServed?: string[] | null
  serviceAreaMode?: string | null
  clusterOptIn?: boolean | null
  /** Declared service categories; empty/null = no category restriction. */
  services?: string[] | null
  /** Mirror of v2_workshop_onboarding.state (cheap-read column). */
  onboardingState?: string | null
}

export interface V2EligibilityRequest {
  id: string
  /** V1 display name in bike_repair_requests.city. */
  city: string
  repairCategory: string
  status: string
  adminStatus: string
  /** Sent/won quotes already on the request (quote-slot availability). */
  sentQuotes?: number
}

export interface V2EligibilityContext {
  /** v2.liquidity.areas_served_matching resolved for this request/city. */
  areasServedMatchingOn: boolean
  /**
   * Display names of every city in the REQUEST city's cluster (including the
   * request city itself). Empty/absent = request city has no cluster.
   */
  clusterCityNames?: string[]
}

export interface V2EligibilityResult {
  eligible: boolean
  reasons: string[]
  matchedVia: V2MatchVia | null
}

/** Open statuses exposed on the workshop board (mirrors list-open-bike-requests). */
export const V2_OPEN_REQUEST_STATUSES = ['new', 'has_offers'] as const

/** Max sent quotes per request — the 3-slot rule (existing product rule). */
export const V2_MAX_QUOTES_PER_REQUEST = 3

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/** Case/diacritic-insensitive comparison key for city names and areas_served. */
export function normalizeAreaKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/å/g, 'a')
}

// ---------------------------------------------------------------------------
// City matching (Insight 7)
// ---------------------------------------------------------------------------

/**
 * How does this workshop match the request's city?
 *  - 'city' always wins and never depends on flags (live behavior unchanged).
 *  - 'areas' requires the flag AND service_area_mode='areas' AND an
 *    areas_served entry equal (normalized) to the request city name.
 *  - 'cluster' requires the flag AND service_area_mode='cluster' AND explicit
 *    cluster_opt_in AND the workshop's home city being in the request city's
 *    cluster.
 * Returns null when there is no match.
 */
export function matchWorkshopToRequestCity(
  workshop: Pick<V2EligibilityWorkshop, 'city' | 'areasServed' | 'serviceAreaMode' | 'clusterOptIn'>,
  requestCity: string,
  ctx: V2EligibilityContext,
): V2MatchVia | null {
  if (workshop.city && workshop.city === requestCity) return 'city'
  if (!ctx.areasServedMatchingOn) return null

  const mode = workshop.serviceAreaMode ?? 'city'

  if (mode === 'areas') {
    const target = normalizeAreaKey(requestCity)
    const hit = (workshop.areasServed ?? []).some((area) => normalizeAreaKey(area) === target)
    if (hit) return 'areas'
  }

  if (mode === 'cluster' && workshop.clusterOptIn === true && workshop.city) {
    const cluster = ctx.clusterCityNames ?? []
    if (cluster.includes(requestCity) && cluster.includes(workshop.city)) return 'cluster'
  }

  return null
}

/**
 * City names a workshop can see on the request board. Own city is always
 * included (live behavior); areas/cluster additions require the flag.
 * `knownCityNames` bounds areas_served free-text to actual configured cities.
 */
export function visibleCityNamesForWorkshop(
  workshop: Pick<V2EligibilityWorkshop, 'city' | 'areasServed' | 'serviceAreaMode' | 'clusterOptIn'>,
  opts: {
    areasServedMatchingOn: boolean
    knownCityNames: string[]
    /** Display names in the WORKSHOP city's cluster (incl. its own city). */
    workshopClusterCityNames?: string[]
  },
): string[] {
  const names = new Set<string>()
  if (workshop.city) names.add(workshop.city)
  if (!opts.areasServedMatchingOn) return [...names]

  const mode = workshop.serviceAreaMode ?? 'city'

  if (mode === 'areas') {
    const known = new Map(opts.knownCityNames.map((name) => [normalizeAreaKey(name), name]))
    for (const area of workshop.areasServed ?? []) {
      const match = known.get(normalizeAreaKey(area))
      if (match) names.add(match)
    }
  }

  if (mode === 'cluster' && workshop.clusterOptIn === true) {
    for (const name of opts.workshopClusterCityNames ?? []) names.add(name)
  }

  return [...names]
}

// ---------------------------------------------------------------------------
// Full eligibility evaluation (contract §3.1 semantics)
// ---------------------------------------------------------------------------

/**
 * Which workshops see a request / may quote on it. Pure predicate with
 * machine-readable reason codes (returned by v2-eligibility-check).
 */
export function evaluateWorkshopEligibility(
  workshop: V2EligibilityWorkshop,
  request: V2EligibilityRequest,
  ctx: V2EligibilityContext,
): V2EligibilityResult {
  const reasons: string[] = []

  // Activity standing: approved, and not churned out of the lifecycle.
  if (!workshop.approved) reasons.push('workshop_not_approved')
  if (workshop.onboardingState === 'churned') reasons.push('workshop_churned')

  // Request must be published and still open for quotes.
  if (request.adminStatus !== 'approved') reasons.push('request_not_approved')
  if (!(V2_OPEN_REQUEST_STATUSES as readonly string[]).includes(request.status)) {
    reasons.push('request_not_open')
  }

  // Quote-slot availability: <3 sent quotes (existing 3-slot rule).
  if ((request.sentQuotes ?? 0) >= V2_MAX_QUOTES_PER_REQUEST) reasons.push('request_full')

  // Service-category awareness where supported: only restricts when the
  // workshop has declared a non-empty services list.
  const services = workshop.services ?? []
  if (services.length > 0 && !services.includes(request.repairCategory)) {
    reasons.push('category_not_offered')
  }

  const matchedVia = matchWorkshopToRequestCity(workshop, request.city, ctx)
  if (!matchedVia) reasons.push('no_city_match')

  return { eligible: reasons.length === 0, reasons, matchedVia }
}

// ---------------------------------------------------------------------------
// City-state auto-approve decision (contract §2.1 + seed notes)
// ---------------------------------------------------------------------------

export type V2AutoApproveDecision = 'approve' | 'manual_review' | 'legacy_gate'

export interface V2CityDecisionConfig {
  state: string
  demandOpen: boolean
  autoApproveRequests: boolean
}

/**
 * Should submit-bike-request auto-approve a new request in this city?
 *
 *  - No config row        → 'legacy_gate' (V1 behavior: active-workshop gate).
 *  - demand_open=false    → 'manual_review' (RESEARCH/PAUSED soft-gate).
 *  - SUPPLY_BUILDING      → 'manual_review' (always pending + founder review).
 *  - LIMITED + auto flag  → 'approve' (cold-start inversion: auto-approve ON
 *                           regardless of 30-day activity).
 *  - ACTIVE               → 'legacy_gate' — the seeded Linköping note keeps the
 *                           existing 30-day-active gate until gate G-L1.
 */
export function v2AutoApproveForCity(config: V2CityDecisionConfig | null): V2AutoApproveDecision {
  if (!config) return 'legacy_gate'
  if (!config.demandOpen) return 'manual_review'
  switch (config.state) {
    case 'SUPPLY_BUILDING':
      return 'manual_review'
    case 'LIMITED':
      return config.autoApproveRequests ? 'approve' : 'manual_review'
    case 'ACTIVE':
      return 'legacy_gate'
    case 'RESEARCH':
    case 'PAUSED':
      return 'manual_review'
    default:
      return config.autoApproveRequests ? 'legacy_gate' : 'manual_review'
  }
}
