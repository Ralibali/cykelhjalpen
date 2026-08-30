// V2 outcome & review lifecycle state machine (S3). Contract: docs/v2/CONTRACTS.md §2.3.
//
// Pure, dependency-free functions shared by the v2-* edge functions and the
// vitest suite (src/lib/v2/outcome-lifecycle.test.ts imports this file
// directly, same pattern as contracts.test.ts ↔ config-schema.ts).
//
// Lifecycle (§2.3):
//   pending (winner settled)
//     → workshop reports done            → reported_by_workshop
//     → customer confirms completed      → completed (completion evidence)
//     → reported_by_workshop + 7 days without customer dispute → completed
//     → no_show | cancelled | disputed   → terminal, admin-handled
//     → 90 days without signal           → expired
//
// Reviews: 'verified' ONLY when the outcome is 'completed' (never merely
// because a winner was selected — dim12 trust audit). 'published' = verified
// + moderation auto-pass (§2.3). Aggregates count 'published' only (I5).

import {
  reviewCanVerify,
  type V2OutcomeState,
  type V2ReviewState,
} from './config-schema.ts'

export const V2_WORKSHOP_REPORTS = ['completed', 'no_show', 'cancelled'] as const
export type V2WorkshopReport = (typeof V2_WORKSHOP_REPORTS)[number]

export const V2_CUSTOMER_CONFIRMATIONS = ['completed', 'no_show', 'cancelled', 'disputed'] as const
export type V2CustomerConfirmation = (typeof V2_CUSTOMER_CONFIRMATIONS)[number]

export const V2_MODERATION_ACTIONS = ['publish', 'flag', 'reject', 'remove'] as const
export type V2ModerationAction = (typeof V2_MODERATION_ACTIONS)[number]

/** Days a workshop completion report must stand undisputed before auto-complete. */
export const V2_DISPUTE_WINDOW_DAYS = 7
/** Days without any signal before an outcome expires. */
export const V2_OUTCOME_EXPIRY_DAYS = 90
/** Review invite cadence after the winner settled (days). */
export const V2_INVITE_DAYS = [3, 10] as const
/** Abuse cap: one review per (workshop, customer email) per this many days. */
export const V2_REVIEW_EMAIL_WINDOW_DAYS = 180
/** Abuse cap: max review submissions per customer email per 24 h (429). */
export const V2_REVIEW_DAILY_LIMIT = 3

export const DAY_MS = 24 * 60 * 60 * 1000

const TERMINAL_OUTCOME_STATES: readonly V2OutcomeState[] = [
  'completed',
  'no_show',
  'cancelled',
  'disputed',
  'expired',
]

export function isTerminalOutcomeState(state: V2OutcomeState): boolean {
  return TERMINAL_OUTCOME_STATES.includes(state)
}

export interface OutcomeTransition {
  state: V2OutcomeState
  changed: boolean
}

/**
 * Workshop reports the result of a won, settled job.
 * 'completed' from the workshop alone is NOT completion evidence — it moves
 * to reported_by_workshop and awaits customer confirmation or the 7-day
 * dispute window (autoCompletedOutcome).
 */
export function applyWorkshopReport(
  state: V2OutcomeState,
  report: V2WorkshopReport,
): OutcomeTransition {
  if (state === 'pending' || state === 'reported_by_workshop') {
    if (report === 'completed') {
      return { state: 'reported_by_workshop', changed: state !== 'reported_by_workshop' }
    }
    // 'no_show' | 'cancelled' — kan aldrig sammanfalla med nuvarande state här.
    return { state: report, changed: true }
  }
  // Terminal states (incl. customer-confirmed completed) are not rewritten
  // by a later workshop report — idempotent no-op.
  return { state, changed: false }
}

/**
 * Customer confirms the outcome via the token link. A customer 'completed'
 * confirmation IS completion evidence (§2.3) → state 'completed' directly.
 */
export function applyCustomerConfirm(
  state: V2OutcomeState,
  confirmation: V2CustomerConfirmation,
): OutcomeTransition {
  if (isTerminalOutcomeState(state)) return { state, changed: false }
  if (confirmation === 'completed') return { state: 'completed', changed: state !== 'completed' }
  return { state: confirmation, changed: state !== confirmation }
}

/**
 * Auto-completion: workshop reported done and the customer did not dispute
 * within V2_DISPUTE_WINDOW_DAYS → completion evidence { source: 'workshop_report' }.
 */
export function autoCompletedOutcome(
  state: V2OutcomeState,
  workshopReportedAt: string | null,
  now: Date,
): boolean {
  if (state !== 'reported_by_workshop' || !workshopReportedAt) return false
  const reported = new Date(workshopReportedAt).getTime()
  if (Number.isNaN(reported)) return false
  return now.getTime() - reported >= V2_DISPUTE_WINDOW_DAYS * DAY_MS
}

/** 90 days without any signal → expired. */
export function expiredOutcome(
  state: V2OutcomeState,
  createdAt: string,
  now: Date,
): boolean {
  if (state !== 'pending') return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return now.getTime() - created >= V2_OUTCOME_EXPIRY_DAYS * DAY_MS
}

/** Which invite step (0 = +3d, 1 = +10d) is due, or null. */
export function dueInviteStep(
  state: V2OutcomeState,
  createdAt: string,
  inviteCount: number,
  now: Date,
): number | null {
  if (state !== 'pending' && state !== 'reported_by_workshop') return null
  if (inviteCount >= V2_INVITE_DAYS.length) return null
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return null
  const ageDays = (now.getTime() - created) / DAY_MS
  return ageDays >= V2_INVITE_DAYS[inviteCount] ? inviteCount : null
}

/**
 * Review-submit eligibility (mission: "only when lifecycle state = eligible").
 * The customer may review once the service is plausibly delivered: workshop
 * reported done, customer confirmed, or outcome completed. Never on a bare
 * 'pending' (winner selected is NOT evidence — dim12) nor on terminal
 * non-completed states.
 */
export function reviewEligible(state: V2OutcomeState): boolean {
  return state === 'reported_by_workshop'
    || state === 'confirmed_by_customer'
    || state === 'completed'
}

export interface ReviewSubmissionDecision {
  /** State the new review row gets on insert. */
  state: V2ReviewState
  /** Auto-pass moderation (§2.3): verified reviews publish unless flagged. */
  published: boolean
}

/**
 * State a freshly submitted review lands in. Verified iff the outcome has
 * completion evidence; otherwise 'submitted' and the completion path
 * (promoteReviewsOnCompletion) promotes it later.
 */
export function reviewStateOnSubmit(outcomeState: V2OutcomeState): ReviewSubmissionDecision {
  if (reviewCanVerify(outcomeState)) return { state: 'verified', published: true }
  return { state: 'submitted', published: false }
}

/**
 * Completion path promotion: when an outcome reaches 'completed', its
 * 'submitted' review becomes 'verified' and auto-passes moderation →
 * 'published' (§2.3). Returns the state a review in `reviewState` moves to.
 */
export function reviewStateOnCompletion(reviewState: V2ReviewState): V2ReviewState {
  return reviewState === 'submitted' ? 'published' : reviewState
}

/** Moderation transitions (admin). Guards I5: publish requires verified evidence. */
export function applyModeration(
  state: V2ReviewState,
  action: V2ModerationAction,
  outcomeCompleted: boolean,
): { state: V2ReviewState; changed: boolean } {
  switch (action) {
    case 'publish':
      // Never publish unverified evidence (dim12/I5).
      if (!outcomeCompleted) return { state, changed: false }
      if (state === 'verified' || state === 'flagged') return { state: 'published', changed: true }
      return { state, changed: false }
    case 'flag':
      if (state === 'submitted' || state === 'verified' || state === 'published') {
        return { state: 'flagged', changed: true }
      }
      return { state, changed: false }
    case 'reject':
      if (state === 'submitted' || state === 'verified' || state === 'flagged') {
        return { state: 'rejected', changed: true }
      }
      return { state, changed: false }
    case 'remove':
      if (state === 'published' || state === 'flagged') return { state: 'removed', changed: true }
      return { state, changed: false }
  }
}

/** Workshop may answer visible reviews (published or flagged-for-review). */
export function workshopCanRespond(state: V2ReviewState): boolean {
  return state === 'published' || state === 'flagged'
}

// ---------------------------------------------------------------------------
// Aggregate math — pure mirror of the v2_refresh_workshop_review_stats()
// trigger (migration 20260830_v2_contracts_03). Keep in sync: published only.
// ---------------------------------------------------------------------------

export interface ReviewStatsInput {
  rating: number
  state: V2ReviewState
  created_at: string
}

export interface ReviewStats {
  published_count: number
  avg_rating: number | null
  last_published_at: string | null
}

export function computeReviewStats(reviews: ReviewStatsInput[]): ReviewStats {
  const published = reviews.filter((r) => r.state === 'published')
  if (published.length === 0) {
    return { published_count: 0, avg_rating: null, last_published_at: null }
  }
  const sum = published.reduce((acc, r) => acc + r.rating, 0)
  const avg = Math.round((sum / published.length) * 100) / 100
  const last = published.reduce(
    (max, r) => (r.created_at > max ? r.created_at : max),
    published[0].created_at,
  )
  return { published_count: published.length, avg_rating: avg, last_published_at: last }
}
