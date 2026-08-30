// V2 contract parity + pure-logic tests.
// The frontend mirrors (src/lib/v2) must stay in lockstep with the edge-side
// single source of truth (supabase/functions/_shared/v2/config-schema.ts).
// These tests make drift a build failure instead of a production surprise.

import { describe, expect, it } from 'vitest'

import {
  V2_CITY_STATES,
  V2_CLIENT_EVENT_NAMES,
  V2_FLAG_KEYS,
  V2_LIVE_PRICING,
  V2_OUTCOME_STATES,
  V2_REVIEW_STATES,
  cityNameFromSlug,
  citySlugFromName,
  clientPayloadSizeOk,
  grossOre,
  isFlagOn,
  isFlagOnFor,
  priceConfidence,
  priceConfidenceIsDisplayable,
  resolvePricingConfig,
  reviewCanVerify,
  rolloutBucket,
  sanitizeClientPayload,
  stateDefaults,
  type V2PricingConfigRow,
} from '../../../supabase/functions/_shared/v2/config-schema'

import {
  V2_CITY_STATES as FE_CITY_STATES,
  V2_CLIENT_EVENT_NAMES as FE_CLIENT_EVENTS,
  V2_FLAG_KEYS as FE_FLAG_KEYS,
  V2_REQUEST_STATUS_AWAITING_RESELECTION,
} from './contracts'
import { sanitizeV2ClientPayload, isV2ClientEventName } from './events'
import { v2RolloutBucket } from './flags'
import {
  V2_LIVE_PRICING_FALLBACK,
  pricingFromRows,
  v2GrossOre,
} from './pricing'
import { v2CityAcceptsDemand, v2CityDirectoryIndexable, v2StateDefaults } from './cities'
import { LEAD_FEE_ORE } from '@/lib/pricing'

// --------------------------------------------------------------------------
// Parity: frontend mirrors vs edge source of truth
// --------------------------------------------------------------------------

describe('V2 contract parity (frontend mirrors edge)', () => {
  it('city states match', () => {
    expect([...FE_CITY_STATES]).toEqual([...V2_CITY_STATES])
  })

  it('feature flag keys match', () => {
    expect([...FE_FLAG_KEYS]).toEqual([...V2_FLAG_KEYS])
  })

  it('client event names match', () => {
    expect([...FE_CLIENT_EVENTS]).toEqual([...V2_CLIENT_EVENT_NAMES])
  })

  it('payload sanitizers strip the same keys', () => {
    const dirty = {
      city_slug: 'linkoping',
      email: 'a@b.se',
      token: 'secret',
      view_token: 'secret',
      customer_phone: '070',
      step: 2,
    }
    expect(sanitizeV2ClientPayload(dirty)).toEqual(sanitizeClientPayload(dirty))
    expect(sanitizeV2ClientPayload(dirty)).toEqual({ city_slug: 'linkoping', step: 2 })
  })

  it('rollout bucket functions are identical', () => {
    for (const id of ['a', 'workshop-123', '550e8400-e29b-41d4-a716-446655440000', '']) {
      expect(v2RolloutBucket(id)).toBe(rolloutBucket(id))
    }
  })

  it('gross ore calculators are identical', () => {
    expect(v2GrossOre(5000, 0.25)).toBe(grossOre(5000, 0.25))
    expect(v2GrossOre(5000, 0.25)).toBe(6250)
  })

  it('state defaults are identical per state', () => {
    for (const state of V2_CITY_STATES) {
      expect(v2StateDefaults(state)).toEqual(stateDefaults(state))
    }
  })
})

// --------------------------------------------------------------------------
// Pricing invariants (HARD RULES I1/I2)
// --------------------------------------------------------------------------

describe('V2 pricing config', () => {
  const liveRow: V2PricingConfigRow = {
    key: 'winner_fee',
    amount_ore: 5000,
    currency: 'SEK',
    vat_rate: 0.25,
    commission_bps: 0,
    credit_pack_min: 1,
    credit_pack_max: 100,
    credit_unit_ore: 5000,
    free_wins_on_signup: 2,
    effective_from: '2026-08-30T00:00:00.000Z',
    active: true,
  }

  it('live fallback equals today\'s constants (50 SEK excl. VAT)', () => {
    expect(V2_LIVE_PRICING.amountOre).toBe(LEAD_FEE_ORE)
    expect(V2_LIVE_PRICING.amountOre).toBe(5000)
    expect(V2_LIVE_PRICING.vatRate).toBe(0.25)
    expect(V2_LIVE_PRICING.commissionBps).toBe(0)
    expect(V2_LIVE_PRICING.freeWinsOnSignup).toBe(2)
    expect(V2_LIVE_PRICING_FALLBACK.amountOre).toBe(LEAD_FEE_ORE)
    expect(V2_LIVE_PRICING_FALLBACK.source).toBe('live_constants')
  })

  it('falls back to live constants when no rows', () => {
    expect(resolvePricingConfig(null)).toEqual(V2_LIVE_PRICING)
    expect(resolvePricingConfig([])).toEqual(V2_LIVE_PRICING)
    expect(pricingFromRows(null).source).toBe('live_constants')
  })

  it('resolves the newest active row', () => {
    const older = { ...liveRow, amount_ore: 4500, effective_from: '2026-01-01T00:00:00.000Z' }
    expect(resolvePricingConfig([older, liveRow]).amountOre).toBe(5000)
  })

  it('ignores inactive rows', () => {
    const inactive = { ...liveRow, amount_ore: 9900, active: false }
    expect(resolvePricingConfig([inactive])).toEqual(V2_LIVE_PRICING)
  })

  it('commission is ALWAYS 0 regardless of input (invariant I1)', () => {
    const hostile = { ...liveRow, commission_bps: 1500 }
    expect(resolvePricingConfig([hostile]).commissionBps).toBe(0)
    expect(pricingFromRows([hostile]).commissionBps).toBe(0)
  })
})

// --------------------------------------------------------------------------
// City states
// --------------------------------------------------------------------------

describe('V2 city states', () => {
  it('state defaults follow the contract semantics', () => {
    expect(stateDefaults('ACTIVE')).toEqual({ demandOpen: true, autoApprove: true, publicSurfaces: true })
    expect(stateDefaults('LIMITED').publicSurfaces).toBe(false)
    expect(stateDefaults('SUPPLY_BUILDING').autoApprove).toBe(false)
    expect(stateDefaults('RESEARCH').demandOpen).toBe(false)
    expect(stateDefaults('PAUSED').demandOpen).toBe(false)
  })

  it('maps slugs to V1 exact-match names (invariant I6)', () => {
    expect(cityNameFromSlug('linkoping')).toBe('Linköping')
    expect(citySlugFromName('Linköping')).toBe('linkoping')
    expect(citySlugFromName('norrkoping')).toBe('norrkoping')
    expect(citySlugFromName('Okänd')).toBeNull()
    expect(cityNameFromSlug('goteborg')).toBeNull()
  })

  it('accepts demand only when the config row says so', () => {
    expect(v2CityAcceptsDemand(null)).toBe(true) // no V2 row → V1 behavior
    const paused = { demand_open: false } as never
    expect(v2CityAcceptsDemand(paused)).toBe(false)
  })

  it('directory is indexable only when flag + ACTIVE', () => {
    const active = { directory_indexable: true, state: 'ACTIVE' } as never
    const limited = { directory_indexable: true, state: 'LIMITED' } as never
    expect(v2CityDirectoryIndexable(active)).toBe(true)
    expect(v2CityDirectoryIndexable(limited)).toBe(false)
    expect(v2CityDirectoryIndexable(null)).toBe(false)
  })
})

// --------------------------------------------------------------------------
// Feature flags
// --------------------------------------------------------------------------

describe('V2 feature flags', () => {
  const flags = {
    'v2.subscriptions.enabled': { key: 'v2.subscriptions.enabled', enabled: true, rollout: {} },
    'v2.liquidity.reselection': {
      key: 'v2.liquidity.reselection',
      enabled: true,
      rollout: { cities: ['linkoping'] },
    },
    'v2.directory.public_profiles': {
      key: 'v2.directory.public_profiles',
      enabled: true,
      rollout: { percent: 50 },
    },
  }

  it('missing key = OFF', () => {
    expect(isFlagOn({}, 'v2.prisindex.engine')).toBe(false)
    expect(isFlagOn(null, 'v2.prisindex.engine')).toBe(false)
    expect(isFlagOn(undefined, 'v2.prisindex.engine')).toBe(false)
  })

  it('enabled=true turns the flag on', () => {
    expect(isFlagOn(flags, 'v2.subscriptions.enabled')).toBe(true)
  })

  it('city-scoped rollout narrows correctly', () => {
    expect(isFlagOnFor(flags, 'v2.liquidity.reselection', { citySlug: 'linkoping' })).toBe(true)
    expect(isFlagOnFor(flags, 'v2.liquidity.reselection', { citySlug: 'lund' })).toBe(false)
    expect(isFlagOnFor(flags, 'v2.liquidity.reselection', {})).toBe(false)
  })

  it('percent rollout is deterministic and bounded', () => {
    const buckets = new Set<number>()
    for (let i = 0; i < 500; i++) buckets.add(rolloutBucket(`subject-${i}`))
    for (const b of buckets) {
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(100)
    }
    // Same subject → same bucket, every time
    expect(rolloutBucket('subject-42')).toBe(rolloutBucket('subject-42'))
    // 0% percent → nobody
    const zero = { 'v2.directory.public_profiles': { key: 'k', enabled: true, rollout: { percent: 0 } } }
    expect(isFlagOnFor(zero, 'v2.directory.public_profiles', { subjectId: 'x' })).toBe(false)
  })
})

// --------------------------------------------------------------------------
// Review / outcome lifecycle
// --------------------------------------------------------------------------

describe('V2 review/outcome lifecycle', () => {
  it('a review verifies only from completed outcomes', () => {
    for (const state of V2_OUTCOME_STATES) {
      expect(reviewCanVerify(state)).toBe(state === 'completed')
    }
  })

  it('review states include the full moderation set', () => {
    expect(V2_REVIEW_STATES).toContain('submitted')
    expect(V2_REVIEW_STATES).toContain('verified')
    expect(V2_REVIEW_STATES).toContain('published')
    expect(V2_REVIEW_STATES).toContain('flagged')
  })
})

// --------------------------------------------------------------------------
// Prisindex confidence (sample gating)
// --------------------------------------------------------------------------

describe('V2 prisindex confidence', () => {
  it('thresholds: <3 insufficient, 3-9 low, 10-29 medium, >=30 high', () => {
    expect(priceConfidence(0)).toBe('insufficient')
    expect(priceConfidence(2)).toBe('insufficient')
    expect(priceConfidence(3)).toBe('low')
    expect(priceConfidence(9)).toBe('low')
    expect(priceConfidence(10)).toBe('medium')
    expect(priceConfidence(29)).toBe('medium')
    expect(priceConfidence(30)).toBe('high')
  })

  it('insufficient is never displayable', () => {
    expect(priceConfidenceIsDisplayable('insufficient')).toBe(false)
    expect(priceConfidenceIsDisplayable('low')).toBe(true)
  })
})

// --------------------------------------------------------------------------
// Client events
// --------------------------------------------------------------------------

describe('V2 client events', () => {
  it('only client.* names are accepted', () => {
    expect(isV2ClientEventName('client.wizard_started')).toBe(true)
    expect(isV2ClientEventName('request.submitted')).toBe(false)
    expect(isV2ClientEventName('client.evil')).toBe(false)
  })

  it('payload size guard works', () => {
    expect(clientPayloadSizeOk({ a: 1 })).toBe(true)
    expect(clientPayloadSizeOk({ blob: 'x'.repeat(5000) })).toBe(false)
  })

  it('re-selection status constant exists', () => {
    expect(V2_REQUEST_STATUS_AWAITING_RESELECTION).toBe('awaiting_reselection')
  })
})
