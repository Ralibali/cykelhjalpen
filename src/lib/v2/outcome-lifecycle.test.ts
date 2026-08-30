// V2 outcome & review lifecycle tests (S3). Contract: docs/v2/CONTRACTS.md §2.3/§3.3.
// Imports the edge single source of truth directly (same pattern as
// contracts.test.ts ↔ config-schema.ts).

import { describe, expect, it } from 'vitest'

import {
  DAY_MS,
  V2_DISPUTE_WINDOW_DAYS,
  V2_INVITE_DAYS,
  V2_OUTCOME_EXPIRY_DAYS,
  applyCustomerConfirm,
  applyModeration,
  applyWorkshopReport,
  autoCompletedOutcome,
  computeReviewStats,
  dueInviteStep,
  expiredOutcome,
  isTerminalOutcomeState,
  reviewEligible,
  reviewStateOnCompletion,
  reviewStateOnSubmit,
  workshopCanRespond,
} from '../../../supabase/functions/_shared/v2/outcome-lifecycle'
import { reviewCanVerify } from '../../../supabase/functions/_shared/v2/config-schema'

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString()
/** Deterministisk offset relativt ett givet 'now' (marginal mot gränsflak). */
const before = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS - 1000).toISOString()

describe('outcome lifecycle — workshop report', () => {
  it('pending + completed-report → reported_by_workshop (inte completed)', () => {
    expect(applyWorkshopReport('pending', 'completed')).toEqual({
      state: 'reported_by_workshop',
      changed: true,
    })
  })

  it('pending + no_show/cancelled → terminalt state', () => {
    expect(applyWorkshopReport('pending', 'no_show')).toEqual({ state: 'no_show', changed: true })
    expect(applyWorkshopReport('pending', 'cancelled')).toEqual({ state: 'cancelled', changed: true })
  })

  it('upprepad completed-rapport är idempotent', () => {
    expect(applyWorkshopReport('reported_by_workshop', 'completed')).toEqual({
      state: 'reported_by_workshop',
      changed: false,
    })
  })

  it('terminala states skrivs aldrig om av verkstadsrapport', () => {
    for (const state of ['completed', 'no_show', 'cancelled', 'disputed', 'expired'] as const) {
      expect(applyWorkshopReport(state, 'completed').changed).toBe(false)
      expect(applyWorkshopReport(state, 'completed').state).toBe(state)
    }
  })
})

describe('outcome lifecycle — customer confirm', () => {
  it('kundbekräftat completed är completion evidence → completed direkt', () => {
    expect(applyCustomerConfirm('pending', 'completed')).toEqual({ state: 'completed', changed: true })
    expect(applyCustomerConfirm('reported_by_workshop', 'completed')).toEqual({ state: 'completed', changed: true })
  })

  it('dispute från reported_by_workshop → disputed', () => {
    expect(applyCustomerConfirm('reported_by_workshop', 'disputed')).toEqual({ state: 'disputed', changed: true })
  })

  it('terminala states kan inte bekräftas om', () => {
    for (const state of ['completed', 'no_show', 'cancelled', 'disputed', 'expired'] as const) {
      expect(applyCustomerConfirm(state, 'completed').changed).toBe(false)
    }
  })
})

describe('outcome lifecycle — auto-completion & expiry', () => {
  it('reported_by_workshop + 7 dagar utan dispute → completed', () => {
    const now = new Date()
    expect(autoCompletedOutcome('reported_by_workshop', before(now, V2_DISPUTE_WINDOW_DAYS), now)).toBe(true)
    expect(autoCompletedOutcome('reported_by_workshop', daysAgo(V2_DISPUTE_WINDOW_DAYS - 1), now)).toBe(false)
  })

  it('auto-completion kräver workshop-rapport', () => {
    expect(autoCompletedOutcome('pending', daysAgo(30), new Date())).toBe(false)
    expect(autoCompletedOutcome('reported_by_workshop', null, new Date())).toBe(false)
  })

  it('pending + 90 dagar utan signal → expired', () => {
    const now = new Date()
    expect(expiredOutcome('pending', before(now, V2_OUTCOME_EXPIRY_DAYS), now)).toBe(true)
    expect(expiredOutcome('pending', daysAgo(V2_OUTCOME_EXPIRY_DAYS - 1), now)).toBe(false)
    expect(expiredOutcome('reported_by_workshop', daysAgo(200), now)).toBe(false)
  })

  it('inbjudan +3d/+10d med kadens per steg', () => {
    const now = new Date()
    expect(dueInviteStep('pending', before(now, V2_INVITE_DAYS[0]), 0, now)).toBe(0)
    expect(dueInviteStep('pending', daysAgo(V2_INVITE_DAYS[0] - 1), 0, now)).toBe(null)
    expect(dueInviteStep('pending', before(now, V2_INVITE_DAYS[1]), 1, now)).toBe(1)
    expect(dueInviteStep('pending', daysAgo(30), V2_INVITE_DAYS.length, now)).toBe(null)
    expect(dueInviteStep('completed', daysAgo(30), 0, now)).toBe(null)
  })
})

describe('review eligibility & verification gates', () => {
  it('recension är aldrig eligible på enbart vald vinnare (pending)', () => {
    expect(reviewEligible('pending')).toBe(false)
    expect(reviewEligible('no_show')).toBe(false)
    expect(reviewEligible('cancelled')).toBe(false)
    expect(reviewEligible('disputed')).toBe(false)
    expect(reviewEligible('expired')).toBe(false)
  })

  it('eligible när tjänsten är levererad', () => {
    expect(reviewEligible('reported_by_workshop')).toBe(true)
    expect(reviewEligible('confirmed_by_customer')).toBe(true)
    expect(reviewEligible('completed')).toBe(true)
  })

  it('verified kräver completion evidence — aldrig pga vald vinnare', () => {
    expect(reviewCanVerify('completed')).toBe(true)
    for (const state of ['pending', 'reported_by_workshop', 'confirmed_by_customer', 'no_show', 'cancelled', 'disputed', 'expired'] as const) {
      expect(reviewCanVerify(state)).toBe(false)
    }
  })

  it('ny recension: verified+publicerad vid completed, annars submitted', () => {
    expect(reviewStateOnSubmit('completed')).toEqual({ state: 'verified', published: true })
    expect(reviewStateOnSubmit('reported_by_workshop')).toEqual({ state: 'submitted', published: false })
  })

  it('completion path befordrar submitted → published, rör inte andra states', () => {
    expect(reviewStateOnCompletion('submitted')).toBe('published')
    expect(reviewStateOnCompletion('flagged')).toBe('flagged')
    expect(reviewStateOnCompletion('rejected')).toBe('rejected')
  })
})

describe('moderation transitions', () => {
  it('publish kräver completed outcome (I5)', () => {
    expect(applyModeration('verified', 'publish', false).changed).toBe(false)
    expect(applyModeration('verified', 'publish', true)).toEqual({ state: 'published', changed: true })
    expect(applyModeration('flagged', 'publish', true)).toEqual({ state: 'published', changed: true })
    expect(applyModeration('submitted', 'publish', true).changed).toBe(false)
  })

  it('flag/reject/remove följer tillåtna övergångar', () => {
    expect(applyModeration('published', 'flag', true)).toEqual({ state: 'flagged', changed: true })
    expect(applyModeration('rejected', 'flag', true).changed).toBe(false)
    expect(applyModeration('submitted', 'reject', false)).toEqual({ state: 'rejected', changed: true })
    expect(applyModeration('published', 'reject', true).changed).toBe(false)
    expect(applyModeration('published', 'remove', true)).toEqual({ state: 'removed', changed: true })
    expect(applyModeration('submitted', 'remove', false).changed).toBe(false)
  })

  it('verkstad svarar bara på synliga recensioner', () => {
    expect(workshopCanRespond('published')).toBe(true)
    expect(workshopCanRespond('flagged')).toBe(true)
    expect(workshopCanRespond('submitted')).toBe(false)
    expect(workshopCanRespond('removed')).toBe(false)
  })

  it('terminala outcome-states identifieras', () => {
    expect(isTerminalOutcomeState('completed')).toBe(true)
    expect(isTerminalOutcomeState('pending')).toBe(false)
  })
})

describe('aggregate math (spegel av triggern, published only)', () => {
  it('räknar bara publicerade recensioner', () => {
    const stats = computeReviewStats([
      { rating: 5, state: 'published', created_at: '2026-01-01T00:00:00Z' },
      { rating: 1, state: 'submitted', created_at: '2026-01-02T00:00:00Z' },
      { rating: 1, state: 'flagged', created_at: '2026-01-03T00:00:00Z' },
      { rating: 3, state: 'published', created_at: '2026-01-04T00:00:00Z' },
      { rating: 5, state: 'removed', created_at: '2026-01-05T00:00:00Z' },
    ])
    expect(stats.published_count).toBe(2)
    expect(stats.avg_rating).toBe(4)
    expect(stats.last_published_at).toBe('2026-01-04T00:00:00Z')
  })

  it('avrundar avg till två decimaler som SQL round(numeric, 2)', () => {
    const stats = computeReviewStats([
      { rating: 5, state: 'published', created_at: '2026-01-01T00:00:00Z' },
      { rating: 4, state: 'published', created_at: '2026-01-02T00:00:00Z' },
      { rating: 4, state: 'published', created_at: '2026-01-03T00:00:00Z' },
    ])
    expect(stats.avg_rating).toBe(4.33)
  })

  it('tom verkstad → nollräkning, null-avg', () => {
    expect(computeReviewStats([])).toEqual({
      published_count: 0,
      avg_rating: null,
      last_published_at: null,
    })
  })
})
