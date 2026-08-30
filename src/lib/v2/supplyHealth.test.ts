// V2 supply-health computation tests — pure logic, no DB.
// Contract: docs/v2/CONTRACTS.md §2.2 (v2_supply_snapshots) + §8 glossary.

import { describe, expect, it } from 'vitest'

import {
  computeClusterSupplyHealth,
  computeSupplyHealthForScope,
  supplyWindowStart,
  type V2SupplyHealthQuote,
  type V2SupplyHealthRequest,
  type V2SupplyHealthWorkshop,
} from '../../../supabase/functions/_shared/v2/supply-health-core'

const NOW = new Date('2026-08-30T12:00:00.000Z')
const DAY = 86_400_000
const isoDaysAgo = (days: number, hours = 0) =>
  new Date(NOW.getTime() - days * DAY - hours * 3_600_000).toISOString()

const ws = (id: string, city: string, approved = true): V2SupplyHealthWorkshop => ({ id, approved, city })
const req = (
  id: string,
  city: string,
  createdDaysAgo: number,
  adminStatus = 'approved',
  approvedDaysAgo?: number,
): V2SupplyHealthRequest => ({
  id,
  city,
  adminStatus,
  createdAt: isoDaysAgo(createdDaysAgo),
  approvedAt: approvedDaysAgo !== undefined ? isoDaysAgo(approvedDaysAgo) : null,
})
const quote = (id: string, requestId: string, workshopId: string, createdDaysAgo: number, hours = 0): V2SupplyHealthQuote => ({
  id,
  requestId,
  workshopId,
  createdAt: isoDaysAgo(createdDaysAgo, hours),
})

describe('supplyWindowStart', () => {
  it('defaults to a 30-day trailing window', () => {
    expect(supplyWindowStart(NOW).toISOString()).toBe('2026-07-31T12:00:00.000Z')
    expect(supplyWindowStart(NOW, 7).toISOString()).toBe('2026-08-23T12:00:00.000Z')
  })
})

describe('computeSupplyHealthForScope', () => {
  it('counts approved + active-in-30d workshops, requests, quotes and fill rate', () => {
    const result = computeSupplyHealthForScope({
      scopeSlug: 'linkoping',
      cityNames: ['Linköping'],
      clusterSlug: 'ostergotland',
      capturedOn: '2026-08-30',
      now: NOW,
      workshops: [ws('w1', 'Linköping'), ws('w2', 'Linköping'), ws('w3', 'Linköping', false), ws('w4', 'Norrköping')],
      requestsInWindow: [
        req('r1', 'Linköping', 5, 'approved', 5),
        req('r2', 'Linköping', 3, 'approved', 3),
        req('r3', 'Linköping', 2, 'pending_approval'),
        req('r4', 'Norrköping', 1),
      ],
      quotesInWindow: [
        quote('q1', 'r1', 'w1', 4, 1), // 23h after r1's approval (day 5)
        quote('q2', 'r1', 'w2', 4),
        quote('q3', 'r2', 'w1', 2, 12), // 12h after r2's approval (day 3)
        quote('q4', 'r4', 'w4', 0), // Norrköping quote — out of scope
      ],
    })

    expect(result.approved_workshops).toBe(2) // w3 not approved, w4 other city
    expect(result.active_workshops).toBe(2) // w1 + w2 quoted within 30d
    expect(result.requests_30d).toBe(3) // r1–r3 (r4 is Norrköping)
    expect(result.quotes_30d).toBe(3) // q1–q3 attach to Linköping requests
    expect(result.fill_rate).toBe(1) // both published requests got quotes
    expect(result.cluster_slug).toBe('ostergotland')
    // r1: first quote q1 = 23h after approve; r2: q3 = 12h → median 17.5
    expect(result.median_hours_to_first_quote).toBe(17.5)
    expect(result.quotes_per_week).toBe(0.7) // 3 quotes / (30/7 weeks)
  })

  it('fill_rate is null when no published requests exist in the window', () => {
    const result = computeSupplyHealthForScope({
      scopeSlug: 'lund',
      cityNames: ['Lund'],
      capturedOn: '2026-08-30',
      now: NOW,
      workshops: [ws('w9', 'Lund')],
      requestsInWindow: [req('r9', 'Lund', 2, 'pending_approval')],
      quotesInWindow: [],
    })
    expect(result.fill_rate).toBeNull()
    expect(result.requests_30d).toBe(1)
    expect(result.active_workshops).toBe(0)
    expect(result.median_hours_to_first_quote).toBeNull()
    expect(result.quotes_per_week).toBe(0)
  })

  it('fill_rate counts only published requests with >=1 quote', () => {
    const result = computeSupplyHealthForScope({
      scopeSlug: 'uppsala',
      cityNames: ['Uppsala'],
      capturedOn: '2026-08-30',
      now: NOW,
      workshops: [],
      requestsInWindow: [
        req('r1', 'Uppsala', 10, 'approved', 10),
        req('r2', 'Uppsala', 9, 'approved', 9),
        req('r3', 'Uppsala', 8, 'approved', 8),
        req('r4', 'Uppsala', 7, 'rejected'),
      ],
      quotesInWindow: [quote('q1', 'r1', 'w1', 9, 5), quote('q2', 'r2', 'w1', 8, 2)],
    })
    expect(result.fill_rate).toBe(0.6667) // 2 of 3 published got a quote
    expect(result.requests_30d).toBe(4) // rejected still counts as demand
  })

  it('scopes quotes to request city even when the request predates the window', () => {
    const result = computeSupplyHealthForScope({
      scopeSlug: 'linkoping',
      cityNames: ['Linköping'],
      capturedOn: '2026-08-30',
      now: NOW,
      workshops: [ws('w1', 'Linköping')],
      requestsInWindow: [], // request created before the window
      quotesInWindow: [quote('q1', 'old-r', 'w1', 1)],
      requestCityById: new Map([['old-r', 'Linköping']]),
    })
    expect(result.quotes_30d).toBe(1)
    expect(result.active_workshops).toBe(1)
    expect(result.requests_30d).toBe(0)
  })

  it('ignores quotes and requests from other cities', () => {
    const result = computeSupplyHealthForScope({
      scopeSlug: 'norrkoping',
      cityNames: ['Norrköping'],
      capturedOn: '2026-08-30',
      now: NOW,
      workshops: [ws('w1', 'Linköping')],
      requestsInWindow: [req('r1', 'Linköping', 1)],
      quotesInWindow: [quote('q1', 'r1', 'w1', 1)],
    })
    expect(result.approved_workshops).toBe(0)
    expect(result.active_workshops).toBe(0)
    expect(result.requests_30d).toBe(0)
    expect(result.quotes_30d).toBe(0)
    expect(result.fill_rate).toBeNull()
  })
})

describe('computeClusterSupplyHealth (Östergötland as one supply market)', () => {
  it('aggregates member cities without double-counting workshops', () => {
    const cluster = computeClusterSupplyHealth({
      clusterSlug: 'ostergotland',
      members: [
        { citySlug: 'linkoping', cityName: 'Linköping' },
        { citySlug: 'norrkoping', cityName: 'Norrköping' },
      ],
      capturedOn: '2026-08-30',
      now: NOW,
      workshops: [ws('w1', 'Linköping'), ws('w2', 'Norrköping'), ws('w3', 'Uppsala')],
      requestsInWindow: [
        req('r1', 'Linköping', 4, 'approved', 4),
        req('r2', 'Norrköping', 2, 'approved', 2),
        req('r3', 'Uppsala', 1), // outside the cluster
      ],
      quotesInWindow: [
        quote('q1', 'r1', 'w1', 3, 14), // 10h after r1's approval (day 4)
        quote('q2', 'r2', 'w2', 1, 18), // 6h after r2's approval (day 2)
        quote('q3', 'r3', 'w3', 0),
      ],
    })

    expect(cluster.city_slugs).toEqual(['linkoping', 'norrkoping'])
    expect(cluster.approved_workshops).toBe(2) // w3 (Uppsala) excluded
    expect(cluster.active_workshops).toBe(2)
    expect(cluster.requests_30d).toBe(2)
    expect(cluster.quotes_30d).toBe(2)
    expect(cluster.fill_rate).toBe(1)
    expect(cluster.median_hours_to_first_quote).toBe(8) // median(10, 6)
    expect(cluster.quotes_per_week).toBe(0.5) // 2 / (30/7) ≈ 0.47 → 0.5
  })
})
