// V2 Cykelprisindex tests (S5). Contract §2.5/§3.5, gate G-P2.
// Covers: rollup math (median/percentiles/IQR outliers), confidence labels,
// and the sample gate (on/off/insufficient) mirrored from the SQL RPC.

import { describe, expect, it } from 'vitest'

import {
  computePriceStats,
  EMPTY_PRICE_STATS,
  percentileCont,
  pickDisplayableStats,
  pickGuidePriceRows,
  quoteSampleValue,
  removeIqrOutliers,
  resolvePriceIndexResponse,
  type V2GuidePriceRowLike,
  type V2PriceIndexStatsRowLike,
} from '../../../supabase/functions/_shared/v2/price-index'

describe('percentileCont (linear interpolation, percentile_cont semantics)', () => {
  it('handles empty/single/odd/even samples', () => {
    expect(percentileCont([], 0.5)).toBeNull()
    expect(percentileCont([200], 0.5)).toBe(200)
    expect(percentileCont([100, 200, 300], 0.5)).toBe(200)
    expect(percentileCont([100, 200, 300, 400], 0.5)).toBe(250)
  })

  it('interpolates quartiles', () => {
    // n=5: p25 pos=1 → exact element; p75 pos=3 → exact element
    expect(percentileCont([100, 200, 300, 400, 500], 0.25)).toBe(200)
    expect(percentileCont([100, 200, 300, 400, 500], 0.75)).toBe(400)
    // n=4: p25 pos=0.75 → 100 + 0.75*100 = 175
    expect(percentileCont([100, 200, 300, 400], 0.25)).toBe(175)
    expect(percentileCont([100, 200, 300, 400], 0.75)).toBe(325)
  })
})

describe('removeIqrOutliers (contract IQR rule: < Q1−1.5·IQR or > Q3+1.5·IQR)', () => {
  it('drops a clear upper outlier and counts it', () => {
    const { kept, removed } = removeIqrOutliers([400, 450, 500, 550, 600, 5000])
    expect(kept).toEqual([400, 450, 500, 550, 600])
    expect(removed).toBe(1)
  })

  it('drops lower outliers too', () => {
    const { kept, removed } = removeIqrOutliers([1, 400, 450, 500, 550, 600])
    expect(kept).toEqual([400, 450, 500, 550, 600])
    expect(removed).toBe(1)
  })

  it('keeps everything when spread is normal', () => {
    const { kept, removed } = removeIqrOutliers([395, 450, 500, 600, 700, 800])
    expect(kept).toHaveLength(6)
    expect(removed).toBe(0)
  })

  it('never touches samples smaller than 4 (quartiles degenerate)', () => {
    const { kept, removed } = removeIqrOutliers([100, 200, 10000])
    expect(kept).toEqual([100, 200, 10000])
    expect(removed).toBe(0)
  })
})

describe('computePriceStats', () => {
  it('empty input → empty stats with insufficient confidence', () => {
    expect(computePriceStats([])).toEqual(EMPTY_PRICE_STATS)
    expect(computePriceStats([Number.NaN, -5]).confidence).toBe('insufficient')
  })

  it('computes median/quartiles/min/max on the filtered sample', () => {
    const stats = computePriceStats([395, 450, 500, 600, 700, 800])
    expect(stats.sampleCount).toBe(6)
    expect(stats.medianSek).toBe(550)
    expect(stats.minSek).toBe(395)
    expect(stats.maxSek).toBe(800)
    expect(stats.outliersRemoved).toBe(0)
    expect(stats.confidence).toBe('low')
  })

  it('removes outliers BEFORE stats and reflects them in sampleCount', () => {
    const stats = computePriceStats([400, 450, 500, 550, 600, 9900])
    expect(stats.outliersRemoved).toBe(1)
    expect(stats.sampleCount).toBe(5)
    expect(stats.maxSek).toBe(600)
    expect(stats.medianSek).toBe(500)
  })

  it('confidence thresholds follow the contract (3/10/30)', () => {
    const at = (n: number) => computePriceStats(Array.from({ length: n }, (_, i) => 400 + i)).confidence
    expect(at(1)).toBe('insufficient')
    expect(at(2)).toBe('insufficient')
    expect(at(3)).toBe('low')
    expect(at(9)).toBe('low')
    expect(at(10)).toBe('medium')
    expect(at(29)).toBe('medium')
    expect(at(30)).toBe('high')
  })
})

describe('quoteSampleValue', () => {
  it('uses the estimate midpoint (legacy convention)', () => {
    expect(quoteSampleValue(400, 600)).toBe(500)
    expect(quoteSampleValue(401, 600)).toBe(501) // rounded
    expect(quoteSampleValue(null, 600)).toBeNull()
    expect(quoteSampleValue(400, null)).toBeNull()
    expect(quoteSampleValue(null, null)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Sample gate (mirror of public.v2_get_price_index)
// ---------------------------------------------------------------------------

const statsRow = (over: Partial<V2PriceIndexStatsRowLike> = {}): V2PriceIndexStatsRowLike => ({
  repair_category: 'Service / genomgång',
  sample_count: 12,
  median_sek: 650,
  p25_sek: 500,
  p75_sek: 800,
  confidence: 'medium',
  window_end: '2026-08-30',
  source: 'quotes',
  ...over,
})

const guideRow = (over: Partial<V2GuidePriceRowLike> = {}): V2GuidePriceRowLike => ({
  repair_category: 'Service / genomgång',
  bike_type: null,
  city_slug: null,
  price_min_sek: 395,
  price_max_sek: 1700,
  typical_sek: 800,
  ...over,
})

describe('pickDisplayableStats', () => {
  it('never returns insufficient rows', () => {
    const rows = pickDisplayableStats([statsRow({ confidence: 'insufficient', sample_count: 2 })])
    expect(rows).toEqual([])
  })

  it('picks the latest window per category', () => {
    const rows = pickDisplayableStats([
      statsRow({ window_end: '2026-06-30', median_sek: 600 }),
      statsRow({ window_end: '2026-08-30', median_sek: 650 }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].median_sek).toBe(650)
    expect(rows[0].kind).toBe('stats')
  })

  it('same-window tiebreak prefers the larger sample', () => {
    const rows = pickDisplayableStats([
      statsRow({ sample_count: 4, median_sek: 700, source: 'outcomes' }),
      statsRow({ sample_count: 12, median_sek: 650, source: 'quotes' }),
    ])
    expect(rows[0].sample_count).toBe(12)
  })

  it('applies the category filter', () => {
    const rows = pickDisplayableStats(
      [statsRow(), statsRow({ repair_category: 'Bromsar' })],
      'Bromsar',
    )
    expect(rows.map((r) => r.repair_category)).toEqual(['Bromsar'])
  })
})

describe('pickGuidePriceRows', () => {
  it('prefers city-specific riktpris over national', () => {
    const rows = pickGuidePriceRows(
      [guideRow(), guideRow({ city_slug: 'lund', price_min_sek: 249, price_max_sek: 499, typical_sek: 449 })],
      'lund',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].p25_sek).toBe(249)
    expect(rows[0].kind).toBe('riktpris')
    expect(rows[0].confidence).toBe('riktpris')
    expect(rows[0].sample_count).toBeNull()
  })

  it('falls back to the national row for other cities', () => {
    const rows = pickGuidePriceRows([guideRow({ city_slug: 'lund' }), guideRow()], 'uppsala')
    expect(rows[0].p25_sek).toBe(395)
  })
})

describe('resolvePriceIndexResponse — the sample gate', () => {
  const base = {
    statsRows: [statsRow()],
    guideRows: [guideRow()],
    citySlug: 'linkoping',
  }

  it('gate OFF (flag off) → riktpris, sample_gated=true', () => {
    const res = resolvePriceIndexResponse({ ...base, displayEnabled: false, cityPublic: true })
    expect(res.sample_gated).toBe(true)
    expect(res.rows[0].kind).toBe('riktpris')
  })

  it('gate OFF (city not public) → riktpris, sample_gated=true', () => {
    const res = resolvePriceIndexResponse({ ...base, displayEnabled: true, cityPublic: false })
    expect(res.sample_gated).toBe(true)
  })

  it('gate ON with displayable stats → real stats, sample_gated=false', () => {
    const res = resolvePriceIndexResponse({ ...base, displayEnabled: true, cityPublic: true })
    expect(res.sample_gated).toBe(false)
    expect(res.rows[0].kind).toBe('stats')
    expect(res.rows[0].sample_count).toBe(12)
  })

  it('gate ON but only insufficient samples → riktpris fallback (never fake stats)', () => {
    const res = resolvePriceIndexResponse({
      ...base,
      displayEnabled: true,
      cityPublic: true,
      statsRows: [statsRow({ confidence: 'insufficient', sample_count: 2 })],
    })
    expect(res.sample_gated).toBe(true)
    expect(res.rows[0].kind).toBe('riktpris')
  })

  it('gate ON with no guide rows either → empty rows, still gated', () => {
    const res = resolvePriceIndexResponse({
      ...base,
      displayEnabled: true,
      cityPublic: true,
      statsRows: [],
      guideRows: [],
    })
    expect(res.sample_gated).toBe(true)
    expect(res.rows).toEqual([])
  })
})
