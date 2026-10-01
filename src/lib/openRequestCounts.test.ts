import { describe, expect, it } from 'vitest'
import { openRequestsSummary, summarizeOpenRequestCounts } from './openRequestCounts'

const t = (sv: string, vars?: Record<string, string | number>) =>
  sv.replace(/\{(\w+)\}/g, (m, key) => (vars && key in vars ? String(vars[key]) : m))

describe('summarizeOpenRequestCounts', () => {
  it('sums per city and in total, accepting bigint-as-string counts', () => {
    const counts = summarizeOpenRequestCounts([
      { city: 'Lund', open_count: '3', latest_at: null },
      { city: 'Uppsala', open_count: 2, latest_at: null },
    ])
    expect(counts.byCity.get('Lund')).toBe(3)
    expect(counts.byCity.get('Uppsala')).toBe(2)
    expect(counts.total).toBe(5)
  })

  it('ignores empty, zero and malformed rows', () => {
    const counts = summarizeOpenRequestCounts([
      { city: '', open_count: 4, latest_at: null },
      { city: 'Lund', open_count: 0, latest_at: null },
      { city: 'Uppsala', open_count: 'x', latest_at: null },
    ])
    expect(counts.total).toBe(0)
    expect(counts.byCity.size).toBe(0)
    expect(summarizeOpenRequestCounts(null).total).toBe(0)
  })
})

describe('openRequestsSummary', () => {
  const counts = summarizeOpenRequestCounts([
    { city: 'Lund', open_count: 3, latest_at: null },
    { city: 'Uppsala', open_count: 1, latest_at: null },
  ])

  it('describes all cities or the selected city with correct plural', () => {
    expect(openRequestsSummary(counts, '', t)).toBe('4 öppna ärenden de senaste 14 dagarna')
    expect(openRequestsSummary(counts, 'Lund', t)).toBe('3 öppna ärenden i Lund de senaste 14 dagarna')
    expect(openRequestsSummary(counts, 'Uppsala', t)).toBe('1 öppet ärende i Uppsala de senaste 14 dagarna')
  })

  it('shows nothing rather than a zero', () => {
    expect(openRequestsSummary(counts, 'Norrköping', t)).toBeNull()
    expect(openRequestsSummary(summarizeOpenRequestCounts([]), '', t)).toBeNull()
  })
})
