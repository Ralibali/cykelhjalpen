// S9 subscriptions / billing tests. Covers:
// - contract parity (frontend mirror vs _shared/v2/config-schema.ts)
// - entitlement resolution (plan live statuses, overrides, expiry, revocation)
// - Stripe webhook state transitions (mocked payloads, pure mapping)
// - flag-off no-op paths
// - pricing-experiment invariants (commission 0 forever, live 50 SEK default)

import { describe, expect, it } from 'vitest'

import {
  resolvePricingExperiment,
  resolvePricingConfig,
  resolveV2Entitlements,
  v2SubscriptionPatchFromStripe,
  v2SubscriptionStatusFromStripe,
  V2_ENTITLEMENT_KEYS,
  V2_LIVE_PRICING,
  V2_PLAN_CODES,
  V2_SUBSCRIPTION_LIVE_STATUSES,
  type V2EntitlementOverrideRow,
  type V2PricingExperimentRow,
  type V2StripeSubscriptionLike,
} from '../../../supabase/functions/_shared/v2/config-schema'

import {
  V2_ENTITLEMENT_KEYS as FE_ENTITLEMENT_KEYS,
  V2_PLAN_CODES as FE_PLAN_CODES,
  V2_SUBSCRIPTION_LIVE_STATUSES as FE_LIVE_STATUSES,
} from './contracts'
import {
  getV2WorkshopBillingState,
  resolveV2Entitlements as feResolveV2Entitlements,
} from './subscriptions'

// --------------------------------------------------------------------------
// Parity: frontend mirrors vs edge source of truth
// --------------------------------------------------------------------------

describe('S9 contract parity', () => {
  it('plan codes match the contract registry', () => {
    expect([...FE_PLAN_CODES]).toEqual([...V2_PLAN_CODES])
    expect([...V2_PLAN_CODES]).toEqual(['pay_per_win', 'pro', 'pro_plus'])
  })

  it('entitlement keys match the contract registry', () => {
    expect([...FE_ENTITLEMENT_KEYS]).toEqual([...V2_ENTITLEMENT_KEYS])
    expect([...V2_ENTITLEMENT_KEYS]).toEqual([
      'directory_featured',
      'priority_slots',
      'free_wins_per_month',
      'price_index_early_access',
      'profile_rich_modules',
    ])
  })

  it('live subscription statuses match', () => {
    expect([...FE_LIVE_STATUSES]).toEqual([...V2_SUBSCRIPTION_LIVE_STATUSES])
    expect([...V2_SUBSCRIPTION_LIVE_STATUSES]).toEqual(['trialing', 'active', 'past_due'])
  })
})

// --------------------------------------------------------------------------
// Entitlement resolution
// --------------------------------------------------------------------------

const override = (partial: Partial<V2EntitlementOverrideRow>): V2EntitlementOverrideRow => ({
  id: 'o1',
  workshop_id: 'w1',
  entitlement_key: 'directory_featured',
  value: true,
  expires_at: null,
  granted_by: 'admin-1',
  reason: 'test',
  created_at: '2026-08-30T00:00:00.000Z',
  ...partial,
})

const NOW = new Date('2026-09-01T12:00:00.000Z')

describe('resolveV2Entitlements', () => {
  const proEntitlements = { directory_featured: true, profile_rich_modules: true }

  it('grants plan entitlements only in live statuses', () => {
    for (const status of ['trialing', 'active', 'past_due'] as const) {
      const result = resolveV2Entitlements({ planEntitlements: proEntitlements, subscriptionStatus: status, now: NOW })
      expect(result.directory_featured).toBe(true)
      expect(result.profile_rich_modules).toBe(true)
    }
  })

  it('grants nothing for terminal or missing subscriptions', () => {
    for (const status of ['cancelled', 'expired', null, undefined] as const) {
      const result = resolveV2Entitlements({ planEntitlements: proEntitlements, subscriptionStatus: status, now: NOW })
      expect(result).toEqual({})
    }
  })

  it('admin override grants regardless of subscription state', () => {
    const result = resolveV2Entitlements({
      subscriptionStatus: null,
      overrides: [override({ entitlement_key: 'priority_slots', value: true })],
      now: NOW,
    })
    expect(result.priority_slots).toBe(true)
  })

  it('override value false/null revokes a plan entitlement (audit row kept)', () => {
    const revoked = resolveV2Entitlements({
      planEntitlements: proEntitlements,
      subscriptionStatus: 'active',
      overrides: [override({ entitlement_key: 'directory_featured', value: false })],
      now: NOW,
    })
    expect(revoked.directory_featured).toBeUndefined()
    expect(revoked.profile_rich_modules).toBe(true)

    const revokedNull = resolveV2Entitlements({
      planEntitlements: proEntitlements,
      subscriptionStatus: 'active',
      overrides: [override({ entitlement_key: 'directory_featured', value: null })],
      now: NOW,
    })
    expect(revokedNull.directory_featured).toBeUndefined()
  })

  it('expired overrides are inert', () => {
    const result = resolveV2Entitlements({
      subscriptionStatus: null,
      overrides: [override({ expires_at: '2026-08-01T00:00:00.000Z' })],
      now: NOW,
    })
    expect(result).toEqual({})
  })

  it('future expiry still applies; unknown keys are dropped everywhere', () => {
    const result = resolveV2Entitlements({
      planEntitlements: { ...proEntitlements, typo_key: true },
      subscriptionStatus: 'active',
      overrides: [
        override({ entitlement_key: 'free_wins_per_month', value: 2, expires_at: '2026-10-01T00:00:00.000Z' }),
        override({ entitlement_key: 'not_a_real_key', value: true }),
      ],
      now: NOW,
    })
    expect(result).toEqual({
      directory_featured: true,
      profile_rich_modules: true,
      free_wins_per_month: 2,
    })
  })

  it('numeric entitlement values pass through (free_wins_per_month)', () => {
    const result = resolveV2Entitlements({
      planEntitlements: { free_wins_per_month: 1 },
      subscriptionStatus: 'active',
      now: NOW,
    })
    expect(result.free_wins_per_month).toBe(1)
  })

  it('frontend mirror resolves identically to the edge resolver', () => {
    const input = {
      planEntitlements: proEntitlements,
      subscriptionStatus: 'active' as const,
      overrides: [override({ entitlement_key: 'priority_slots', value: true })],
      now: NOW,
    }
    expect(feResolveV2Entitlements(input)).toEqual(resolveV2Entitlements(input))
  })
})

// --------------------------------------------------------------------------
// Webhook state transitions (mocked Stripe payloads)
// --------------------------------------------------------------------------

describe('v2SubscriptionStatusFromStripe', () => {
  it('maps Stripe statuses to the contract enum', () => {
    expect(v2SubscriptionStatusFromStripe('trialing')).toBe('trialing')
    expect(v2SubscriptionStatusFromStripe('active')).toBe('active')
    expect(v2SubscriptionStatusFromStripe('past_due')).toBe('past_due')
    expect(v2SubscriptionStatusFromStripe('unpaid')).toBe('past_due')
    expect(v2SubscriptionStatusFromStripe('incomplete')).toBe('past_due')
    expect(v2SubscriptionStatusFromStripe('paused')).toBe('past_due')
    expect(v2SubscriptionStatusFromStripe('canceled')).toBe('cancelled')
    expect(v2SubscriptionStatusFromStripe('incomplete_expired')).toBe('expired')
  })

  it('returns null for unknown statuses so the webhook ignores them', () => {
    expect(v2SubscriptionStatusFromStripe('whatever')).toBeNull()
    expect(v2SubscriptionStatusFromStripe('')).toBeNull()
  })
})

describe('v2SubscriptionPatchFromStripe', () => {
  const basilSubscription: V2StripeSubscriptionLike = {
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    trial_end: null,
    canceled_at: null,
    // basil: period end lives on the subscription item
    items: { data: [{ current_period_end: 1793000000 }] },
    metadata: { kind: 'v2_subscription', workshop_id: 'w1', plan_code: 'pro' },
  }

  it('builds a patch from a basil-shaped subscription', () => {
    const patch = v2SubscriptionPatchFromStripe(basilSubscription)
    expect(patch).toEqual({
      status: 'active',
      stripe_subscription_id: 'sub_123',
      stripe_customer_id: 'cus_123',
      trial_ends_at: null,
      current_period_end: new Date(1793000000 * 1000).toISOString(),
      cancelled_at: null,
    })
  })

  it('supports the pre-basil top-level current_period_end and expanded customer', () => {
    const patch = v2SubscriptionPatchFromStripe({
      ...basilSubscription,
      items: null,
      current_period_end: 1780000000,
      customer: { id: 'cus_expanded' },
    })
    expect(patch?.current_period_end).toBe(new Date(1780000000 * 1000).toISOString())
    expect(patch?.stripe_customer_id).toBe('cus_expanded')
  })

  it('trial → active transition is visible to the webhook (trial_ended event)', () => {
    const trialing = v2SubscriptionPatchFromStripe({
      ...basilSubscription,
      status: 'trialing',
      trial_end: 1790000000,
    })
    expect(trialing?.status).toBe('trialing')
    expect(trialing?.trial_ends_at).toBe(new Date(1790000000 * 1000).toISOString())

    const activated = v2SubscriptionPatchFromStripe({ ...basilSubscription, status: 'active', trial_end: 1790000000 })
    expect(activated?.status).toBe('active')
  })

  it('deletion maps to cancelled with cancelled_at set', () => {
    const patch = v2SubscriptionPatchFromStripe({ ...basilSubscription, status: 'canceled', canceled_at: 1793100000 })
    expect(patch?.status).toBe('cancelled')
    expect(patch?.cancelled_at).toBe(new Date(1793100000 * 1000).toISOString())
  })

  it('payment failure maps to past_due (no entitlements lost silently, none granted on incomplete)', () => {
    expect(v2SubscriptionPatchFromStripe({ ...basilSubscription, status: 'past_due' })?.status).toBe('past_due')
    expect(v2SubscriptionPatchFromStripe({ ...basilSubscription, status: 'incomplete' })?.status).toBe('past_due')
  })

  it('unknown status yields null → webhook stores nothing', () => {
    expect(v2SubscriptionPatchFromStripe({ ...basilSubscription, status: 'mystery' })).toBeNull()
  })
})

// --------------------------------------------------------------------------
// Flag-off no-op paths
// --------------------------------------------------------------------------

describe('flag-off no-op', () => {
  it('entitlement resolver defaults to empty without a live subscription', () => {
    expect(resolveV2Entitlements({})).toEqual({})
    expect(feResolveV2Entitlements({})).toEqual({})
  })

  it('frontend billing state fails closed to disabled when flags are unreadable', async () => {
    // No Supabase env in tests → flag read fails closed → feature OFF.
    const state = await getV2WorkshopBillingState('00000000-0000-0000-0000-000000000000')
    expect(state.enabled).toBe(false)
    expect(state.subscription).toBeNull()
    expect(state.entitlements).toEqual({})
  })

  it('pricing experiment resolver returns null when the flag is off, even for active rows', () => {
    const row: V2PricingExperimentRow = {
      key: 'winner_fee_test',
      variants: [{ name: 'control', winner_fee_ore: 5000, weight: 1 }, { name: 'b', winner_fee_ore: 7500, weight: 1 }],
      active: true,
      started_at: null,
      ended_at: null,
    }
    expect(resolvePricingExperiment(row, { flagOn: false, subjectId: 'w1' })).toBeNull()
  })
})

// --------------------------------------------------------------------------
// Pricing experiment invariants (I1/I2)
// --------------------------------------------------------------------------

describe('pricing experiments', () => {
  const experiment: V2PricingExperimentRow = {
    key: 'winner_fee_test',
    variants: [
      { name: 'control', winner_fee_ore: 5000, weight: 1 },
      { name: 'higher', winner_fee_ore: 7500, weight: 1 },
    ],
    active: true,
    started_at: '2026-08-01T00:00:00.000Z',
    ended_at: null,
  }

  it('inactive experiments are inert', () => {
    expect(resolvePricingExperiment({ ...experiment, active: false }, { flagOn: true, subjectId: 'w1' })).toBeNull()
  })

  it('out-of-window experiments are inert', () => {
    const notStarted = resolvePricingExperiment(
      { ...experiment, started_at: '2027-01-01T00:00:00.000Z' },
      { flagOn: true, now: new Date('2026-09-01T00:00:00.000Z') },
    )
    const ended = resolvePricingExperiment(
      { ...experiment, ended_at: '2026-08-15T00:00:00.000Z' },
      { flagOn: true, now: new Date('2026-09-01T00:00:00.000Z') },
    )
    expect(notStarted).toBeNull()
    expect(ended).toBeNull()
  })

  it('resolves a deterministic variant per subject when flagged + active', () => {
    const a = resolvePricingExperiment(experiment, { flagOn: true, subjectId: 'workshop-abc', now: new Date('2026-09-01T00:00:00.000Z') })
    const b = resolvePricingExperiment(experiment, { flagOn: true, subjectId: 'workshop-abc', now: new Date('2026-09-01T00:00:00.000Z') })
    expect(a).not.toBeNull()
    expect(a).toEqual(b)
    expect(['control', 'higher']).toContain(a?.variant)
  })

  it('drops invalid variants (non-positive fee or weight)', () => {
    const row: V2PricingExperimentRow = {
      ...experiment,
      variants: [
        { name: 'broken', winner_fee_ore: 0, weight: 1 },
        { name: 'broken2', winner_fee_ore: 5000, weight: 0 },
      ],
    }
    expect(resolvePricingExperiment(row, { flagOn: true, subjectId: 'w1', now: new Date('2026-09-01T00:00:00.000Z') })).toBeNull()
  })

  it('INVARIANT: commission is never part of an experiment and stays 0 forever', () => {
    const resolved = resolvePricingExperiment(experiment, { flagOn: true, subjectId: 'w1', now: new Date('2026-09-01T00:00:00.000Z') })
    expect(resolved).not.toBeNull()
    expect(Object.keys(resolved ?? {})).not.toContain('commissionBps')
    expect(Object.keys(resolved ?? {})).not.toContain('commission_bps')
    expect(V2_LIVE_PRICING.commissionBps).toBe(0)
  })

  it('INVARIANT: default config resolution is the live 50 SEK rule, commission forced 0', () => {
    // Even a hostile row cannot introduce commission via the config reader.
    const hostile = resolvePricingConfig(
      [{
        key: 'winner_fee',
        amount_ore: 9900,
        currency: 'SEK',
        vat_rate: 0.25,
        commission_bps: 2500, // DB CHECK rejects this; resolver ignores it too
        credit_pack_min: 1,
        credit_pack_max: 100,
        credit_unit_ore: 5000,
        free_wins_on_signup: 2,
        effective_from: '2026-09-01T00:00:00.000Z',
        active: true,
      }],
    )
    expect(hostile.commissionBps).toBe(0)

    // No rows → live rule (5000 öre, 25% VAT, 2 free wins) — I2.
    const fallback = resolvePricingConfig(null)
    expect(fallback.amountOre).toBe(5000)
    expect(fallback.vatRate).toBe(0.25)
    expect(fallback.freeWinsOnSignup).toBe(2)
    expect(fallback.commissionBps).toBe(0)
  })
})
