// V2 city-state customer messaging tests — pure logic, no DB.
// Contract: docs/v2/CONTRACTS.md §2.1 state semantics.

import { describe, expect, it } from 'vitest'

import { v2CityStateNotice } from './cityMessaging'

describe('v2CityStateNotice', () => {
  it('returns null for ACTIVE cities and missing config (live behavior unchanged)', () => {
    expect(v2CityStateNotice(null)).toBeNull()
    expect(v2CityStateNotice(undefined)).toBeNull()
    expect(v2CityStateNotice({ state: 'ACTIVE', city_name: 'Linköping', demand_open: true })).toBeNull()
  })

  it('SUPPLY_BUILDING → honest "vi bygger upp verkstadstätheten" info note', () => {
    const notice = v2CityStateNotice({ state: 'SUPPLY_BUILDING', city_name: 'Norrköping', demand_open: true })
    expect(notice?.tone).toBe('info')
    expect(notice?.state).toBe('SUPPLY_BUILDING')
    expect(notice?.title).toContain('verkstadstätheten')
    expect(notice?.title).toContain('Norrköping')
    expect(notice?.body).toContain('längre tid')
  })

  it('LIMITED → "nyligen igång" info note', () => {
    const notice = v2CityStateNotice({ state: 'LIMITED', city_name: 'Uppsala', demand_open: true })
    expect(notice?.tone).toBe('info')
    expect(notice?.title).toContain('Uppsala')
    expect(notice?.title).toContain('nyligen igång')
  })

  it('RESEARCH and PAUSED → warning notes', () => {
    const research = v2CityStateNotice({ state: 'RESEARCH', city_name: 'Malmö', demand_open: false })
    expect(research?.tone).toBe('warning')
    expect(research?.title).toContain('inte igång')

    const paused = v2CityStateNotice({ state: 'PAUSED', city_name: 'Lund', demand_open: false })
    expect(paused?.tone).toBe('warning')
    expect(paused?.title).toContain('pausar')
  })

  it('demand_open=false overrides any state with a warning (ops override)', () => {
    const notice = v2CityStateNotice({ state: 'ACTIVE', city_name: 'Linköping', demand_open: false })
    expect(notice?.tone).toBe('warning')
    expect(notice?.title).toContain('tillfälligt')
  })

  it('English variant exists for every state', () => {
    for (const state of ['SUPPLY_BUILDING', 'LIMITED', 'RESEARCH', 'PAUSED'] as const) {
      const notice = v2CityStateNotice({ state, city_name: 'Lund', demand_open: true }, 'en')
      expect(notice, state).not.toBeNull()
      expect(notice?.title).toContain('Lund')
    }
  })

  it('unknown states render nothing', () => {
    expect(v2CityStateNotice({ state: 'WHATEVER', city_name: 'Lund', demand_open: true })).toBeNull()
  })
})
