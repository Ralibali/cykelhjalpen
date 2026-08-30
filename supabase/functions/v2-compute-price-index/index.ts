// v2-compute-price-index — Cykelprisindex rollup (S5).
// Contract: docs/v2/CONTRACTS.md §2.5 + §3.5.
//
// Computes per (city_slug × repair_category × window) stats from real
// marketplace data and upserts public.v2_price_index_stats:
//   - source 'quotes':   midpoints of workshop_responses estimates
//                        (status 'sent' OR paid — same filter as the legacy
//                        get_cykel_price_stats RPC)
//   - source 'outcomes': v2_job_outcomes.final_price_sek (when S3 data exists)
// Windows: rolling N-day window (default 90) + calendar-month snapshots for
// the months it overlaps. IQR outlier rule + confidence labels per contract.
//
// Auth: cron (Authorization: Bearer <service_role_key>) or admin JWT.
// Writes are gated on flag v2.prisindex.engine (G-P1); pass dry_run=true to
// preview without writing (used for gate evidence + scheduling verification,
// invariant I7). Also co-computes v2_workshop_review_stats.recent_avg_90d
// (contract §2.3) and emits price_index.computed (best-effort).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { v2FlagEnabled } from '../_shared/v2/flags.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'
import { computePriceStats, quoteSampleValue } from '../_shared/v2/price-index.ts'

const DEFAULT_WINDOW_DAYS = 90

const isoDate = (d: Date) => d.toISOString().slice(0, 10)

interface Sample {
  citySlug: string
  category: string
  value: number
  at: Date
}

interface QuoteRow {
  estimated_price_min: number | null
  estimated_price_max: number | null
  created_at: string
  bike_repair_requests: { city: string | null; repair_category: string | null } | null
}

interface OutcomeRow {
  final_price_sek: number | null
  created_at: string
  workshop_reported_at: string | null
  customer_confirmed_at: string | null
  bike_repair_requests: { city: string | null; repair_category: string | null } | null
}

interface StatsInsert {
  city_slug: string
  repair_category: string
  window_start: string
  window_end: string
  sample_count: number
  median_sek: number | null
  p25_sek: number | null
  p75_sek: number | null
  min_sek: number | null
  max_sek: number | null
  outliers_removed: number
  confidence: string
  source: 'quotes' | 'outcomes'
  computed_at: string
}

function monthWindows(rangeStart: Date, rangeEnd: Date): { start: Date; end: Date }[] {
  const windows: { start: Date; end: Date }[] = []
  const cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1))
  while (cursor <= rangeEnd) {
    const start = new Date(cursor)
    // Last instant of the calendar month (next month's day 0 at 00:00 would
    // EXCLUDE the last day's samples — subtract 1 ms instead).
    const end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1) - 1)
    windows.push({ start, end })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return windows
}

function buildRows(samples: Sample[], source: 'quotes' | 'outcomes', windows: { start: Date; end: Date }[]): StatsInsert[] {
  const rows: StatsInsert[] = []
  for (const win of windows) {
    const groups = new Map<string, number[]>()
    for (const s of samples) {
      if (s.at < win.start || s.at > win.end) continue
      const key = `${s.citySlug}::${s.category}`
      const list = groups.get(key) ?? []
      list.push(s.value)
      groups.set(key, list)
    }
    for (const [key, values] of groups) {
      const [citySlug, category] = key.split('::')
      const stats = computePriceStats(values)
      rows.push({
        city_slug: citySlug,
        repair_category: category,
        window_start: isoDate(win.start),
        window_end: isoDate(win.end),
        sample_count: stats.sampleCount,
        median_sek: stats.medianSek,
        p25_sek: stats.p25Sek,
        p75_sek: stats.p75Sek,
        min_sek: stats.minSek,
        max_sek: stats.maxSek,
        outliers_removed: stats.outliersRemoved,
        confidence: stats.confidence,
        source,
        computed_at: new Date().toISOString(),
      })
    }
  }
  return rows
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Backend configuration is missing' }, 500)

  try {
    // Auth: service-role bearer (cron) or admin JWT (manual trigger).
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token !== serviceRoleKey) {
      if (!token) return json({ error: 'Unauthorized', code: 'unauthorized' }, 401)
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      })
      const { data: userData, error: userError } = await userClient.auth.getUser(token)
      if (userError || !userData.user) return json({ error: 'Unauthorized', code: 'unauthorized' }, 401)
      const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
      const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userData.user.id })
      if (!isAdmin) return json({ error: 'Forbidden', code: 'forbidden' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const cityFilter = typeof body?.city_slug === 'string' ? body.city_slug : null
    const windowDays = Number.isInteger(body?.window_days) && body.window_days > 0 && body.window_days <= 366
      ? body.window_days
      : DEFAULT_WINDOW_DAYS
    const dryRun = body?.dry_run === true

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const windowEnd = new Date()
    const windowStart = new Date(windowEnd.getTime() - (windowDays - 1) * 24 * 3600 * 1000)

    // --- Quotes sample -------------------------------------------------------
    const { data: quoteRows, error: quoteError } = await admin
      .from('workshop_responses')
      .select('estimated_price_min, estimated_price_max, created_at, bike_repair_requests!inner(city, repair_category)')
      .or('status.eq.sent,paid.eq.true')
      .gte('created_at', windowStart.toISOString())
      .limit(10000)
    if (quoteError) throw quoteError

    const quoteSamples: Sample[] = []
    for (const row of (quoteRows ?? []) as unknown as QuoteRow[]) {
      const value = quoteSampleValue(row.estimated_price_min, row.estimated_price_max)
      const citySlug = row.bike_repair_requests?.city ? citySlugFromName(row.bike_repair_requests.city) : null
      const category = row.bike_repair_requests?.repair_category
      if (value === null || !citySlug || !category) continue
      if (cityFilter && citySlug !== cityFilter) continue
      quoteSamples.push({ citySlug, category, value, at: new Date(row.created_at) })
    }

    // --- Outcomes sample (final prices; empty until S3 flow is live) ---------
    const { data: outcomeRows, error: outcomeError } = await admin
      .from('v2_job_outcomes')
      .select('final_price_sek, created_at, workshop_reported_at, customer_confirmed_at, bike_repair_requests!inner(city, repair_category)')
      .not('final_price_sek', 'is', null)
      .gte('created_at', windowStart.toISOString())
      .limit(10000)
    if (outcomeError) throw outcomeError

    const outcomeSamples: Sample[] = []
    for (const row of (outcomeRows ?? []) as unknown as OutcomeRow[]) {
      const citySlug = row.bike_repair_requests?.city ? citySlugFromName(row.bike_repair_requests.city) : null
      const category = row.bike_repair_requests?.repair_category
      if (row.final_price_sek == null || !citySlug || !category) continue
      if (cityFilter && citySlug !== cityFilter) continue
      const at = row.customer_confirmed_at ?? row.workshop_reported_at ?? row.created_at
      outcomeSamples.push({ citySlug, category, value: row.final_price_sek, at: new Date(at) })
    }

    // --- Windows: rolling N days + calendar-month snapshots ------------------
    const windows = [
      { start: windowStart, end: windowEnd },
      ...monthWindows(windowStart, windowEnd),
    ]

    const rows = [
      ...buildRows(quoteSamples, 'quotes', windows),
      ...buildRows(outcomeSamples, 'outcomes', windows),
    ]

    const engineEnabled = await v2FlagEnabled(admin, 'v2.prisindex.engine')
    const shouldWrite = engineEnabled && !dryRun

    if (shouldWrite && rows.length > 0) {
      const { error: upsertError } = await admin
        .from('v2_price_index_stats')
        .upsert(rows, { onConflict: 'city_slug,repair_category,window_start,window_end,source' })
      if (upsertError) throw upsertError
    }

    // --- Co-compute: v2_workshop_review_stats.recent_avg_90d (contract §2.3) -
    if (shouldWrite) {
      try {
        const since90 = new Date(windowEnd.getTime() - 89 * 24 * 3600 * 1000).toISOString()
        const { data: reviews } = await admin
          .from('v2_reviews')
          .select('workshop_id, rating')
          .eq('state', 'published')
          .gte('created_at', since90)
        const byWorkshop = new Map<string, { sum: number; n: number }>()
        for (const review of reviews ?? []) {
          const agg = byWorkshop.get(review.workshop_id) ?? { sum: 0, n: 0 }
          agg.sum += Number(review.rating)
          agg.n += 1
          byWorkshop.set(review.workshop_id, agg)
        }
        for (const [workshopId, agg] of byWorkshop) {
          await admin
            .from('v2_workshop_review_stats')
            .update({ recent_avg_90d: Math.round((agg.sum / agg.n) * 100) / 100 })
            .eq('workshop_id', workshopId)
        }
      } catch (reviewError) {
        // Co-compute is best-effort; never fail the price rollup over it.
        console.error('recent_avg_90d co-compute failed', reviewError)
      }
    }

    const computed = rows
      .filter((r) => r.window_end === isoDate(windowEnd) && r.window_start === isoDate(windowStart))
      .map((r) => ({
        city_slug: r.city_slug,
        repair_category: r.repair_category,
        sample_count: r.sample_count,
        confidence: r.confidence,
      }))

    await emitDomainEvent(admin, {
      eventName: 'price_index.computed',
      actorType: 'system',
      citySlug: cityFilter,
      payload: {
        categories_computed: computed.length,
        total_samples: quoteSamples.length + outcomeSamples.length,
        window_days: windowDays,
        dry_run: dryRun,
        written: shouldWrite,
      },
    })

    return json({
      computed,
      window: { start: isoDate(windowStart), end: isoDate(windowEnd), days: windowDays },
      dry_run: dryRun,
      written: shouldWrite,
      engine_flag: engineEnabled,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    console.error('v2-compute-price-index', message)
    return json({ error: message, code: 'compute_failed' }, 500)
  }
})
