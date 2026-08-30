// V2 shared config schema — the single source of truth for enums, defaults and
// pure resolution rules shared by edge functions (Deno) and the frontend.
//
// Contract: docs/v2/CONTRACTS.md. This module is PURE: no imports, no I/O,
// no Deno/npm specifiers, so vitest (src/lib/v2) can import it directly.
// DB-touching wrappers live in flags.ts / pricing-config.ts / city-state.ts /
// events.ts (same folder).

// ---------------------------------------------------------------------------
// City activation states (migration 20260830_v2_contracts_01)
// ---------------------------------------------------------------------------

export const V2_CITY_STATES = [
  'RESEARCH',
  'SUPPLY_BUILDING',
  'LIMITED',
  'ACTIVE',
  'PAUSED',
] as const
export type V2CityState = (typeof V2_CITY_STATES)[number]

export const isV2CityState = (value: string): value is V2CityState =>
  (V2_CITY_STATES as readonly string[]).includes(value)

/**
 * Derived demand/auto-approve rules per state. v2_city_configs stores explicit
 * demand_open/auto_approve_requests columns so ops can override without a
 * deploy — these helpers are the DEFAULTS used when seeding or when a row is
 * missing, and by the frontend for display logic.
 */
export function stateDefaults(state: V2CityState): {
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
      return { demandOpen: false, autoApprove: false, publicSurfaces: false }
    case 'RESEARCH':
      return { demandOpen: false, autoApprove: false, publicSurfaces: false }
  }
}

/** ascii slug ↔ exact-match city name used by V1 tables (bike_repair_requests.city). */
export const V2_CITY_SLUG_TO_NAME: Record<string, string> = {
  linkoping: 'Linköping',
  norrkoping: 'Norrköping',
  uppsala: 'Uppsala',
  lund: 'Lund',
}

export const V2_CITY_NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(V2_CITY_SLUG_TO_NAME).map(([slug, name]) => [name, slug]),
)

export function citySlugFromName(cityName: string): string | null {
  if (V2_CITY_NAME_TO_SLUG[cityName]) return V2_CITY_NAME_TO_SLUG[cityName]
  const normalized = cityName
    .trim()
    .toLowerCase()
    .replace(/ö/g, 'o')
    .replace(/ä/g, 'a')
    .replace(/å/g, 'a')
  return normalized in V2_CITY_SLUG_TO_NAME ? normalized : null
}

export function cityNameFromSlug(slug: string): string | null {
  return V2_CITY_SLUG_TO_NAME[slug] ?? null
}

// ---------------------------------------------------------------------------
// Review / outcome / onboarding lifecycle states (contract §2.2–2.3)
// ---------------------------------------------------------------------------

export const V2_OUTCOME_STATES = [
  'pending',
  'reported_by_workshop',
  'confirmed_by_customer',
  'completed',
  'no_show',
  'cancelled',
  'disputed',
  'expired',
] as const
export type V2OutcomeState = (typeof V2_OUTCOME_STATES)[number]

export const V2_REVIEW_STATES = [
  'submitted',
  'verified',
  'published',
  'flagged',
  'rejected',
  'removed',
] as const
export type V2ReviewState = (typeof V2_REVIEW_STATES)[number]

/** A review may become 'verified' only when the outcome reached 'completed'. */
export function reviewCanVerify(outcomeState: V2OutcomeState): boolean {
  return outcomeState === 'completed'
}

/** Only published reviews count toward aggregates and public display. */
export const V2_REVIEW_PUBLIC_STATE: V2ReviewState = 'published'

export const V2_ONBOARDING_STATES = [
  'registered',
  'approved',
  'first_quote_sent',
  'first_win',
  'activated',
  'dormant',
  'churned',
] as const
export type V2OnboardingState = (typeof V2_ONBOARDING_STATES)[number]

/** V1 request status added by V2 (bike_repair_requests.status is plain text). */
export const V2_REQUEST_STATUS_AWAITING_RESELECTION = 'awaiting_reselection'

// ---------------------------------------------------------------------------
// Prisindex confidence (contract §2.5)
// ---------------------------------------------------------------------------

export const V2_PRICE_CONFIDENCE_LEVELS = [
  'insufficient',
  'low',
  'medium',
  'high',
] as const
export type V2PriceConfidence = (typeof V2_PRICE_CONFIDENCE_LEVELS)[number]

export const V2_PRICE_SAMPLE_LOW = 3
export const V2_PRICE_SAMPLE_MEDIUM = 10
export const V2_PRICE_SAMPLE_HIGH = 30

export function priceConfidence(sampleCount: number): V2PriceConfidence {
  if (sampleCount >= V2_PRICE_SAMPLE_HIGH) return 'high'
  if (sampleCount >= V2_PRICE_SAMPLE_MEDIUM) return 'medium'
  if (sampleCount >= V2_PRICE_SAMPLE_LOW) return 'low'
  return 'insufficient'
}

/** 'insufficient' is never publicly displayed (SQL RPC enforces the same). */
export function priceConfidenceIsDisplayable(c: V2PriceConfidence): boolean {
  return c !== 'insufficient'
}

// ---------------------------------------------------------------------------
// Canonical pricing config (contract §2.1 / invariant I1–I2)
// ---------------------------------------------------------------------------

export interface V2PricingConfig {
  key: string
  amountOre: number
  currency: string
  vatRate: number
  commissionBps: number
  creditPackMin: number
  creditPackMax: number
  creditUnitOre: number
  freeWinsOnSignup: number
  effectiveFrom: string
}

/**
 * The LIVE rule, identical to _shared/pricing.ts (LEAD_FEE_ORE = 5000).
 * Used as fallback when the config table is unreachable — values are the same,
 * so falling back never changes charging behavior.
 */
export const V2_LIVE_PRICING: V2PricingConfig = {
  key: 'winner_fee',
  amountOre: 5000, // 50 kr exkl. moms
  currency: 'SEK',
  vatRate: 0.25,
  commissionBps: 0, // 0% provision FÖR ALLTID
  creditPackMin: 1,
  creditPackMax: 100,
  creditUnitOre: 5000,
  freeWinsOnSignup: 2,
  effectiveFrom: '2026-08-30T00:00:00.000Z',
}

export interface V2PricingConfigRow {
  key: string
  amount_ore: number
  currency: string
  vat_rate: number
  commission_bps: number
  credit_pack_min: number
  credit_pack_max: number
  credit_unit_ore: number
  free_wins_on_signup: number
  effective_from: string
  active: boolean
}

/**
 * Resolve the effective pricing from config rows (newest active row wins).
 * Returns V2_LIVE_PRICING when no usable row exists. Throws never.
 * Invariant: commission is always 0 regardless of input (defense in depth —
 * the DB CHECK already enforces it).
 */
export function resolvePricingConfig(
  rows: V2PricingConfigRow[] | null | undefined,
  key = 'winner_fee',
): V2PricingConfig {
  const candidates = (rows ?? [])
    .filter((r) => r.key === key && r.active)
    .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))

  const row = candidates[0]
  if (!row) return V2_LIVE_PRICING

  return {
    key: row.key,
    amountOre: row.amount_ore,
    currency: row.currency || 'SEK',
    vatRate: Number(row.vat_rate),
    commissionBps: 0, // invariant I1 — never read from input
    creditPackMin: row.credit_pack_min,
    creditPackMax: row.credit_pack_max,
    creditUnitOre: row.credit_unit_ore,
    freeWinsOnSignup: row.free_wins_on_signup,
    effectiveFrom: row.effective_from,
  }
}

/** Gross amount (incl. VAT) in öre for a given net amount. */
export function grossOre(netOre: number, vatRate: number): number {
  return Math.round(netOre * (1 + vatRate))
}

// ---------------------------------------------------------------------------
// Feature flags (registry: contract §5)
// ---------------------------------------------------------------------------

export const V2_FLAG_KEYS = [
  'v2.liquidity.areas_served_matching',
  'v2.liquidity.zero_quote_rescue',
  'v2.liquidity.winner_reminders',
  'v2.liquidity.reselection',
  'v2.reviews.outcome_lifecycle',
  'v2.reviews.verified_reviews',
  'v2.directory.public_profiles',
  'v2.prisindex.engine',
  'v2.prisindex.public_display',
  'v2.datamoat.event_collection',
  'v2.seo.content_surface',
  'v2.retention.lifecycle',
  // S8 underflaggor (alla OFF; kräver v2.retention.lifecycle)
  'v2.retention.dormant_reactivation',
  'v2.retention.weekly_digest',
  'v2.retention.seasonal_reactivation',
  'v2.retention.performance_summary',
  'v2.retention.profile_nudge',
  'v2.retention.workshop_notifications',
  'v2.subscriptions.enabled',
  'v2.pricing.config_reader',
] as const
export type V2FlagKey = (typeof V2_FLAG_KEYS)[number]

export interface V2FeatureFlagRow {
  key: string
  enabled: boolean
  rollout: { cities?: string[]; percent?: number } | Record<string, unknown>
}

export type V2FlagMap = Partial<Record<V2FlagKey, V2FeatureFlagRow>>

/** Missing key = OFF. No exceptions. */
export function isFlagOn(flags: V2FlagMap | null | undefined, key: V2FlagKey): boolean {
  return flags?.[key]?.enabled === true
}

/** Stable 0-99 bucket for percent rollouts (deterministic per subject id). */
export function rolloutBucket(subjectId: string): number {
  let hash = 0
  for (let i = 0; i < subjectId.length; i++) {
    hash = (hash * 31 + subjectId.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 100
}

/**
 * City/percent-scoped flag check. `enabled=false` always wins; an empty/absent
 * rollout means "on for everyone".
 */
export function isFlagOnFor(
  flags: V2FlagMap | null | undefined,
  key: V2FlagKey,
  opts: { citySlug?: string | null; subjectId?: string | null } = {},
): boolean {
  const flag = flags?.[key]
  if (!flag || flag.enabled !== true) return false

  const rollout = (flag.rollout ?? {}) as { cities?: string[]; percent?: number }
  if (Array.isArray(rollout.cities) && rollout.cities.length > 0) {
    if (!opts.citySlug || !rollout.cities.includes(opts.citySlug)) return false
  }
  if (typeof rollout.percent === 'number' && rollout.percent < 100) {
    if (!opts.subjectId) return false
    if (rolloutBucket(opts.subjectId) >= rollout.percent) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Domain event catalog (contract §4)
// ---------------------------------------------------------------------------

export const V2_SERVER_EVENT_NAMES = [
  'request.submitted',
  'request.approved',
  'request.rejected',
  'request.closed',
  'request.zero_quote_at_24h',
  'request.zero_quote_at_close',
  'quote.sent',
  'quote.won',
  'quote.settled',
  'winner.reminded',
  'winner.stalled',
  'winner.reselected',
  'outcome.reported',
  'outcome.confirmed',
  'review.invited',
  'review.submitted',
  'review.verified',
  'review.published',
  'workshop.registered',
  'workshop.approved',
  'workshop.first_quote',
  'workshop.first_win',
  'workshop.activated',
  'workshop.dormant',
  'nudge.sent',
  'rescue.triggered',
  'ghosted.claimed',
  'ghosted.credited',
  'price_index.computed',
  'content.published',
  'retention.message_sent',
  'retention.unsubscribed',
  'subscription.started',
  'subscription.cancelled',
  'subscription.trial_ended',
] as const
export type V2ServerEventName = (typeof V2_SERVER_EVENT_NAMES)[number]

/** The ONLY names accepted by the public v2_emit_client_event RPC. */
export const V2_CLIENT_EVENT_NAMES = [
  'client.wizard_started',
  'client.wizard_step_completed',
  'client.wizard_submitted',
  'client.quote_card_viewed',
  'client.winner_selected_click',
  'client.directory_viewed',
  'client.profile_viewed',
  'client.estimator_used',
] as const
export type V2ClientEventName = (typeof V2_CLIENT_EVENT_NAMES)[number]

export const isV2ServerEventName = (name: string): name is V2ServerEventName =>
  (V2_SERVER_EVENT_NAMES as readonly string[]).includes(name)

export const isV2ClientEventName = (name: string): name is V2ClientEventName =>
  (V2_CLIENT_EVENT_NAMES as readonly string[]).includes(name)

/** Keys stripped from client payloads before insert (PII/secrets). */
export const V2_CLIENT_PAYLOAD_BLOCKED_KEYS = [
  'email',
  'phone',
  'name',
  'customer_name',
  'customer_email',
  'customer_phone',
  'token',
  'view_token',
  'password',
] as const

export const V2_CLIENT_PAYLOAD_MAX_BYTES = 4096

/** Client-side mirror of the RPC's sanitation (keep in sync with migration 06). */
export function sanitizeClientPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload ?? {})) {
    if ((V2_CLIENT_PAYLOAD_BLOCKED_KEYS as readonly string[]).includes(key)) continue
    clean[key] = value
  }
  return clean
}

export function clientPayloadSizeOk(payload: Record<string, unknown>): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).length <= V2_CLIENT_PAYLOAD_MAX_BYTES
  } catch {
    return false
  }
}
