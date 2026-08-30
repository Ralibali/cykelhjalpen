// V2 S8 retention — ENHETLIG ren logik för kund-loopen + verkstads-cadences.
// Kontrakt: docs/v2/CONTRACTS.md §2.7, §3.7, §5 (masterflagga v2.retention.lifecycle).
//
// Modulen är BEROENDEFRI (inga imports) så att den kan testas via vitest
// (samma mönster som _shared/v2/config-schema.ts ↔ src/lib/v2/contracts.test.ts).
// All DB-/nätverkslogik ligger i edge-funktionerna; här finns bara beslutsregler.
//
// Sammanslagning (merge v2/customer-retention + v2/workshop-retention):
//  - Del 1: kundens underhållspåminnelser (säsongsloop, consent-gating, tysta timmar).
//  - Del 2: verkstadens 6 cadences (dormant-reaktivering, digest, säsong,
//    månadssammanfattning, profilknuff, notifikationer).
// Kundsidans tidsdelar-typ heter CustomerLocalParts (kolliderade med verkstadens
// LocalParts). RETENTION_LIFECYCLE_FLAG och RETENTION_MASTER_FLAG är samma flagga.
// Mejlmallarna för verkstad ligger separat i retention-templates.ts.

// ===========================================================================
// DEL 1 — KUND: underhållspåminnelser efter avslutad service
// Spam-regler (missionens hårda krav):
//  - Endast kontakter med consent_basis='marketing_consent' och utan
//    unsubscribed_at får säsongspåminnelser.
//  - Ett utskick + max EN uppföljning per säsong och kontakt (dedupe-nycklar).
//  - Frekvenstak: minst 30 dagar mellan utskick till samma kontakt.
//  - Tysta timmar: inga utskick 21:00–08:00 (Europe/Stockholm).
// ===========================================================================

export const RETENTION_LIFECYCLE_FLAG = 'v2.retention.lifecycle'
export const RETENTION_TIMEZONE = 'Europe/Stockholm'

/** Tysta timmar: [21:00, 08:00) lokal tid. */
export const QUIET_START_HOUR = 21
export const QUIET_END_HOUR = 8

/** Minsta mellanrum mellan två retention-utskick till samma kontakt. */
export const MIN_CONTACT_GAP_MS = 30 * 24 * 60 * 60 * 1000

/** Vårfönstret för säsongspåminnelser: 15 feb – 31 maj (lokal tid). */
export const SEASON_START_MONTH = 2 // februari (1-indexerat)
export const SEASON_START_DAY = 15
export const SEASON_END_MONTH = 5 // maj
export const SEASON_END_DAY = 31

export type RetentionMessageKind =
  | 'seasonal_reminder'
  | 'reactivation'
  | 'review_request'
  | 'win_back'
  | 'onboarding_nudge'

export interface RetentionContactState {
  consent_basis: 'transactional' | 'legitimate_interest' | 'marketing_consent'
  unsubscribed_at: string | null
  last_contacted_at: string | null
}

export interface MaintenanceReminderRule {
  repair_category: string
  kind: RetentionMessageKind
  remind_after_months: number
  followup_days: number
  enabled: boolean
}

// ---------------------------------------------------------------------------
// Tid (allt i Europe/Stockholm — kunderna är svenska)
// ---------------------------------------------------------------------------

const dtf = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: RETENTION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

export interface CustomerLocalParts { year: number; month: number; day: number; hour: number; minute: number }

export function stockholmLocalParts(at: Date): CustomerLocalParts {
  const parts: CustomerLocalParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0 }
  for (const part of dtf().formatToParts(at)) {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day' || part.type === 'hour' || part.type === 'minute') {
      parts[part.type] = Number(part.value)
    }
  }
  if (parts.hour === 24) parts.hour = 0
  return parts
}

export function isQuietHours(at: Date): boolean {
  const { hour } = stockholmLocalParts(at)
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR
}

/**
 * Nästa tidpunkt utanför tysta timmar. Tyst tid skjuts till 08:00 lokal tid
 * (samma dag om klockan är före 08, annars nästa dygn).
 */
export function nextAllowedSendTime(at: Date): Date {
  if (!isQuietHours(at)) return at
  const local = stockholmLocalParts(at)
  // Bygg 08:00 lokal tid: offsetGuessMs är lokal tid minus UTC vid samma
  // klockslag, så lokal 08:00 = UTC(08:00) + offset.
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, 8, 0, 0)
  const offsetGuessMs = at.getTime() - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0)
  const targetUtc = asUtc + offsetGuessMs
  let candidate = new Date(targetUtc)
  if (local.hour >= QUIET_START_HOUR) candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000)
  // Kompensera ev. DST-glapp (±1h) genom att verifiera mot lokal tid.
  const check = stockholmLocalParts(candidate)
  if (check.hour !== QUIET_END_HOUR) {
    candidate = new Date(candidate.getTime() + (QUIET_END_HOUR - check.hour) * 60 * 60 * 1000)
  }
  return candidate
}

export function addMonthsUtc(at: Date, months: number): Date {
  const copy = new Date(at.getTime())
  copy.setUTCMonth(copy.getUTCMonth() + months)
  return copy
}

// ---------------------------------------------------------------------------
// Säsongsfönster + schemaläggning
// ---------------------------------------------------------------------------

/** Fönsterstart som Date (07:00 UTC ≈ 08:00 lokal tid; tysta timmar gäller ändå). */
export function seasonWindowStartUtc(year: number): Date {
  return new Date(Date.UTC(year, SEASON_START_MONTH - 1, SEASON_START_DAY, 7, 0, 0))
}

export function seasonWindowEndUtc(year: number): Date {
  return new Date(Date.UTC(year, SEASON_END_MONTH - 1, SEASON_END_DAY, 20, 59, 59))
}

export function isInSeasonWindow(at: Date): boolean {
  const { year, month, day } = stockholmLocalParts(at)
  const afterStart = month > SEASON_START_MONTH || (month === SEASON_START_MONTH && day >= SEASON_START_DAY)
  const beforeEnd = month < SEASON_END_MONTH || (month === SEASON_END_MONTH && day <= SEASON_END_DAY)
  return afterStart && beforeEnd && year > 2000
}

export interface ReminderPlan {
  kind: RetentionMessageKind
  /** Första utskicket. */
  scheduled_for: Date
  /** Säsongens år — används i dedupe-nyckeln så en kontakt får max ett mail per säsong. */
  season_year: number
  /** Uppföljning (max 1) eller null om regeln saknar followup_days. */
  followup_for: Date | null
}

/**
 * När ska ett avslutat jobb ge en säsongspåminnelse?
 * Regeln: första vårfönstret där jobbet nått regelns minimiålder.
 * Jobb klara för sent på hösten påminns alltså först våren efter nästa år.
 * Returnerar null om jobbet är för färskt OCH fönstret redan passerats
 * (cron schemalägger aldrig i det förflutna — ingen backlog-spam).
 */
export function planReminderForJob(
  completedAt: Date,
  rule: MaintenanceReminderRule,
  now: Date,
): ReminderPlan | null {
  if (!rule.enabled) return null
  const earliest = addMonthsUtc(completedAt, rule.remind_after_months)
  const earliestYear = Number(earliest.toISOString().slice(0, 4))

  let seasonYear = earliestYear
  let scheduled = seasonWindowStartUtc(seasonYear)
  if (earliest > seasonWindowEndUtc(seasonYear)) {
    seasonYear += 1
    scheduled = seasonWindowStartUtc(seasonYear)
  } else if (earliest > scheduled) {
    scheduled = earliest
  }

  // Schemalägg aldrig ett fönster som redan passerat — då var jobbet för gammalt
  // när loopen startade (anti-backlog; gate G-T1 kräver kontrollerad start).
  if (seasonWindowEndUtc(seasonYear) < now) return null

  const followup = rule.followup_days > 0
    ? new Date(scheduled.getTime() + rule.followup_days * 24 * 60 * 60 * 1000)
    : null

  return { kind: rule.kind, scheduled_for: scheduled, season_year: seasonYear, followup_for: followup }
}

/** Exakt kategori-match annars '*'-fallback. Endast aktiva regler. */
export function ruleForCategory(
  rules: MaintenanceReminderRule[],
  category: string,
): MaintenanceReminderRule | null {
  const enabled = rules.filter((rule) => rule.enabled)
  return enabled.find((rule) => rule.repair_category === category)
    ?? enabled.find((rule) => rule.repair_category === '*')
    ?? null
}

/**
 * Dedupe-nycklar. Säsongspåminnelsen nycklas per KONTAKT + säsong (inte per
 * jobb): en kontakt med flera gamla jobb får ändå bara ett mail per vår.
 */
export function reminderDedupeKey(
  contactId: string,
  kind: RetentionMessageKind,
  seasonYear: number,
  followup = false,
): string {
  return `v2:${kind}:${contactId}:${seasonYear}${followup ? ':followup' : ''}`
}

// ---------------------------------------------------------------------------
// Beslut vid utskick (consent, frekvenstak, tysta timmar, avregistrering)
// ---------------------------------------------------------------------------

export type SendDisposition =
  | { action: 'send' }
  | { action: 'suppress'; reason: 'unsubscribed' | 'no_marketing_consent' }
  | { action: 'skip'; reason: 'cadence_cap' | 'newer_request_exists' }
  | { action: 'reschedule'; at: Date }

/**
 * Enda stället som avgör om ett schemalagt meddelande får skickas.
 * Hård regel (kontrakt §2.7): avregistrerad kontakt med icke-transactionell
 * basis => status 'suppressed', aldrig skickat.
 */
export function messageDisposition(
  contact: RetentionContactState,
  message: { kind: RetentionMessageKind; channel: string; scheduled_for: Date; is_followup?: boolean },
  now: Date,
  opts: { newerRequestSince?: Date | null } = {},
): SendDisposition {
  if (contact.unsubscribed_at && contact.consent_basis !== 'transactional') {
    return { action: 'suppress', reason: 'unsubscribed' }
  }
  // Säsongspåminnelser kräver aktivt marknadssamtycke (opt-in).
  if (message.kind === 'seasonal_reminder' && contact.consent_basis !== 'marketing_consent') {
    return { action: 'suppress', reason: 'no_marketing_consent' }
  }
  if (contact.last_contacted_at && !message.is_followup) {
    // Frekvenstaket gäller NYA beröringspunkter. En uppföljning är en del av
    // samma säsongskadens (1 mail + max 1 uppföljning) och får gå ut även om
    // originalet skickades för < 30 dagar sedan.
    const last = new Date(contact.last_contacted_at).getTime()
    if (now.getTime() - last < MIN_CONTACT_GAP_MS) {
      return { action: 'skip', reason: 'cadence_cap' }
    }
  }
  // Uppföljningen ställs in om kunden själv hunnit lägga ett nytt ärende.
  if (message.is_followup && opts.newerRequestSince) {
    return { action: 'skip', reason: 'newer_request_exists' }
  }
  if (isQuietHours(now)) {
    return { action: 'reschedule', at: nextAllowedSendTime(now) }
  }
  return { action: 'send' }
}

// ---------------------------------------------------------------------------
// Länkar + mejlmallar (svensk ton, samma stil som submit-bike-request)
// ---------------------------------------------------------------------------

export const PUBLIC_ORIGIN = 'https://cykelhjalpen.se'

/**
 * Förifylld wizard-länk. Parametrarna matchar BikeRequestWizard:
 * ?stad=<slug>&cykel=<prefix>&problem=<prefix> (prefix-matchning i matchParam).
 */
export function buildPrefillWizardUrl(args: {
  citySlug?: string | null
  bikeType?: string | null
  repairCategory?: string | null
  origin?: string
}): string {
  const origin = args.origin ?? PUBLIC_ORIGIN
  const params = new URLSearchParams()
  if (args.citySlug) params.set('stad', args.citySlug)
  if (args.bikeType) params.set('cykel', args.bikeType)
  if (args.repairCategory) params.set('problem', args.repairCategory)
  const query = params.toString()
  return `${origin}/skicka-arende${query ? `?${query}` : ''}`
}

export function buildUnsubscribeUrl(unsubscribeToken: string, origin = PUBLIC_ORIGIN): string {
  return `${origin}/avsluta-paminnelser/${encodeURIComponent(unsubscribeToken)}`
}

export function buildTokenPageUrl(viewToken: string, origin = PUBLIC_ORIGIN): string {
  return `${origin}/mitt-arende/${encodeURIComponent(viewToken)}`
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export interface SeasonalEmailArgs {
  customerName: string
  city: string
  bikeType: string
  repairCategory: string
  /** Förifylld länk till nytt ärende (vårservice). */
  prefillUrl: string
  /** Länk till kundens token-sida (servicehistorik). */
  tokenUrl: string
  /** Avregistreringslänk — ALLTID med, kontraktets hårda regel. */
  unsubscribeUrl: string
  followup?: boolean
}

export function buildSeasonalReminderEmail(args: SeasonalEmailArgs): { subject: string; html: string } {
  const name = escapeHtml(args.customerName)
  const subject = args.followup
    ? 'Dags att boka vårservice för cykeln?'
    : 'Dags för vårservice – verkstäderna i din stad är redo'

  const intro = args.followup
    ? `<p>Hej ${name}!</p>
       <p>Vi påminde dig nyligen om vårservice. Om cykeln fortfarande inte är genomgången är det inte för sent – det här är vår sista påminnelse för i år.</p>`
    : `<p>Hej ${name}!</p>
       <p>Våren är här och det är dags att få cykeln i form. Förra gången fick du hjälp med <strong>${escapeHtml(args.repairCategory)}</strong> för din ${escapeHtml(args.bikeType)} i <strong>${escapeHtml(args.city)}</strong> – en årlig genomgång håller cykeln säker och rullande längre.</p>`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 16px">${args.followup ? 'Sista chansen för vårservice' : 'Dags för vårservice'}</h2>
      ${intro}
      <p>Lägg upp ett nytt ärende på en minut – vi har fyllt i det mesta åt dig. Du får prisförslag från granskade verkstäder i ${escapeHtml(args.city)} och väljer själv om du vill gå vidare. Det kostar ingenting.</p>
      <p style="margin-top:24px">
        <a href="${args.prefillUrl}" style="display:inline-block;background:#157A6E;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">
          Boka vårservice
        </a>
      </p>
      <p style="margin-top:16px">
        <a href="${args.tokenUrl}" style="color:#157A6E">Se dina tidigare ärenden</a>
      </p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        Du får det här mejlet för att du valt att få servicepåminnelser från Cykelhjälpen.
        <a href="${args.unsubscribeUrl}" style="color:#666">Avregistrera dig här</a> – då skickar vi inga fler påminnelser.
      </p>
    </div>`

  return { subject, html }
}


// ===========================================================================
// DEL 2 — VERKSTAD: retention-cadences (kontrakt §2.7, §3.7, §5, §8 / I4, I7)
// Alla cadences ligger bakom huvudflaggan v2.retention.lifecycle + en egen
// underflagga (alla seedade OFF i 20260901_v2_workshop_retention.sql).
// Tiderna är svensk lokal tid (Europe/Stockholm) och alla dedupe-nycklar är
// stabila så att cron-retrier aldrig dubbel-skickar (I4).
// ===========================================================================

export const RETENTION_MASTER_FLAG = RETENTION_LIFECYCLE_FLAG

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
