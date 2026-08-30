// V2 S8 retention — ren logik för kund-loopen efter avslutad service.
// Kontrakt: docs/v2/CONTRACTS.md §2.7, §3.7, §5 (flagga v2.retention.lifecycle).
//
// Modulen är BEROENDEFRI (inga imports) så att den kan testas via vitest
// (samma mönster som _shared/v2/config-schema.ts ↔ src/lib/v2/contracts.test.ts).
// All DB-/nätverkslogik ligger i edge-funktionerna; här finns bara beslutsregler.
//
// Spam-regler (missionens hårda krav):
//  - Endast kontakter med consent_basis='marketing_consent' och utan
//    unsubscribed_at får säsongspåminnelser.
//  - Ett utskick + max EN uppföljning per säsong och kontakt (dedupe-nycklar).
//  - Frekvenstak: minst 30 dagar mellan utskick till samma kontakt.
//  - Tysta timmar: inga utskick 21:00–08:00 (Europe/Stockholm).

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

export interface LocalParts { year: number; month: number; day: number; hour: number; minute: number }

export function stockholmLocalParts(at: Date): LocalParts {
  const parts: LocalParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0 }
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
