// V2 lifecycle automation — PURE decision logic (contract: docs/v2/CONTRACTS.md §3.2).
//
// No imports, no I/O: vitest (src/lib/v2/lifecycle.test.ts) imports this file
// directly and the Deno edge functions (v2-zero-quote-rescue,
// v2-winner-reminders, v2-stalled-winner-recovery, v2-reselect-winner) use the
// same functions, so the cadence math has exactly one source of truth.
//
// Cadences (contract §3.2):
//   zero-quote rescue : 0 quotes at 24h → auto_nudge; 0 at 72h → extend_window
//                       + founder_backstop; still 0 at close → repost_invite
//   winner reminders  : won + unpaid → email +2h, email+SMS +24h, stalled +48h
//   stalled recovery  : stalled ≥72h → awaiting_reselection
// Quiet hours / frequency caps: SMS 21:00–08:00 Europe/Stockholm is deferred;
// onboarding nudges are capped at one per 72 h per workshop.

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

export const ZERO_QUOTE_NUDGE_HOURS = 24
export const ZERO_QUOTE_EXTEND_HOURS = 72
/** V1 response window (close-stale-bike-requests): 5 days. */
export const RESPONSE_WINDOW_HOURS = 120
/** Extended window after an executed extend_window rescue action: 7 days. */
export const EXTENDED_RESPONSE_WINDOW_HOURS = 168

export const WINNER_REMINDER_FIRST_HOURS = 2
export const WINNER_REMINDER_SECOND_HOURS = 24
export const WINNER_STALLED_HOURS = 48
export const STALLED_RECOVERY_HOURS = 72

export const SMS_QUIET_FROM_HOUR = 21 // 21:00 Stockholm
export const SMS_QUIET_TO_HOUR = 8 //   08:00 Stockholm

export const ONBOARDING_NUDGE_MIN_HOURS = 72
export const ACTIVATION_QUOTES_30D = 3
export const DORMANT_AFTER_DAYS = 30

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/**
 * Återpublicerings-CTA. /cykelreparation var en soft-404 (A8) — den riktiga
 * live-routen är /skicka-arende, med ?stad= när slug är känd.
 */
export const buildRepostUrl = (citySlug?: string | null): string =>
  `https://cykelhjalpen.se/skicka-arende${citySlug ? `?stad=${encodeURIComponent(citySlug)}` : ''}`

// ---------------------------------------------------------------------------
// Zero-quote rescue
// ---------------------------------------------------------------------------

export type ZeroQuoteActionType = 'auto_nudge' | 'extend_window'

/**
 * Vilken räddningsåtgärd som är due för ett ärende med noll offerter.
 * Returnerar null om ärendet har offerter eller är för ungt.
 */
export function zeroQuoteActionDue(
  ageHours: number,
  quoteCount: number,
): ZeroQuoteActionType | null {
  if (quoteCount > 0) return null
  if (ageHours >= ZERO_QUOTE_EXTEND_HOURS) return 'extend_window'
  if (ageHours >= ZERO_QUOTE_NUDGE_HOURS) return 'auto_nudge'
  return null
}

/**
 * Ska close-stale-bike-requests stänga ärendet nu? En utförd extend_window-
 * åtgärd flyttar fönstret från 5 till 7 dygn (contract §3.2, "extend window
 * where configured" — konfigurationen är rescue-action-raden).
 */
export function shouldCloseRequest(
  ageHours: number,
  hasExecutedWindowExtension: boolean,
): boolean {
  const windowHours = hasExecutedWindowExtension
    ? EXTENDED_RESPONSE_WINDOW_HOURS
    : RESPONSE_WINDOW_HOURS
  return ageHours >= windowHours
}

/**
 * Matchar en verkstad mot ett ärendes stad. Exakt stad alltid; areas/cluster
 * bara när S1:s matchning är flaggad på (v2.liquidity.areas_served_matching)
 * och verkstaden själv valt läget (contract §2.2).
 */
export function workshopMatchesRequestCity(
  workshop: {
    city: string | null
    service_area_mode?: string | null
    cluster_opt_in?: boolean | null
    areas_served?: string[] | null
  },
  requestCityName: string,
  clusterCityNames: string[],
  expandedMatchingEnabled: boolean,
): boolean {
  if (workshop.city === requestCityName) return true
  if (!expandedMatchingEnabled) return false
  if (workshop.service_area_mode === 'areas') {
    return (workshop.areas_served ?? []).includes(requestCityName)
  }
  if (workshop.service_area_mode === 'cluster' && workshop.cluster_opt_in === true) {
    return workshop.city != null && clusterCityNames.includes(workshop.city)
  }
  return false
}

// ---------------------------------------------------------------------------
// Winner activation reminders + stall detection
// ---------------------------------------------------------------------------

export type WinnerReminderStage = '2h' | '24h'

export interface WinnerAction {
  /** Senaste due-men-ej-skickade påminnelsesteg, eller null. När '24h'
   *  returneras ska anroparen även spärra 2h-nyckeln (superseded) så att
   *  det tidigare steget aldrig skickas i efterhand. */
  send: WinnerReminderStage | null
  /** true när vinsten varit obetald ≥ 48 h → markera stalled_at + event. */
  markStalled: boolean
}

/**
 * Beslut per obetald vinst. `sent2h`/`sent24h` kommer från v2_nudge_log
 * (dedupe-nycklar winner_payment:{response_id}:2h / :24h) så retries och
 * dubbla cron-körningar aldrig skickar samma steg två gånger. Båda stegen
 * due samtidigt → bara det senare (starkare) mejlet skickas.
 */
export function decideWinnerAction(
  wonAgeHours: number,
  sent2h: boolean,
  sent24h: boolean,
): WinnerAction {
  const markStalled = wonAgeHours >= WINNER_STALLED_HOURS
  let send: WinnerReminderStage | null = null
  if (wonAgeHours >= WINNER_REMINDER_FIRST_HOURS && !sent2h) send = '2h'
  if (wonAgeHours >= WINNER_REMINDER_SECOND_HOURS && !sent24h) send = '24h'
  return { send, markStalled }
}

/** Stalled vinnare blir klar för kundens omval efter 72 h (contract §3.2). */
export function isStalledRecoveryDue(stalledAtMs: number, nowMs: number): boolean {
  return nowMs - stalledAtMs >= STALLED_RECOVERY_HOURS * HOUR_MS
}

// ---------------------------------------------------------------------------
// Quiet hours (SMS) + frequency caps
// ---------------------------------------------------------------------------

const stockholmHour = (now: Date): number => {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '12')
  return Number.isFinite(hour) ? hour % 24 : 12
}

/** true när SMS inte får skickas (21:00–08:00 svensk tid). */
export function smsQuietHoursActive(now: Date = new Date()): boolean {
  const hour = stockholmHour(now)
  return hour >= SMS_QUIET_FROM_HOUR || hour < SMS_QUIET_TO_HOUR
}

/** YYYYMMDD i Europe/Stockholm — för dygnsbaserade dedupe-nycklar. */
export function stockholmDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}${get('month')}${get('day')}`
}

/** Frekvenstak: minst `minHours` mellan automatiska nudges till samma verkstad. */
export function nudgeCapReached(
  lastNudgeAt: string | null | undefined,
  now: Date = new Date(),
  minHours: number = ONBOARDING_NUDGE_MIN_HOURS,
): boolean {
  if (!lastNudgeAt) return false
  const lastMs = new Date(lastNudgeAt).getTime()
  if (!Number.isFinite(lastMs)) return false
  return now.getTime() - lastMs < minHours * HOUR_MS
}

// ---------------------------------------------------------------------------
// Workshop onboarding lifecycle (contract §2.2 v2_workshop_onboarding)
// ---------------------------------------------------------------------------

export type OnboardingState =
  | 'registered'
  | 'approved'
  | 'first_quote_sent'
  | 'first_win'
  | 'activated'
  | 'dormant'
  | 'churned'

export interface OnboardingFacts {
  approved: boolean
  quotesTotal: number
  quotes30d: number
  winsTotal: number
}

/**
 * Ren tillståndsmaskin. activated = ≥3 offerter senaste 30 d; dormant =
 * 0 offerter på 30 d efter aktivering. 'churned' är manuellt och klistrar.
 */
export function resolveOnboardingState(
  current: OnboardingState,
  facts: OnboardingFacts,
): OnboardingState {
  if (current === 'churned') return 'churned'
  if (!facts.approved) return 'registered'

  const progressed: OnboardingState = facts.winsTotal > 0
    ? 'first_win'
    : facts.quotesTotal > 0
      ? 'first_quote_sent'
      : 'approved'

  if (facts.quotes30d >= ACTIVATION_QUOTES_30D) return 'activated'

  // Dormant kan bara nås från activated: aktiverad verkstad som slutat
  // offerera helt i 30 dagar. Kommer en offert in går verkstaden tillbaka
  // till sin progressionsnivå (eller activated vid ≥3/30d, hanterat ovan).
  if ((current === 'activated' || current === 'dormant') && facts.quotes30d === 0) {
    return 'dormant'
  }
  return progressed
}

/** Vilken nudge-typ en verkstad är kandidat för, om någon. */
export function onboardingNudgeKind(
  state: OnboardingState,
): 'onboarding' | 'dormant_workshop' | null {
  if (state === 'approved') return 'onboarding' // godkänd men aldrig offererat
  if (state === 'dormant') return 'dormant_workshop'
  return null
}

// ---------------------------------------------------------------------------
// Idempotency keys (contract §2.2 v2_nudge_log + I4)
// ---------------------------------------------------------------------------

export const zeroQuoteNudgeKey = (requestId: string, workshopId: string, stage: '24h' | '72h') =>
  `zero_quote:${requestId}:${stage}:${workshopId}`

export const winnerPaymentKey = (responseId: string, stage: WinnerReminderStage) =>
  `winner_payment:${responseId}:${stage}`

export const reselectionInviteKey = (requestId: string, reselectionCount: number) =>
  `reselection_invite:${requestId}:${reselectionCount}`

export const onboardingNudgeKey = (workshopId: string, kind: string, dateKey: string) =>
  `onboarding:${kind}:${workshopId}:${dateKey}`

export const customerZeroQuoteKey = (requestId: string, stage: '72h' | 'close') =>
  `zero_quote_customer:${requestId}:${stage}`
