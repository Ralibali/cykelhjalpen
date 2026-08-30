// V2 workshop-retention — ren logik (inga Deno-/npm-beroenden).
// Contract: docs/v2/CONTRACTS.md §2.7, §3.7, §5, §8 (I4, I7).
// Alla cadences ligger bakom huvudflaggan v2.retention.lifecycle + en egen
// underflagga (alla seedade OFF). Tiderna nedan är svensk lokal tid
// (Europe/Stockholm) och alla dedupe-nycklar är stabila så att cron-retrier
// aldrig dubbel-skickar (I4).

// ---------------------------------------------------------------------------
// Flaggor (registry-utökning, seedade OFF i 20260901_v2_workshop_retention.sql)
// ---------------------------------------------------------------------------

export const RETENTION_MASTER_FLAG = 'v2.retention.lifecycle'

export const RETENTION_KIND_FLAGS = {
  reactivation: 'v2.retention.dormant_reactivation',
  opportunity_digest: 'v2.retention.weekly_digest',
  seasonal_reminder: 'v2.retention.seasonal_reactivation',
  performance_summary: 'v2.retention.performance_summary',
  profile_nudge: 'v2.retention.profile_nudge',
  workshop_notification: 'v2.retention.workshop_notifications',
} as const

export type RetentionKind = keyof typeof RETENTION_KIND_FLAGS

// ---------------------------------------------------------------------------
// Kadens-konfiguration (founder-hours-as-configuration: allt styrbart här)
// ---------------------------------------------------------------------------

export const RETENTION_CONFIG = {
  /** Dagar utan skickad offert innan en godkänd verkstad räknas som dormant. */
  dormantAfterDays: 30,
  /** Dagar utan offert → 'lapsing' (innan dormant). */
  lapsingAfterDays: 14,
  /** Återaktiveringssekvens: offsets i dagar från dormant-datum, max 3 mejl. */
  reactivationStepDays: [0, 7, 21] as readonly number[],
  /** Veckodag för digest (1 = måndag, ISO). */
  digestWeekday: 1,
  /** Säsongsfönster för vår-reaktivering (februari–mars, svensk tid). */
  seasonalMonths: [2, 3] as readonly number[],
  /** Dag i månaden då månadssammanfattning skickas. */
  performanceMonthDay: 1,
  /** Min dagar mellan profilknuffar + max antal totalt. */
  profileNudgeIntervalDays: 14,
  profileNudgeMaxCount: 3,
  /** Frekvenstak: max antal retention-mejl per kontakt och rullande 7 dygn. */
  maxMessagesPerContactPer7d: 2,
  /** Tysta timmar för SMS (21–08). E-post går dygnet runt men schemaläggs i fönstret 08–20. */
  smsQuietStartHour: 21,
  smsQuietEndHour: 8,
  timezone: 'Europe/Stockholm',
} as const

// ---------------------------------------------------------------------------
// Tidshjälpare (svensk lokal tid, DST-säkra via Intl)
// ---------------------------------------------------------------------------

export interface LocalParts {
  year: number
  month: number // 1–12
  day: number // 1–31
  hour: number // 0–23
  minute: number
  weekday: number // 1 (mån) – 7 (sön)
  dateKey: string // 'YYYY-MM-DD'
}

export function stockholmParts(now: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: RETENTION_CONFIG.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const hour = Number(parts.hour) % 24
  const minute = Number(parts.minute)
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`
  // Veckodagen för civila datumet är samma oavsett tidszon.
  const weekdayIso = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const weekday = weekdayIso === 0 ? 7 : weekdayIso
  return { year, month, day, hour, minute, weekday, dateKey }
}

const DAY_MS = 24 * 3_600_000

export const daysBetween = (from: Date, to: Date): number =>
  Math.floor((to.getTime() - from.getTime()) / DAY_MS)

/** ISO-veckonyckel i svensk tid, t.ex. '2026-W07'. Stabil per vecka. */
export function isoWeekKey(now: Date): string {
  const { year, month, day } = stockholmParts(now)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayNum = (date.getUTCDay() + 6) % 7 // mån=0
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // torsdag i samma vecka
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Månadsnyckel för föregående månad (svensk tid), t.ex. '2026-07'. */
export function previousMonthKey(now: Date): string {
  const { year, month } = stockholmParts(now)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
}

/** Tysta timmar för SMS: 21:00–08:00 svensk tid. */
export function isSmsQuietHours(now: Date): boolean {
  const { hour } = stockholmParts(now)
  return hour >= RETENTION_CONFIG.smsQuietStartHour || hour < RETENTION_CONFIG.smsQuietEndHour
}

/**
 * Nästa tillåtna sändningstid för kanalen. SMS under tysta timmar skjuts till
 * 08:00; e-post påverkas inte. Returnerar null om sändning får ske direkt.
 */
export function deferForQuietHours(now: Date, channel: 'email' | 'sms'): Date | null {
  if (channel !== 'sms' || !isSmsQuietHours(now)) return null
  const { hour, minute } = stockholmParts(now)
  const minutesUntilEight =
    hour >= RETENTION_CONFIG.smsQuietStartHour
      ? (24 - hour + RETENTION_CONFIG.smsQuietEndHour) * 60 - minute
      : (RETENTION_CONFIG.smsQuietEndHour - hour) * 60 - minute
  return new Date(now.getTime() + minutesUntilEight * 60_000)
}

// ---------------------------------------------------------------------------
// Livscykel & dormancy (mission 1)
// ---------------------------------------------------------------------------

export interface WorkshopActivityInput {
  approved: boolean
  createdAt: Date // workshops.created_at (≈ registrering/godkännandebas)
  lastQuoteAt: Date | null // senaste workshop_responses (status sent/won/lost)
  now: Date
}

export type LifecycleStage = 'new' | 'active' | 'lapsing' | 'dormant'

/**
 * Livscykelsteg för en godkänd verkstad baserat på offeraktivitet.
 * Ej godkänd → 'new' (onboarding ägs av S2, vi rör den inte).
 */
export function computeLifecycleStage(input: WorkshopActivityInput): LifecycleStage {
  if (!input.approved) return 'new'
  const reference = input.lastQuoteAt ?? input.createdAt
  const idleDays = daysBetween(reference, input.now)
  if (idleDays >= RETENTION_CONFIG.dormantAfterDays) return 'dormant'
  if (idleDays >= RETENTION_CONFIG.lapsingAfterDays) return 'lapsing'
  return 'active'
}

export const isDormant = (input: WorkshopActivityInput): boolean =>
  computeLifecycleStage(input) === 'dormant'

/**
 * Schemalägg återaktiveringssekvensen (max 3 steg). Sekvensen ankars vid
 * max(dormantSince, now): upptäcks dormancyn sent (t.ex. efter att flaggan
 * slagits på) behålls mellanrummen 0/7/21 dagar framåt i stället för att alla
 * tre mejlen ska falla ut samma dag.
 */
export function reactivationSchedule(dormantSince: Date, now: Date): Array<{ step: number; sendAt: Date }> {
  const anchor = new Date(Math.max(dormantSince.getTime(), now.getTime()))
  return RETENTION_CONFIG.reactivationStepDays.map((offset, index) => ({
    step: index + 1,
    sendAt: new Date(anchor.getTime() + offset * DAY_MS),
  }))
}

/** Stabilt cykel-id för en dormant-period → ny cykel tillåter ny sekvens. */
export function dormancyCycleKey(lastQuoteAt: Date | null, fallback: Date): string {
  return (lastQuoteAt ?? fallback).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Veckodigest (mission 2) — skip-empty
// ---------------------------------------------------------------------------

export interface DigestRequestItem {
  id: string
  repair_category: string
  bike_type: string
  area: string | null
  created_at: string
}

export interface DigestSummary {
  total: number
  categories: Array<{ category: string; count: number }>
}

/** Skip-empty: digest skapas bara när det finns relevant efterfrågan. */
export const shouldSendDigest = (items: readonly DigestRequestItem[]): boolean => items.length > 0

export function summarizeDigest(items: readonly DigestRequestItem[]): DigestSummary {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.repair_category, (counts.get(item.repair_category) ?? 0) + 1)
  }
  const categories = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, 'sv'))
  return { total: items.length, categories }
}

/** Är idag digest-dagen (måndag svensk tid)? */
export function isDigestDay(now: Date): boolean {
  return stockholmParts(now).weekday === RETENTION_CONFIG.digestWeekday
}

// ---------------------------------------------------------------------------
// Säsong (mission 3) — vår-reaktivering feb/mars
// ---------------------------------------------------------------------------

export const isSeasonalWindow = (now: Date): boolean =>
  RETENTION_CONFIG.seasonalMonths.includes(stockholmParts(now).month)

/**
 * Målgrupp: verkstäder som var aktiva förra säsongen (minst en offert under
 * förra årets mars–oktober) men som är inaktiva nu.
 */
export function isSeasonalTarget(lastQuoteAt: Date | null, now: Date): boolean {
  if (!lastQuoteAt || !isSeasonalWindow(now)) return false
  const { year } = stockholmParts(now)
  const seasonStart = new Date(Date.UTC(year - 1, 2, 1)) // 1 mars förra året
  const seasonEnd = new Date(Date.UTC(year - 1, 10, 1)) // 1 november förra året
  if (lastQuoteAt < seasonStart || lastQuoteAt >= seasonEnd) return false
  return daysBetween(lastQuoteAt, now) >= RETENTION_CONFIG.lapsingAfterDays
}

export const seasonalKey = (now: Date): string => `spring-${stockholmParts(now).year}`

// ---------------------------------------------------------------------------
// Månadssammanfattning (mission 4)
// ---------------------------------------------------------------------------

export const isPerformanceDay = (now: Date): boolean =>
  stockholmParts(now).day === RETENTION_CONFIG.performanceMonthDay

export interface PerformanceStats {
  quotesSent: number
  wins: number
  revenueSek: number | null // null = ingen bekräftad outcome-data → utelämna ur mejlet
  avgRating: number | null
  publishedReviewCount: number
}

/** Skip-empty även här: ingen aktivitet under månaden → inget mejl. */
export function shouldSendPerformanceSummary(stats: PerformanceStats): boolean {
  return stats.quotesSent > 0 || stats.wins > 0
}

// ---------------------------------------------------------------------------
// Profilkompletthet (mission 5) — delas med frontend-indikatorn
// ---------------------------------------------------------------------------

export interface ProfileCompletenessInput {
  bio_short?: string | null
  description?: string | null
  logo_url?: string | null
  areas_served?: readonly string[] | null
  services?: readonly string[] | null
  website?: string | null
}

export interface ProfileCompleteness {
  percent: number // 0–100
  missing: string[] // svenska etiketter för det som saknas
}

const hasText = (value: string | null | undefined, minLength = 1): boolean =>
  Boolean(value && value.trim().length >= minLength)

export function computeProfileCompleteness(profile: ProfileCompletenessInput): ProfileCompleteness {
  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: hasText(profile.bio_short, 20) || hasText(profile.description, 40), label: 'Kort presentation' },
    { ok: hasText(profile.logo_url), label: 'Logotyp' },
    { ok: (profile.areas_served?.length ?? 0) > 0, label: 'Serviceområden' },
    { ok: (profile.services?.length ?? 0) > 0, label: 'Tjänster' },
    { ok: hasText(profile.website), label: 'Webbplats' },
  ]
  const missing = checks.filter((c) => !c.ok).map((c) => c.label)
  const percent = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { percent, missing }
}

/** Knuff bara när profilen faktiskt är ofullständig. */
export const shouldSendProfileNudge = (completeness: ProfileCompleteness): boolean =>
  completeness.missing.length > 0

// ---------------------------------------------------------------------------
// Frekvenstak, suppression & dedupe (I4)
// ---------------------------------------------------------------------------

export const underFrequencyCap = (
  sentLast7d: number,
  cap: number = RETENTION_CONFIG.maxMessagesPerContactPer7d,
): boolean => sentLast7d < cap

export interface SuppressionInput {
  unsubscribedAt: string | null
  consentBasis: 'transactional' | 'legitimate_interest' | 'marketing_consent'
}

/** Avregistrerade kontakter undertrycks alltid utom transaktionella mejl. */
export function isSuppressed(contact: SuppressionInput): boolean {
  return contact.unsubscribedAt !== null && contact.consentBasis !== 'transactional'
}

/** Stabila dedupe-nycklar → cron-retry kan aldrig dubbel-skicka. */
export const retentionDedupeKeys = {
  reactivation: (workshopId: string, cycleKey: string, step: number) =>
    `v2ret:reactivation:${workshopId}:${cycleKey}:s${step}`,
  digest: (workshopId: string, weekKey: string) => `v2ret:digest:${workshopId}:${weekKey}`,
  seasonal: (workshopId: string, season: string) => `v2ret:seasonal:${workshopId}:${season}`,
  performance: (workshopId: string, monthKey: string) => `v2ret:perf:${workshopId}:${monthKey}`,
  profileNudge: (workshopId: string, ordinal: number) => `v2ret:profile:${workshopId}:n${ordinal}`,
  reviewNotification: (reviewId: string) => `v2ret:notify:review:${reviewId}`,
  outcomeNotification: (outcomeId: string, state: string) => `v2ret:notify:outcome:${outcomeId}:${state}`,
} as const
