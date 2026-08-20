import { CYKEL_CITIES, isCykelCity, type CykelCityName } from './cykelCities'

/** Tables Cykel admin health/analytics may read. Nested `workshop_responses` is included. */
export const CYKEL_MARKETPLACE_TABLES = [
  'bike_repair_requests',
  'workshop_responses',
  'workshops',
] as const

/** Leftover Updro tables that Cykel admin must not query. */
export const UPDRO_MARKETPLACE_TABLES = [
  'projects',
  'offers',
  'supplier_profiles',
  'marketplace_category_health',
  'unlocked_leads',
] as const

export const ACTIVE_WORKSHOP_QUOTE_WINDOW_DAYS = 30

export const CYKEL_ANALYTICS_SELECT = {
  bike_repair_requests:
    'id, created_at, approved_at, admin_status, status, city, repair_category, workshop_responses(id, created_at, workshop_id, status, paid)',
  workshops: 'id, company_name, city, approved, created_at',
} as const

export type QuoteBucket = '0' | '1' | '2' | '3+'
export type WorkshopLiquidity = 'active' | 'silent' | 'unapproved'
export type CityHealthStatus = 'healthy' | 'watch' | 'low_supply' | 'pause_or_recruit'

export const CITY_HEALTH_LABELS: Record<CityHealthStatus, string> = {
  healthy: 'Sund',
  watch: 'Bevaka',
  low_supply: 'Låg täckning',
  pause_or_recruit: 'Pausa eller rekrytera',
}

export const ROLLUP_CITIES: readonly CykelCityName[] = CYKEL_CITIES.map((city) => city.name)

export interface CykelQuoteRow {
  id: string
  created_at: string
  workshop_id: string
  status?: string | null
  paid?: boolean | null
}

export interface CykelRequestRow {
  id: string
  created_at: string
  approved_at?: string | null
  admin_status: string
  status?: string | null
  city: string
  repair_category?: string | null
  workshop_responses?: CykelQuoteRow[] | null
}

export interface CykelWorkshopRow {
  id: string
  company_name: string
  city: string | null
  approved: boolean
  created_at?: string
}

export interface CityRollup {
  city: CykelCityName | 'Övrigt'
  requests: number
  pending: number
  approved: number
  rejected: number
  quotes0: number
  quotes1: number
  quotes2: number
  quotes3plus: number
  medianHoursToFirstQuote: number | null
  meanHoursToFirstQuote: number | null
  approvedWorkshops: number
  activeWorkshops: number
  silentWorkshops: number
  openApprovedRequests: number
  requestsWithoutQuotes: number
  healthStatus: CityHealthStatus
}

export interface CykelMarketplaceSnapshot {
  totals: {
    requests: number
    pending: number
    approved: number
    rejected: number
    quotes: number
    wonQuotes: number
    approvedWorkshops: number
    activeWorkshops: number
    silentWorkshops: number
    requestsWithQuotes: number
    avgQuotesPerRequest: number
    medianHoursToFirstQuote: number | null
  }
  cityRollup: CityRollup[]
  silentWorkshops: CykelWorkshopRow[]
  activeWorkshops: CykelWorkshopRow[]
  categoryDist: { name: string; value: number }[]
  requestsByDay: { date: string; count: number }[]
  quotesByDay: { date: string; count: number }[]
  topWorkshops: { id: string; name: string; city: string | null; quotes: number; approved: boolean; liquidity: WorkshopLiquidity }[]
}

const CLOSED_REQUEST_STATUSES = new Set([
  'closed_for_responses',
  'full',
  'expired',
  'choice_expired',
  'completed',
])

export function quoteWindowStart(now: Date = new Date(), days = ACTIVE_WORKSHOP_QUOTE_WINDOW_DAYS): Date {
  return new Date(now.getTime() - days * 86_400_000)
}

export function quotedWorkshopIdsSince(
  responses: Iterable<Pick<CykelQuoteRow, 'workshop_id' | 'created_at'>>,
  since: Date,
): Set<string> {
  const ids = new Set<string>()
  const sinceMs = since.getTime()
  for (const response of responses) {
    if (!response.workshop_id) continue
    const created = Date.parse(response.created_at)
    if (!Number.isFinite(created) || created < sinceMs) continue
    ids.add(response.workshop_id)
  }
  return ids
}

/**
 * Active workshop (Cykel): approved AND at least one quote in the last 30 days.
 * Approved-but-silent shops are supply that is not liquid — not counted as active.
 */
export function classifyWorkshopLiquidity(
  workshop: Pick<CykelWorkshopRow, 'id' | 'approved'>,
  quotedWorkshopIds: Set<string>,
): WorkshopLiquidity {
  if (!workshop.approved) return 'unapproved'
  return quotedWorkshopIds.has(workshop.id) ? 'active' : 'silent'
}

export function isActiveWorkshop(
  workshop: Pick<CykelWorkshopRow, 'id' | 'approved'>,
  quotedWorkshopIds: Set<string>,
): boolean {
  return classifyWorkshopLiquidity(workshop, quotedWorkshopIds) === 'active'
}

export function quoteBucket(count: number): QuoteBucket {
  if (count <= 0) return '0'
  if (count === 1) return '1'
  if (count === 2) return '2'
  return '3+'
}

export function rollupCityName(city: string | null | undefined): CykelCityName | 'Övrigt' {
  return isCykelCity(city) ? city : 'Övrigt'
}

export function isPendingAdminStatus(status: string): boolean {
  return status !== 'approved' && status !== 'rejected'
}

export function isOpenApprovedRequest(request: Pick<CykelRequestRow, 'admin_status' | 'status'>): boolean {
  return request.admin_status === 'approved' && !CLOSED_REQUEST_STATUSES.has(request.status || '')
}

export function hoursToFirstQuote(
  request: Pick<CykelRequestRow, 'created_at' | 'approved_at'>,
  firstQuoteAt: string | null | undefined,
): number | null {
  if (!firstQuoteAt) return null
  const start = Date.parse(request.approved_at || request.created_at)
  const first = Date.parse(firstQuoteAt)
  if (!Number.isFinite(start) || !Number.isFinite(first)) return null
  return Math.max(0, (first - start) / 3_600_000)
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function cityHealthStatus(input: {
  openApprovedRequests: number
  requestsWithoutQuotes: number
  activeWorkshops: number
}): CityHealthStatus {
  const { openApprovedRequests, requestsWithoutQuotes, activeWorkshops } = input
  if (openApprovedRequests > 0 && activeWorkshops === 0) return 'pause_or_recruit'
  if (openApprovedRequests >= 3 && activeWorkshops < 2) return 'low_supply'
  if (requestsWithoutQuotes >= 2 && activeWorkshops < 2) return 'low_supply'
  if (activeWorkshops >= 2 && requestsWithoutQuotes === 0) return 'healthy'
  if (activeWorkshops >= 1) return 'watch'
  return 'watch'
}

export function formatHoursToQuote(hours: number | null): string {
  if (hours == null) return '–'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} d`
}

function emptyCityRollup(city: CykelCityName | 'Övrigt'): CityRollup {
  return {
    city,
    requests: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    quotes0: 0,
    quotes1: 0,
    quotes2: 0,
    quotes3plus: 0,
    medianHoursToFirstQuote: null,
    meanHoursToFirstQuote: null,
    approvedWorkshops: 0,
    activeWorkshops: 0,
    silentWorkshops: 0,
    openApprovedRequests: 0,
    requestsWithoutQuotes: 0,
    healthStatus: 'watch',
  }
}

function incrementQuoteBucket(row: CityRollup, bucket: QuoteBucket) {
  if (bucket === '0') row.quotes0 += 1
  else if (bucket === '1') row.quotes1 += 1
  else if (bucket === '2') row.quotes2 += 1
  else row.quotes3plus += 1
}

function groupByDay(dates: string[], now: Date): { date: string; count: number }[] {
  const map = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86_400_000)
    map.set(day.toISOString().slice(0, 10), 0)
  }
  for (const value of dates) {
    const key = value.slice(0, 10)
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date: date.slice(5), count }))
}

export function flattenQuotes(requests: CykelRequestRow[]): CykelQuoteRow[] {
  return requests.flatMap((request) => request.workshop_responses || [])
}

export function buildCykelMarketplaceSnapshot(
  requests: CykelRequestRow[],
  workshops: CykelWorkshopRow[],
  now: Date = new Date(),
): CykelMarketplaceSnapshot {
  const quotedIds = quotedWorkshopIdsSince(flattenQuotes(requests), quoteWindowStart(now))
  const cityHours = new Map<string, number[]>()
  const allHours: number[] = []
  const rows = new Map<string, CityRollup>()

  for (const city of ROLLUP_CITIES) {
    rows.set(city, emptyCityRollup(city))
    cityHours.set(city, [])
  }

  for (const request of requests) {
    const city = rollupCityName(request.city)
    if (!rows.has(city)) {
      rows.set(city, emptyCityRollup(city))
      cityHours.set(city, [])
    }
    const row = rows.get(city)!
    const quotes = request.workshop_responses || []
    const firstQuoteAt = quotes.reduce<string | null>((earliest, quote) => {
      if (!earliest || quote.created_at < earliest) return quote.created_at
      return earliest
    }, null)
    const hours = hoursToFirstQuote(request, firstQuoteAt)
    if (hours != null) {
      cityHours.get(city)!.push(hours)
      allHours.push(hours)
    }

    row.requests += 1
    if (request.admin_status === 'approved') row.approved += 1
    else if (request.admin_status === 'rejected') row.rejected += 1
    else row.pending += 1

    const bucket = quoteBucket(quotes.length)
    incrementQuoteBucket(row, bucket)
    if (isOpenApprovedRequest(request)) row.openApprovedRequests += 1
    if (request.admin_status === 'approved' && quotes.length === 0) row.requestsWithoutQuotes += 1
  }

  for (const workshop of workshops) {
    const city = rollupCityName(workshop.city)
    if (!rows.has(city)) {
      rows.set(city, emptyCityRollup(city))
      cityHours.set(city, [])
    }
    const row = rows.get(city)!
    const liquidity = classifyWorkshopLiquidity(workshop, quotedIds)
    if (liquidity === 'active') {
      row.approvedWorkshops += 1
      row.activeWorkshops += 1
    } else if (liquidity === 'silent') {
      row.approvedWorkshops += 1
      row.silentWorkshops += 1
    }
  }

  const cityRollup = Array.from(rows.values()).map((row) => {
    const hours = cityHours.get(row.city) || []
    return {
      ...row,
      medianHoursToFirstQuote: median(hours),
      meanHoursToFirstQuote: mean(hours),
      healthStatus: cityHealthStatus(row),
    }
  }).sort((a, b) => {
    const order = [...ROLLUP_CITIES, 'Övrigt']
    return order.indexOf(a.city) - order.indexOf(b.city)
  })

  const quotes = flattenQuotes(requests)
  const approvedWorkshops = workshops.filter((workshop) => workshop.approved)
  const activeWorkshops = approvedWorkshops.filter((workshop) => quotedIds.has(workshop.id))
  const silentWorkshops = approvedWorkshops.filter((workshop) => !quotedIds.has(workshop.id))

  const categoryMap = new Map<string, number>()
  for (const request of requests) {
    const name = request.repair_category || 'Okänd'
    categoryMap.set(name, (categoryMap.get(name) || 0) + 1)
  }

  const quoteCounts = new Map<string, number>()
  for (const quote of quotes) {
    quoteCounts.set(quote.workshop_id, (quoteCounts.get(quote.workshop_id) || 0) + 1)
  }
  const workshopById = new Map(workshops.map((workshop) => [workshop.id, workshop]))
  const topWorkshops = Array.from(quoteCounts.entries())
    .map(([id, count]) => {
      const workshop = workshopById.get(id)
      return {
        id,
        name: workshop?.company_name || 'Okänd verkstad',
        city: workshop?.city ?? null,
        quotes: count,
        approved: workshop?.approved ?? false,
        liquidity: workshop ? classifyWorkshopLiquidity(workshop, quotedIds) : 'unapproved' as WorkshopLiquidity,
      }
    })
    .sort((a, b) => b.quotes - a.quotes)
    .slice(0, 10)

  const approvedRequestCount = requests.filter((request) => request.admin_status === 'approved').length
  const requestsWithQuotes = requests.filter((request) => (request.workshop_responses || []).length > 0).length

  return {
    totals: {
      requests: requests.length,
      pending: requests.filter((request) => isPendingAdminStatus(request.admin_status)).length,
      approved: approvedRequestCount,
      rejected: requests.filter((request) => request.admin_status === 'rejected').length,
      quotes: quotes.length,
      wonQuotes: quotes.filter((quote) => quote.status === 'won' || quote.paid).length,
      approvedWorkshops: approvedWorkshops.length,
      activeWorkshops: activeWorkshops.length,
      silentWorkshops: silentWorkshops.length,
      requestsWithQuotes,
      avgQuotesPerRequest: requests.length > 0
        ? Math.round((quotes.length / requests.length) * 10) / 10
        : 0,
      medianHoursToFirstQuote: median(allHours),
    },
    cityRollup,
    silentWorkshops,
    activeWorkshops,
    categoryDist: Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    requestsByDay: groupByDay(requests.map((request) => request.created_at), now),
    quotesByDay: groupByDay(quotes.map((quote) => quote.created_at), now),
    topWorkshops,
  }
}

type SelectResult<T> = Promise<{ data: T[] | null; error: { message: string } | null }>

export interface CykelMarketplaceClient {
  from: (table: string) => { select: (columns: string) => SelectResult<any> }
}

export function assertCykelMarketplaceTable(table: string) {
  if ((UPDRO_MARKETPLACE_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Cykel admin must not query Updro table "${table}"`)
  }
  if (!(CYKEL_MARKETPLACE_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Unexpected Cykel marketplace table "${table}"`)
  }
}

export async function loadCykelMarketplaceRows(client: CykelMarketplaceClient | { from: (table: string) => any }): Promise<{
  requests: CykelRequestRow[]
  workshops: CykelWorkshopRow[]
}> {
  assertCykelMarketplaceTable('bike_repair_requests')
  assertCykelMarketplaceTable('workshops')

  const [requestResult, workshopResult] = await Promise.all([
    client.from('bike_repair_requests').select(CYKEL_ANALYTICS_SELECT.bike_repair_requests),
    client.from('workshops').select(CYKEL_ANALYTICS_SELECT.workshops),
  ])

  if (requestResult.error) throw new Error(requestResult.error.message)
  if (workshopResult.error) throw new Error(workshopResult.error.message)

  return {
    requests: (requestResult.data || []) as CykelRequestRow[],
    workshops: (workshopResult.data || []) as CykelWorkshopRow[],
  }
}
