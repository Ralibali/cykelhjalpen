// V2 eligibility engine tests — pure logic, no DB.
// Contract: docs/v2/CONTRACTS.md §2.1–2.2, §3.1. Imports the edge-side single
// source of truth directly (same convention as contracts.test.ts).

import { describe, expect, it } from 'vitest'

import {
  evaluateWorkshopEligibility,
  matchWorkshopToRequestCity,
  normalizeAreaKey,
  v2AutoApproveForCity,
  visibleCityNamesForWorkshop,
  V2_MAX_QUOTES_PER_REQUEST,
  type V2EligibilityContext,
  type V2EligibilityRequest,
  type V2EligibilityWorkshop,
} from '../../../supabase/functions/_shared/v2/eligibility'

const OSTERGOTLAND = ['Linköping', 'Norrköping']

const ctxOff: V2EligibilityContext = { areasServedMatchingOn: false, clusterCityNames: OSTERGOTLAND }
const ctxOn: V2EligibilityContext = { areasServedMatchingOn: true, clusterCityNames: OSTERGOTLAND }

const workshop = (overrides: Partial<V2EligibilityWorkshop> = {}): V2EligibilityWorkshop => ({
  id: 'w1',
  approved: true,
  city: 'Linköping',
  ...overrides,
})

const request = (overrides: Partial<V2EligibilityRequest> = {}): V2EligibilityRequest => ({
  id: 'r1',
  city: 'Linköping',
  repairCategory: 'Bromsar',
  status: 'new',
  adminStatus: 'approved',
  sentQuotes: 0,
  ...overrides,
})

describe('normalizeAreaKey', () => {
  it('normalizes case, whitespace and Swedish diacritics', () => {
    expect(normalizeAreaKey(' Norrköping ')).toBe('norrkoping')
    expect(normalizeAreaKey('LUND')).toBe('lund')
    expect(normalizeAreaKey('Linköping')).toBe(normalizeAreaKey('linkoping'))
  })
})

describe('matchWorkshopToRequestCity', () => {
  it('exact city match always wins and never depends on the flag', () => {
    expect(matchWorkshopToRequestCity(workshop(), 'Linköping', ctxOff)).toBe('city')
    expect(matchWorkshopToRequestCity(workshop(), 'Linköping', ctxOn)).toBe('city')
  })

  it('returns null for a different city when the flag is off (live behavior)', () => {
    expect(matchWorkshopToRequestCity(workshop(), 'Norrköping', ctxOff)).toBeNull()
  })

  it('areas mode matches areas_served against the request city name (normalized)', () => {
    const ws = workshop({ serviceAreaMode: 'areas', areasServed: ['norrkoping', 'Motala'] })
    expect(matchWorkshopToRequestCity(ws, 'Norrköping', ctxOn)).toBe('areas')
    expect(matchWorkshopToRequestCity(ws, 'Uppsala', ctxOn)).toBeNull()
  })

  it('areas mode does nothing when the flag is off', () => {
    const ws = workshop({ serviceAreaMode: 'areas', areasServed: ['Norrköping'] })
    expect(matchWorkshopToRequestCity(ws, 'Norrköping', ctxOff)).toBeNull()
  })

  it('cluster mode requires flag + opt-in + shared cluster (Östergötland)', () => {
    const optedIn = workshop({ serviceAreaMode: 'cluster', clusterOptIn: true })
    expect(matchWorkshopToRequestCity(optedIn, 'Norrköping', ctxOn)).toBe('cluster')

    // No opt-in → no cross-city matching even in cluster mode.
    const notOptedIn = workshop({ serviceAreaMode: 'cluster', clusterOptIn: false })
    expect(matchWorkshopToRequestCity(notOptedIn, 'Norrköping', ctxOn)).toBeNull()

    // Flag off → siloed cities (Insight 7 baseline).
    expect(matchWorkshopToRequestCity(optedIn, 'Norrköping', ctxOff)).toBeNull()

    // Uppsala is not in the Östergötland cluster.
    expect(matchWorkshopToRequestCity(optedIn, 'Uppsala', ctxOn)).toBeNull()
  })

  it('cluster matching works in both directions of the twin city pair', () => {
    const norrkopingWs = workshop({ city: 'Norrköping', serviceAreaMode: 'cluster', clusterOptIn: true })
    expect(matchWorkshopToRequestCity(norrkopingWs, 'Linköping', ctxOn)).toBe('cluster')
  })

  it('mode city (default) never matches cross-city', () => {
    const ws = workshop({ clusterOptIn: true, areasServed: ['Norrköping'] })
    expect(matchWorkshopToRequestCity(ws, 'Norrköping', ctxOn)).toBeNull()
  })
})

describe('visibleCityNamesForWorkshop', () => {
  const known = ['Linköping', 'Norrköping', 'Uppsala', 'Lund']

  it('flag off → own city only (live behavior unchanged)', () => {
    const ws = workshop({ serviceAreaMode: 'cluster', clusterOptIn: true, areasServed: ['Norrköping'] })
    expect(visibleCityNamesForWorkshop(ws, {
      areasServedMatchingOn: false,
      knownCityNames: known,
      workshopClusterCityNames: OSTERGOTLAND,
    })).toEqual(['Linköping'])
  })

  it('areas mode adds configured cities from areas_served, ignoring free text', () => {
    const ws = workshop({ serviceAreaMode: 'areas', areasServed: ['Norrköping', 'Motala', 'lund'] })
    expect(visibleCityNamesForWorkshop(ws, {
      areasServedMatchingOn: true,
      knownCityNames: known,
    }).sort()).toEqual(['Linköping', 'Lund', 'Norrköping'])
  })

  it('cluster mode + opt-in adds the whole cluster', () => {
    const ws = workshop({ serviceAreaMode: 'cluster', clusterOptIn: true })
    expect(visibleCityNamesForWorkshop(ws, {
      areasServedMatchingOn: true,
      knownCityNames: known,
      workshopClusterCityNames: OSTERGOTLAND,
    }).sort()).toEqual(['Linköping', 'Norrköping'])
  })

  it('cluster mode without opt-in stays exact-city', () => {
    const ws = workshop({ serviceAreaMode: 'cluster', clusterOptIn: false })
    expect(visibleCityNamesForWorkshop(ws, {
      areasServedMatchingOn: true,
      knownCityNames: known,
      workshopClusterCityNames: OSTERGOTLAND,
    })).toEqual(['Linköping'])
  })
})

describe('evaluateWorkshopEligibility', () => {
  it('eligible workshop + open approved request → eligible via city', () => {
    const result = evaluateWorkshopEligibility(workshop(), request(), ctxOff)
    expect(result).toEqual({ eligible: true, reasons: [], matchedVia: 'city' })
  })

  it('collects all blocking reasons', () => {
    const result = evaluateWorkshopEligibility(
      workshop({ approved: false, onboardingState: 'churned' }),
      request({ adminStatus: 'pending_approval', status: 'completed', sentQuotes: 3, city: 'Norrköping' }),
      ctxOff,
    )
    expect(result.eligible).toBe(false)
    expect(result.matchedVia).toBeNull()
    expect(result.reasons).toEqual([
      'workshop_not_approved',
      'workshop_churned',
      'request_not_approved',
      'request_not_open',
      'request_full',
      'no_city_match',
    ])
  })

  it(`blocks at ${V2_MAX_QUOTES_PER_REQUEST} sent quotes (3-slot rule)`, () => {
    const twoQuotes = evaluateWorkshopEligibility(workshop(), request({ sentQuotes: 2 }), ctxOff)
    expect(twoQuotes.eligible).toBe(true)
    const full = evaluateWorkshopEligibility(workshop(), request({ sentQuotes: 3 }), ctxOff)
    expect(full.eligible).toBe(false)
    expect(full.reasons).toContain('request_full')
  })

  it('service-category awareness applies only when services are declared', () => {
    const generalist = evaluateWorkshopEligibility(workshop({ services: [] }), request(), ctxOff)
    expect(generalist.eligible).toBe(true)

    const specialist = workshop({ services: ['Punktering / däckbyte'] })
    const miss = evaluateWorkshopEligibility(specialist, request(), ctxOff)
    expect(miss.reasons).toContain('category_not_offered')
    const hit = evaluateWorkshopEligibility(
      specialist,
      request({ repairCategory: 'Punktering / däckbyte' }),
      ctxOff,
    )
    expect(hit.eligible).toBe(true)
  })

  it('cluster-eligible workshop sees twin-city request only with flag', () => {
    const ws = workshop({ serviceAreaMode: 'cluster', clusterOptIn: true })
    const nkpgRequest = request({ city: 'Norrköping' })
    expect(evaluateWorkshopEligibility(ws, nkpgRequest, ctxOn)).toEqual({
      eligible: true,
      reasons: [],
      matchedVia: 'cluster',
    })
    const offResult = evaluateWorkshopEligibility(ws, nkpgRequest, ctxOff)
    expect(offResult.eligible).toBe(false)
    expect(offResult.reasons).toEqual(['no_city_match'])
  })
})

describe('v2AutoApproveForCity (city-state auto-approve decision)', () => {
  it('no config row → legacy V1 gate', () => {
    expect(v2AutoApproveForCity(null)).toBe('legacy_gate')
  })

  it('SUPPLY_BUILDING → always manual review, even if auto flag set', () => {
    expect(v2AutoApproveForCity({ state: 'SUPPLY_BUILDING', demandOpen: true, autoApproveRequests: true }))
      .toBe('manual_review')
  })

  it('LIMITED + auto_approve_requests → approve without the 30d gate (cold-start inversion)', () => {
    expect(v2AutoApproveForCity({ state: 'LIMITED', demandOpen: true, autoApproveRequests: true }))
      .toBe('approve')
    expect(v2AutoApproveForCity({ state: 'LIMITED', demandOpen: true, autoApproveRequests: false }))
      .toBe('manual_review')
  })

  it('ACTIVE keeps the legacy gate until G-L1 (Linköping seed note)', () => {
    expect(v2AutoApproveForCity({ state: 'ACTIVE', demandOpen: true, autoApproveRequests: true }))
      .toBe('legacy_gate')
  })

  it('demand_open=false always soft-gates to manual review', () => {
    expect(v2AutoApproveForCity({ state: 'ACTIVE', demandOpen: false, autoApproveRequests: true }))
      .toBe('manual_review')
    expect(v2AutoApproveForCity({ state: 'LIMITED', demandOpen: false, autoApproveRequests: true }))
      .toBe('manual_review')
  })

  it('RESEARCH and PAUSED → manual review', () => {
    expect(v2AutoApproveForCity({ state: 'RESEARCH', demandOpen: false, autoApproveRequests: false }))
      .toBe('manual_review')
    expect(v2AutoApproveForCity({ state: 'PAUSED', demandOpen: false, autoApproveRequests: false }))
      .toBe('manual_review')
  })

  it('seeded v2 city config resolves as expected', () => {
    // linkoping=ACTIVE, norrkoping=SUPPLY_BUILDING, uppsala/lund=LIMITED
    expect(v2AutoApproveForCity({ state: 'ACTIVE', demandOpen: true, autoApproveRequests: true }))
      .toBe('legacy_gate')
    expect(v2AutoApproveForCity({ state: 'SUPPLY_BUILDING', demandOpen: true, autoApproveRequests: false }))
      .toBe('manual_review')
    expect(v2AutoApproveForCity({ state: 'LIMITED', demandOpen: true, autoApproveRequests: true }))
      .toBe('approve')
  })
})
