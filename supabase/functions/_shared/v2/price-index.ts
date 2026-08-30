// V2 Cykelprisindex — PURE stats + sample-gate logic (S5).
// Contract: docs/v2/CONTRACTS.md §2.5, gate G-P2.
//
// This module is PURE (no I/O, no Deno/npm specifiers) so vitest can import it
// directly, exactly like config-schema.ts. The SQL RPC
// public.v2_get_price_index (migration 20260830_v2_contracts_05 +
// 20260831_v2_pricing_prisindex) enforces the same sample gate IN SQL — the
// helpers here mirror that logic for the frontend and for unit tests.
//
// Honesty rule (research: adversarial critique / dim08): insufficient samples
// are NEVER displayed as statistics; the fallback is always clearly labelled
// 'riktpris' (external guide data, not Cykelhjälpen statistics).

import {
  priceConfidence,
  priceConfidenceIsDisplayable,
  type V2PriceConfidence,
} from './config-schema.ts'

// ---------------------------------------------------------------------------
// Rollup math
// ---------------------------------------------------------------------------

export interface V2PriceStats {
  sampleCount: number
  medianSek: number | null
  p25Sek: number | null
  p75Sek: number | null
  minSek: number | null
  maxSek: number | null
  outliersRemoved: number
  confidence: V2PriceConfidence
}

export const EMPTY_PRICE_STATS: V2PriceStats = {
  sampleCount: 0,
  medianSek: null,
  p25Sek: null,
  p75Sek: null,
  minSek: null,
  maxSek: null,
  outliersRemoved: 0,
  confidence: 'insufficient',
}

/** percentile_cont-style linear interpolation on an ascending-sorted array. */
export function percentileCont(sortedAsc: number[], p: number): number | null {
  const n = sortedAsc.length
  if (n === 0) return null
  if (n === 1) return sortedAsc[0]
  const pos = (n - 1) * p
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  if (lower === upper) return sortedAsc[lower]
  const fraction = pos - lower
  return sortedAsc[lower] + (sortedAsc[upper] - sortedAsc[lower]) * fraction
}

/**
 * Contract IQR rule (§2.5): drop values < Q1 − 1.5·IQR or > Q3 + 1.5·IQR.
 * Not applied to samples smaller than 4 — quartiles are degenerate there and
 * every observation is precious (tiny samples are confidence-gated anyway).
 */
export function removeIqrOutliers(values: number[]): { kept: number[]; removed: number } {
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length < 4) return { kept: sorted, removed: 0 }

  const q1 = percentileCont(sorted, 0.25)!
  const q3 = percentileCont(sorted, 0.75)!
  const iqr = q3 - q1
  if (iqr <= 0) return { kept: sorted, removed: 0 }

  const lowFence = q1 - 1.5 * iqr
  const highFence = q3 + 1.5 * iqr
  const kept = sorted.filter((v) => v >= lowFence && v <= highFence)
  return { kept, removed: sorted.length - kept.length }
}

/**
 * Compute one stats row from raw SEK sample values (quote midpoints or final
 * outcome prices). Non-finite values are dropped before anything else.
 * Stats are computed on the outlier-filtered sample; sampleCount is the
 * filtered count and confidence follows the contract thresholds (3/10/30).
 */
export function computePriceStats(values: number[]): V2PriceStats {
  const clean = values
    .filter((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)
    .map((v) => Math.round(v))

  if (clean.length === 0) return EMPTY_PRICE_STATS

  const { kept, removed } = removeIqrOutliers(clean)
  if (kept.length === 0) return { ...EMPTY_PRICE_STATS, outliersRemoved: removed }

  const round = (v: number | null) => (v === null ? null : Math.round(v))
  return {
    sampleCount: kept.length,
    medianSek: round(percentileCont(kept, 0.5)),
    p25Sek: round(percentileCont(kept, 0.25)),
    p75Sek: round(percentileCont(kept, 0.75)),
    minSek: kept[0],
    maxSek: kept[kept.length - 1],
    outliersRemoved: removed,
    confidence: priceConfidence(kept.length),
  }
}

/** Quote sample value = midpoint of the workshop's estimated range (legacy convention). */
export function quoteSampleValue(
  estimatedPriceMin: number | null,
  estimatedPriceMax: number | null,
): number | null {
  if (estimatedPriceMin == null || estimatedPriceMax == null) return null
  if (!Number.isFinite(estimatedPriceMin) || !Number.isFinite(estimatedPriceMax)) return null
  return Math.round((estimatedPriceMin + estimatedPriceMax) / 2)
}

// ---------------------------------------------------------------------------
// Sample-gated public display (mirror of SQL RPC v2_get_price_index)
// ---------------------------------------------------------------------------

/** Row shapes as returned by the SQL RPC / v2-get-price-index (contract §3.5). */
export interface V2PriceIndexPublicRow {
  repair_category: string
  sample_count: number | null
  median_sek: number | null
  p25_sek: number | null
  p75_sek: number | null
  confidence: string
  window_end: string | null
  kind: 'stats' | 'riktpris'
}

export interface V2PriceIndexResponse {
  rows: V2PriceIndexPublicRow[]
  sample_gated: boolean
}

export interface V2PriceIndexStatsRowLike {
  repair_category: string
  sample_count: number
  median_sek: number | null
  p25_sek: number | null
  p75_sek: number | null
  confidence: string
  window_end: string // date
  source?: string
}

export interface V2GuidePriceRowLike {
  repair_category: string
  bike_type: string | null
  city_slug: string | null
  price_min_sek: number
  price_max_sek: number
  typical_sek: number | null
}

/**
 * Latest displayable stats per category. 'insufficient' rows are never
 * displayed (same filter as the SQL RPC: confidence >= 'low', i.e. n >= 3).
 */
export function pickDisplayableStats(
  rows: V2PriceIndexStatsRowLike[],
  category?: string | null,
): V2PriceIndexPublicRow[] {
  const byCategory = new Map<string, V2PriceIndexStatsRowLike>()
  for (const row of rows) {
    if (category && row.repair_category !== category) continue
    if (!priceConfidenceIsDisplayable(row.confidence as V2PriceConfidence)) continue
    const existing = byCategory.get(row.repair_category)
    if (
      !existing ||
      row.window_end > existing.window_end ||
      (row.window_end === existing.window_end && row.sample_count > existing.sample_count)
    ) {
      byCategory.set(row.repair_category, row)
    }
  }
  return [...byCategory.values()]
    .sort((a, b) => a.repair_category.localeCompare(b.repair_category, 'sv'))
    .map((row) => ({
      repair_category: row.repair_category,
      sample_count: row.sample_count,
      median_sek: row.median_sek,
      p25_sek: row.p25_sek,
      p75_sek: row.p75_sek,
      confidence: row.confidence,
      window_end: row.window_end,
      kind: 'stats' as const,
    }))
}

/**
 * Guide-price fallback, one row per category, preferring city-specific rows
 * over national (city_slug NULL) rows — mirrors the SQL RPC fallback.
 */
export function pickGuidePriceRows(
  rows: V2GuidePriceRowLike[],
  citySlug: string,
  category?: string | null,
): V2PriceIndexPublicRow[] {
  const byCategory = new Map<string, V2GuidePriceRowLike>()
  for (const row of rows) {
    if (category && row.repair_category !== category) continue
    if (row.city_slug !== null && row.city_slug !== citySlug) continue
    const existing = byCategory.get(row.repair_category)
    // City-specific beats national; otherwise first wins (stable input order).
    if (!existing || (existing.city_slug === null && row.city_slug === citySlug)) {
      byCategory.set(row.repair_category, row)
    }
  }
  return [...byCategory.values()]
    .sort((a, b) => a.repair_category.localeCompare(b.repair_category, 'sv'))
    .map((row) => ({
      repair_category: row.repair_category,
      sample_count: null,
      median_sek: row.typical_sek,
      p25_sek: row.price_min_sek,
      p75_sek: row.price_max_sek,
      confidence: 'riktpris',
      window_end: null,
      kind: 'riktpris' as const,
    }))
}

/**
 * The full sample gate, mirroring public.v2_get_price_index:
 * real stats only when the public-display flag is on AND the city is marked
 * price_index_public AND at least one displayable stats row exists;
 * otherwise clearly labelled riktpris rows. sample_gated=true means the rows
 * are guide data, NOT Cykelhjälpen statistics — the UI must label them.
 */
export function resolvePriceIndexResponse(opts: {
  displayEnabled: boolean
  cityPublic: boolean
  statsRows: V2PriceIndexStatsRowLike[]
  guideRows: V2GuidePriceRowLike[]
  citySlug: string
  category?: string | null
}): V2PriceIndexResponse {
  if (opts.displayEnabled && opts.cityPublic) {
    const stats = pickDisplayableStats(opts.statsRows, opts.category)
    if (stats.length > 0) return { rows: stats, sample_gated: false }
  }
  return {
    rows: pickGuidePriceRows(opts.guideRows, opts.citySlug, opts.category),
    sample_gated: true,
  }
}
