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
// Subscriptions / tiers (contract §2.8) — capability, OFF by default (G-S1)
// ---------------------------------------------------------------------------

export const V2_PLAN_CODES = ['pay_per_win', 'pro', 'pro_plus'] as const
export type V2PlanCode = (typeof V2_PLAN_CODES)[number]

export const isV2PlanCode = (value: string): value is V2PlanCode =>
  (V2_PLAN_CODES as readonly string[]).includes(value)

/**
 * Entitlement key registry (contract §2.8). Extend ONLY via contract revision.
 * Unknown keys in plan/override rows are dropped by the resolver — a typo must
 * never silently grant something.
 */
export const V2_ENTITLEMENT_KEYS = [
  'directory_featured',
  'priority_slots',
  'free_wins_per_month',
  'price_index_early_access',
  'profile_rich_modules',
] as const
export type V2EntitlementKey = (typeof V2_ENTITLEMENT_KEYS)[number]

export const isV2EntitlementKey = (value: string): value is V2EntitlementKey =>
  (V2_ENTITLEMENT_KEYS as readonly string[]).includes(value)

export type V2EntitlementMap = Partial<Record<V2EntitlementKey, unknown>>

export const V2_SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
] as const
export type V2SubscriptionStatus = (typeof V2_SUBSCRIPTION_STATUSES)[number]

/** Statuses that entitle the workshop to its plan's entitlements. */
export const V2_SUBSCRIPTION_LIVE_STATUSES: readonly V2SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
]

export interface V2PlanRow {
  code: string
  name: string
  price_ore_monthly: number
  currency: string
  stripe_price_id: string | null
  trial_days: number
  entitlements: Record<string, unknown>
  active: boolean
}

export interface V2WorkshopSubscriptionRow {
  id: string
  workshop_id: string
  plan_code: string
  status: V2SubscriptionStatus
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  cancelled_at: string | null
  granted_by_admin: boolean
  override_reason: string | null
}

export interface V2EntitlementOverrideRow {
  id: string
  workshop_id: string
  entitlement_key: string
  value: unknown
  expires_at: string | null
  granted_by: string | null
  reason: string
  created_at: string
}

/** The always-available default: today's pay-per-win model, no entitlements. */
export const V2_DEFAULT_PLAN_CODE: V2PlanCode = 'pay_per_win'

/**
 * Resolve a workshop's effective entitlements.
 *
 * - Plan entitlements apply only while the subscription is in a LIVE status
 *   (pass `subscriptionStatus: null` when there is no live row → nothing).
 * - Admin overrides apply regardless of subscription state, until expires_at.
 * - Override value `false`/`null` REVOKES the key (audit row kept in the DB).
 * - Unknown keys are dropped everywhere (registry above is authoritative).
 *
 * Pure: no I/O. Callers decide the flag gating.
 */
export function resolveV2Entitlements(input: {
  planEntitlements?: Record<string, unknown> | null
  subscriptionStatus?: V2SubscriptionStatus | null
  overrides?: V2EntitlementOverrideRow[] | null
  now?: Date
}): V2EntitlementMap {
  const now = input.now ?? new Date()
  const resolved: V2EntitlementMap = {}

  const planIsLive =
    input.subscriptionStatus != null &&
    V2_SUBSCRIPTION_LIVE_STATUSES.includes(input.subscriptionStatus)

  if (planIsLive) {
    for (const [key, value] of Object.entries(input.planEntitlements ?? {})) {
      if (!isV2EntitlementKey(key)) continue
      if (value === false || value == null) continue
      resolved[key] = value
    }
  }

  for (const override of input.overrides ?? []) {
    if (!isV2EntitlementKey(override.entitlement_key)) continue
    if (override.expires_at && new Date(override.expires_at) <= now) continue
    if (override.value === false || override.value == null) {
      delete resolved[override.entitlement_key]
    } else {
      resolved[override.entitlement_key] = override.value
    }
  }

  return resolved
}

// ---------------------------------------------------------------------------
// Stripe subscription webhook state mapping (contract §3.8)
// ---------------------------------------------------------------------------

/**
 * Map a Stripe subscription status to the contract's v2 status enum.
 * Unknown statuses return null → the webhook stores nothing new.
 * `incomplete` (first payment pending) and `paused` map to `past_due`:
 * the workshop must not gain entitlements from an unpaid subscription.
 */
export function v2SubscriptionStatusFromStripe(
  stripeStatus: string,
): V2SubscriptionStatus | null {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'paused':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    case 'incomplete_expired':
      return 'expired'
    default:
      return null
  }
}

/**
 * Duck-typed Stripe subscription shape (apiVersion 2025-08-27.basil moved
 * current_period_end to items; we accept both). Pure so vitest can drive the
 * webhook's state transitions with mocked payloads.
 */
export interface V2StripeSubscriptionLike {
  id: string
  status: string
  customer: string | { id: string } | null
  trial_end?: number | null
  canceled_at?: number | null
  current_period_end?: number | null
  items?: { data?: Array<{ current_period_end?: number | null }> } | null
  metadata?: Record<string, string> | null
}

export interface V2SubscriptionPatch {
  status: V2SubscriptionStatus
  stripe_subscription_id: string
  stripe_customer_id: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  cancelled_at: string | null
}

const unixToIso = (seconds: number | null | undefined): string | null =>
  typeof seconds === 'number' && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null

/**
 * Build the v2_workshop_subscriptions patch for a Stripe subscription object.
 * Returns null when the status is unknown (webhook then ignores the event).
 */
export function v2SubscriptionPatchFromStripe(
  sub: V2StripeSubscriptionLike,
): V2SubscriptionPatch | null {
  const status = v2SubscriptionStatusFromStripe(sub.status)
  if (!status) return null

  const customerId =
    typeof sub.customer === 'string'
      ? sub.customer
      : (sub.customer?.id ?? null)

  const periodEnd =
    sub.current_period_end ??
    sub.items?.data?.find((item) => typeof item?.current_period_end === 'number')
      ?.current_period_end ??
    null

  return {
    status,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    trial_ends_at: unixToIso(sub.trial_end),
    current_period_end: unixToIso(periodEnd),
    cancelled_at: unixToIso(sub.canceled_at),
  }
}


// Pricing experiments (contract §2.8) — INERT until flagged (G-X1) and seeded
// active=false. Invariants enforced HERE:
//  - experiments can only carry winner_fee_ore; commission is ALWAYS 0 (I1) —
//    variants have no commission field and resolvers never read one.
//  - never retroactive: nothing here touches already-won responses; callers
//    may only use a resolved variant for NEW settlements.
// ---------------------------------------------------------------------------

export interface V2PricingExperimentVariant {
  name: string
  winner_fee_ore: number
  weight?: number
}

export interface V2PricingExperimentRow {
  key: string
  variants: V2PricingExperimentVariant[]
  active: boolean
  started_at: string | null
  ended_at: string | null
}

export interface V2ResolvedExperiment {
  key: string
  variant: string
  winnerFeeOre: number
}

/**
 * Resolve an active pricing experiment to a display/config winner fee.
 *
 * HARD INVARIANTS (contract §2.8, I1–I2):
 * - Returns null unless the caller has verified the flag (pass flagOn) AND the
 *   row is active AND within its started/ended window. Default = live rule.
 * - The result carries ONLY a winner fee in öre. Commission is not part of
 *   the experiment surface at all — commissionBps is always 0 (I1).
 * - Experiments never apply retroactively: this resolver is for NEW display /
 *   config reads only. Already-won responses settle via the live rule path.
 * - Variant choice is deterministic per subjectId (weighted buckets), so a
 *   workshop always sees the same price.
 */
export function resolvePricingExperiment(
  row: V2PricingExperimentRow | null | undefined,
  opts: { flagOn: boolean; subjectId?: string | null; now?: Date },
): V2ResolvedExperiment | null {
  if (!opts.flagOn || !row || row.active !== true) return null

  const now = opts.now ?? new Date()
  if (row.started_at && new Date(row.started_at) > now) return null
  if (row.ended_at && new Date(row.ended_at) <= now) return null

  const variants = (row.variants ?? []).filter(
    (v) =>
      v &&
      typeof v.name === 'string' &&
      Number.isInteger(v.winner_fee_ore) &&
      v.winner_fee_ore > 0 &&
      (v.weight == null || (typeof v.weight === 'number' && v.weight > 0)),
  )
  if (variants.length === 0) return null

  const totalWeight = variants.reduce((sum, v) => sum + (v.weight ?? 1), 0)
  const bucket = rolloutBucket(opts.subjectId ?? row.key) // 0-99
  let cursor = (bucket / 100) * totalWeight
  let picked = variants[variants.length - 1]
  for (const variant of variants) {
    cursor -= variant.weight ?? 1
    if (cursor < 0) {
      picked = variant
      break
    }
  }

  return { key: row.key, variant: picked.name, winnerFeeOre: picked.winner_fee_ore }
}

/**
 * Deterministically resolve a subject's variant for an experiment.
 * Returns null (→ live rule applies) when the experiment is inactive, ended,
 * malformed, or no subjectId is given (no bucketing without a stable subject).
 */
export function resolveExperimentVariant(
  row: V2PricingExperimentRow | null | undefined,
  subjectId: string | null | undefined,
  nowIso?: string,
): V2PricingExperimentVariant | null {
  if (!row || row.active !== true) return null
  if (!subjectId) return null
  if (row.ended_at && row.ended_at <= (nowIso ?? new Date().toISOString())) return null

  const variants = (row.variants ?? []).filter(
    (v) => v && typeof v.name === 'string' && typeof v.winner_fee_ore === 'number' && v.winner_fee_ore >= 0,
  )
  if (variants.length === 0) return null

  const totalWeight = variants.reduce((sum, v) => sum + Math.max(0, v.weight ?? 1), 0)
  if (totalWeight <= 0) return null

  let cursor = rolloutBucket(`${row.key}:${subjectId}`) / 100 * totalWeight
  for (const variant of variants) {
    cursor -= Math.max(0, variant.weight ?? 1)
    if (cursor < 0) return variant
  }
  return variants[variants.length - 1]
}

// ---------------------------------------------------------------------------
// Feature flags (registry: contract §5)
// ---------------------------------------------------------------------------

export const V2_FLAG_KEYS = [
  'v2.liquidity.areas_served_matching',
  'v2.liquidity.city_state_messaging',
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
  // Catalog extension (S6, 2026-08-31): contact unlock is a distinct money-path
  // milestone the contract catalog lacked; payload carries no PII.
  'contact.unlocked',
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
