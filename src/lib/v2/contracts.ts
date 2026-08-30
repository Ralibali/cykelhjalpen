// V2 frontend contracts — typed mirrors of docs/v2/CONTRACTS.md §3 and the
// edge-side _shared/v2/config-schema.ts. This module is dependency-free so any
// page/component can import it. Parity with the edge constants is enforced by
// contracts.test.ts (single-source check without a runtime cross-import).

// ---------------------------------------------------------------------------
// Enums / constants (mirror of _shared/v2/config-schema.ts — keep in sync)
// ---------------------------------------------------------------------------

export const V2_CITY_STATES = [
  'RESEARCH',
  'SUPPLY_BUILDING',
  'LIMITED',
  'ACTIVE',
  'PAUSED',
] as const
export type V2CityState = (typeof V2_CITY_STATES)[number]

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
  'v2.subscriptions.enabled',
  'v2.pricing.config_reader',
] as const
export type V2FlagKey = (typeof V2_FLAG_KEYS)[number]

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

export type V2OutcomeState =
  | 'pending'
  | 'reported_by_workshop'
  | 'confirmed_by_customer'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'disputed'
  | 'expired'

export type V2ReviewState =
  | 'submitted'
  | 'verified'
  | 'published'
  | 'flagged'
  | 'rejected'
  | 'removed'

export type V2PriceConfidence = 'insufficient' | 'low' | 'medium' | 'high'

export const V2_REQUEST_STATUS_AWAITING_RESELECTION = 'awaiting_reselection'

// ---------------------------------------------------------------------------
// Edge-function request/response shapes (contract §3)
// ---------------------------------------------------------------------------

export interface V2ErrorResponse {
  error: string
  code: string
}

// v2-eligibility-check
export interface V2EligibilityCheckRequest {
  workshop_id?: string
  request_id: string
}
export interface V2EligibilityCheckResponse {
  eligible: boolean
  reasons: string[]
  matched_via: 'city' | 'areas' | 'cluster' | null
  request_summary: { city: string; repair_category: string; status: string }
}

// v2-zero-quote-rescue / v2-winner-reminders / v2-stalled-winner-recovery
export interface V2CronDryRunRequest {
  dry_run?: boolean
  city_slug?: string
}
export interface V2ZeroQuoteRescueResponse {
  scanned: number
  actions: { request_id: string; action_type: string; status: string }[]
  skipped: number
}
export interface V2WinnerRemindersResponse {
  reminded: { response_id: string; stage: '2h' | '24h' }[]
  stalled: string[]
}
export interface V2StalledWinnerRecoveryResponse {
  recovered: { request_id: string; old_response_id: string }[]
}

// v2-reselect-winner
export interface V2ReselectWinnerRequest {
  token: string
  response_id: string
}
export interface V2ReselectWinnerResponse {
  request_id: string
  new_winner_response_id: string
  settlement: 'free_lead' | 'payment_required'
}

// v2-report-outcome / v2-confirm-outcome
export interface V2ReportOutcomeRequest {
  response_id: string
  outcome: 'completed' | 'no_show' | 'cancelled'
  final_price_sek?: number
  note?: string
}
export interface V2ConfirmOutcomeRequest {
  token: string
  outcome: 'completed' | 'no_show' | 'cancelled' | 'disputed'
  final_price_sek?: number
  note?: string
}
export interface V2OutcomeResponse {
  outcome_id: string
  state: V2OutcomeState
  review_invited?: boolean
}

// v2-submit-review / v2-respond-review / v2-moderate-review
export interface V2SubmitReviewRequest {
  token: string
  rating: 1 | 2 | 3 | 4 | 5
  body?: string
}
export interface V2SubmitReviewResponse {
  review_id: string
  state: V2ReviewState
  published: boolean
}
export interface V2RespondReviewRequest {
  review_id: string
  response: string
}
export interface V2ModerateReviewRequest {
  review_id: string
  action: 'publish' | 'flag' | 'reject' | 'remove'
  note?: string
}

// v2-get-public-workshop
export interface V2PublicWorkshop {
  workshop_id: string
  slug: string
  company_name: string
  city: string
  city_slug: string | null
  cluster_slug: string | null
  services: string[] | null
  areas_served: string[] | null
  logo_url: string | null
  website: string | null
  bio_short: string | null
  created_year: number | null
  published_review_count: number
  avg_rating: number | null
  last_review_at: string | null
}
export interface V2PublicReview {
  rating: number
  body: string | null
  published_at: string
  workshop_response: string | null
}
export interface V2GetPublicWorkshopResponse {
  workshop: V2PublicWorkshop
  reviews: V2PublicReview[]
}

// v2-claim-ghosted-lead
export interface V2ClaimGhostedLeadRequest {
  response_id: string
  customer_unreachable_since: string
  evidence_note?: string
}
export interface V2ClaimGhostedLeadResponse {
  claim_id: string
  status: 'pending'
}

// v2-get-price-index (RPC v2_get_price_index)
export interface V2PriceIndexRow {
  repair_category: string
  sample_count: number | null
  median_sek: number | null
  p25_sek: number | null
  p75_sek: number | null
  confidence: V2PriceConfidence | 'riktpris'
  window_end: string | null
  kind: 'stats' | 'riktpris'
}
export interface V2GetPriceIndexResponse {
  rows: V2PriceIndexRow[]
  sample_gated: boolean
}

// v2-create-subscription-checkout / v2-admin-entitlement-override
export interface V2CreateSubscriptionCheckoutRequest {
  plan_code: string
}
export interface V2CreateSubscriptionCheckoutResponse {
  checkout_url: string
}
export interface V2EntitlementOverrideRequest {
  workshop_id: string
  entitlement_key: string
  value?: unknown
  expires_at?: string
  reason: string
}

// ---------------------------------------------------------------------------
// Row types for the new tables (until supabase types are regenerated, S13)
// ---------------------------------------------------------------------------

export interface V2FeatureFlagRow {
  key: V2FlagKey | string
  enabled: boolean
  rollout: { cities?: string[]; percent?: number }
  description: string
  updated_at: string
}

export interface V2CityConfigRow {
  city_slug: string
  city_name: string
  state: V2CityState
  cluster_slug: string | null
  demand_open: boolean
  auto_approve_requests: boolean
  directory_indexable: boolean
  price_index_public: boolean
  target_active_workshops: number
  notes: string | null
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
