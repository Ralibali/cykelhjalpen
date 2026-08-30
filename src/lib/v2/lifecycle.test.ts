// Tester för S2:s rena livscykellogik — samma modul som edge-funktionerna
// kör (supabase/functions/_shared/v2/lifecycle.ts), så kadensbesluten som
// testas här är exakt de som körs i produktion.
import { describe, expect, it } from 'vitest'

import {
  ACTIVATION_QUOTES_30D,
  buildRepostUrl,
  customerZeroQuoteKey,
  decideWinnerAction,
  EXTENDED_RESPONSE_WINDOW_HOURS,
  isStalledRecoveryDue,
  nudgeCapReached,
  onboardingNudgeKey,
  onboardingNudgeKind,
  reselectionInviteKey,
  resolveOnboardingState,
  shouldCloseRequest,
  smsQuietHoursActive,
  stockholmDateKey,
  winnerPaymentKey,
  workshopMatchesRequestCity,
  zeroQuoteActionDue,
  zeroQuoteNudgeKey,
  HOUR_MS,
} from '../../../supabase/functions/_shared/v2/lifecycle'

// ---------------------------------------------------------------------------
// buildRepostUrl — A8-fix: aldrig /cykelreparation (soft-404)
// ---------------------------------------------------------------------------
describe('buildRepostUrl', () => {
  it('pekar på /skicka-arende utan stad', () => {
    expect(buildRepostUrl(null)).toBe('https://cykelhjalpen.se/skicka-arende')
    expect(buildRepostUrl(undefined)).toBe('https://cykelhjalpen.se/skicka-arende')
  })

  it('förfyller staden när slug är känd', () => {
    expect(buildRepostUrl('linkoping')).toBe('https://cykelhjalpen.se/skicka-arende?stad=linkoping')
  })

  it('innehåller aldrig den trasiga routen', () => {
    expect(buildRepostUrl('norrkoping')).not.toContain('/cykelreparation')
  })
})

// ---------------------------------------------------------------------------
// Zero-quote rescue-kadens (24h auto_nudge, 72h extend_window)
// ---------------------------------------------------------------------------
describe('zeroQuoteActionDue', () => {
  it('gör inget före 24 h', () => {
    expect(zeroQuoteActionDue(23.9, 0)).toBeNull()
  })

  it('auto_nudge vid 24 h utan offerter', () => {
    expect(zeroQuoteActionDue(24, 0)).toBe('auto_nudge')
    expect(zeroQuoteActionDue(71.9, 0)).toBe('auto_nudge')
  })

  it('extend_window vid 72 h utan offerter', () => {
    expect(zeroQuoteActionDue(72, 0)).toBe('extend_window')
    expect(zeroQuoteActionDue(200, 0)).toBe('extend_window')
  })

  it('gör inget så fort en offert finns', () => {
    expect(zeroQuoteActionDue(100, 1)).toBeNull()
  })
})

describe('shouldCloseRequest', () => {
  it('stänger vid 5 dygn utan förlängning', () => {
    expect(shouldCloseRequest(119.9, false)).toBe(false)
    expect(shouldCloseRequest(120, false)).toBe(true)
  })

  it('förlängt fönstret till 7 dygn efter extend_window', () => {
    expect(shouldCloseRequest(140, true)).toBe(false)
    expect(shouldCloseRequest(EXTENDED_RESPONSE_WINDOW_HOURS, true)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Utökad eligibility (areas/cluster) — kräver flagga + verkstadens opt-in
// ---------------------------------------------------------------------------
describe('workshopMatchesRequestCity', () => {
  const base = { city: 'Norrköping', service_area_mode: 'city', cluster_opt_in: false, areas_served: [] }

  it('exakt stad matchar alltid', () => {
    expect(workshopMatchesRequestCity({ ...base, city: 'Linköping' }, 'Linköping', [], false)).toBe(true)
  })

  it('annan stad matchar inte utan flagga', () => {
    expect(workshopMatchesRequestCity(base, 'Linköping', ['Linköping', 'Norrköping'], false)).toBe(false)
  })

  it('areas-läge matchar areas_served när flaggan är på', () => {
    const workshop = { ...base, service_area_mode: 'areas', areas_served: ['Linköping'] }
    expect(workshopMatchesRequestCity(workshop, 'Linköping', [], true)).toBe(true)
    expect(workshopMatchesRequestCity(workshop, 'Lund', [], true)).toBe(false)
  })

  it('cluster-läge kräver både cluster-läge och opt-in', () => {
    const cluster = ['Linköping', 'Norrköping']
    const optedIn = { ...base, service_area_mode: 'cluster', cluster_opt_in: true }
    expect(workshopMatchesRequestCity(optedIn, 'Linköping', cluster, true)).toBe(true)
    expect(workshopMatchesRequestCity({ ...optedIn, cluster_opt_in: false }, 'Linköping', cluster, true)).toBe(false)
    expect(workshopMatchesRequestCity({ ...optedIn, city: 'Lund' }, 'Linköping', cluster, true)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Winner-reminder-kadens + stall-detektering
// ---------------------------------------------------------------------------
describe('decideWinnerAction', () => {
  it('före 2 h: inget', () => {
    expect(decideWinnerAction(1, false, false)).toEqual({ send: null, markStalled: false })
  })

  it('vid 2 h: första påminnelsen', () => {
    expect(decideWinnerAction(2, false, false)).toEqual({ send: '2h', markStalled: false })
  })

  it('redan skickad 2h upprepas aldrig (idempotens)', () => {
    expect(decideWinnerAction(3, true, false)).toEqual({ send: null, markStalled: false })
  })

  it('vid 24 h: andra påminnelsen', () => {
    expect(decideWinnerAction(24, true, false)).toEqual({ send: '24h', markStalled: false })
  })

  it('sen första scan: senaste due-steget väljs och stalled markeras vid 48 h', () => {
    expect(decideWinnerAction(50, false, false)).toEqual({ send: '24h', markStalled: true })
    expect(decideWinnerAction(50, true, false)).toEqual({ send: '24h', markStalled: true })
    expect(decideWinnerAction(50, true, true)).toEqual({ send: null, markStalled: true })
  })

  it('båda stegen due samtidigt → bara 24h-mejlet (2h spärras som superseded)', () => {
    expect(decideWinnerAction(30, false, false)).toEqual({ send: '24h', markStalled: false })
  })
})

describe('isStalledRecoveryDue', () => {
  const now = Date.parse('2026-09-01T12:00:00Z')
  it('inte före 72 h', () => {
    expect(isStalledRecoveryDue(now - 71 * HOUR_MS, now)).toBe(false)
  })
  it('klar vid 72 h', () => {
    expect(isStalledRecoveryDue(now - 72 * HOUR_MS, now)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Quiet hours + frekvenstak
// ---------------------------------------------------------------------------
describe('smsQuietHoursActive', () => {
  // Europe/Stockholm är UTC+2 i september (CEST).
  it('kväll 22:00 svensk tid = quiet', () => {
    expect(smsQuietHoursActive(new Date('2026-09-01T20:00:00Z'))).toBe(true)
  })
  it('natt 02:00 svensk tid = quiet', () => {
    expect(smsQuietHoursActive(new Date('2026-09-02T00:00:00Z'))).toBe(true)
  })
  it('middag 12:00 svensk tid = tillåtet', () => {
    expect(smsQuietHoursActive(new Date('2026-09-01T10:00:00Z'))).toBe(false)
  })
  it('gränsen 08:00 svensk tid = tillåtet', () => {
    expect(smsQuietHoursActive(new Date('2026-09-01T06:00:00Z'))).toBe(false)
  })
  it('gränsen 21:00 svensk tid = quiet', () => {
    expect(smsQuietHoursActive(new Date('2026-09-01T19:00:00Z'))).toBe(true)
  })
})

describe('nudgeCapReached', () => {
  const now = new Date('2026-09-01T12:00:00Z')
  it('utan tidigare nudge är taket inte nått', () => {
    expect(nudgeCapReached(null, now)).toBe(false)
    expect(nudgeCapReached(undefined, now)).toBe(false)
  })
  it('inom 72 h är taket nått', () => {
    expect(nudgeCapReached('2026-08-30T12:00:00Z', now)).toBe(true)
  })
  it('efter 72 h får nästa nudge gå ut', () => {
    expect(nudgeCapReached('2026-08-29T11:59:00Z', now)).toBe(false)
  })
})

describe('stockholmDateKey', () => {
  it('ger YYYYMMDD i svensk tid', () => {
    expect(stockholmDateKey(new Date('2026-09-01T10:00:00Z'))).toBe('20260901')
  })
})

// ---------------------------------------------------------------------------
// Onboarding state machine (contract §2.2)
// ---------------------------------------------------------------------------
describe('resolveOnboardingState', () => {
  const approved = { approved: true, quotesTotal: 0, quotes30d: 0, winsTotal: 0 }

  it('churned är manuellt och klistrar', () => {
    expect(resolveOnboardingState('churned', { ...approved, quotes30d: 10 })).toBe('churned')
  })

  it('ej godkänd → registered', () => {
    expect(resolveOnboardingState('approved', { ...approved, approved: false })).toBe('registered')
  })

  it('godkänd utan offerter → approved', () => {
    expect(resolveOnboardingState('registered', approved)).toBe('approved')
  })

  it('första offerten → first_quote_sent', () => {
    expect(resolveOnboardingState('approved', { ...approved, quotesTotal: 1, quotes30d: 1 })).toBe('first_quote_sent')
  })

  it('första vinsten → first_win', () => {
    expect(resolveOnboardingState('first_quote_sent', { ...approved, quotesTotal: 2, quotes30d: 2, winsTotal: 1 }))
      .toBe('first_win')
  })

  it(`≥${ACTIVATION_QUOTES_30D} offerter på 30 d → activated`, () => {
    expect(resolveOnboardingState('first_win', { ...approved, quotesTotal: 5, quotes30d: 3, winsTotal: 1 }))
      .toBe('activated')
  })

  it('aktiverad med 0 offerter på 30 d → dormant', () => {
    expect(resolveOnboardingState('activated', { ...approved, quotesTotal: 10, quotes30d: 0, winsTotal: 2 }))
      .toBe('dormant')
  })

  it('dormant som offererar igen återgår till progressionsnivå', () => {
    expect(resolveOnboardingState('dormant', { ...approved, quotesTotal: 11, quotes30d: 1, winsTotal: 2 }))
      .toBe('first_win')
    expect(resolveOnboardingState('dormant', { ...approved, quotesTotal: 20, quotes30d: 4, winsTotal: 2 }))
      .toBe('activated')
  })

  it('aldrig aktiverad kan inte bli dormant', () => {
    expect(resolveOnboardingState('first_quote_sent', { ...approved, quotesTotal: 1, quotes30d: 0 }))
      .toBe('first_quote_sent')
  })
})

describe('onboardingNudgeKind', () => {
  it('approved → onboarding-nudge (godkänd men aldrig offererat)', () => {
    expect(onboardingNudgeKind('approved')).toBe('onboarding')
  })
  it('dormant → dormant_workshop', () => {
    expect(onboardingNudgeKind('dormant')).toBe('dormant_workshop')
  })
  it('aktiva tillstånd nudgas inte', () => {
    expect(onboardingNudgeKind('activated')).toBeNull()
    expect(onboardingNudgeKind('first_win')).toBeNull()
    expect(onboardingNudgeKind('churned')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Idempotensnycklar — formatet är kontraktet mot v2_nudge_log (§2.2)
// ---------------------------------------------------------------------------
describe('dedupe-nycklar', () => {
  it('zero_quote-nycklar är unika per ärende, verkstad och steg', () => {
    expect(zeroQuoteNudgeKey('r1', 'w1', '24h')).toBe('zero_quote:r1:24h:w1')
    expect(zeroQuoteNudgeKey('r1', 'w1', '24h')).not.toBe(zeroQuoteNudgeKey('r1', 'w1', '72h'))
    expect(zeroQuoteNudgeKey('r1', 'w1', '24h')).not.toBe(zeroQuoteNudgeKey('r1', 'w2', '24h'))
  })

  it('winner_payment-nycklar följer kontraktsexemplet', () => {
    expect(winnerPaymentKey('resp1', '2h')).toBe('winner_payment:resp1:2h')
    expect(winnerPaymentKey('resp1', '24h')).toBe('winner_payment:resp1:24h')
  })

  it('reselection-inbjudan är unik per omvalsrunda', () => {
    expect(reselectionInviteKey('r1', 0)).toBe('reselection_invite:r1:0')
    expect(reselectionInviteKey('r1', 0)).not.toBe(reselectionInviteKey('r1', 1))
  })

  it('onboarding-nycklar är dygns- och typ-scopade', () => {
    expect(onboardingNudgeKey('w1', 'onboarding', '20260901')).toBe('onboarding:onboarding:w1:20260901')
    expect(onboardingNudgeKey('w1', 'onboarding', '20260901'))
      .not.toBe(onboardingNudgeKey('w1', 'dormant_workshop', '20260901'))
  })

  it('kundnycklar för zero-quote skiljer 72h från close', () => {
    expect(customerZeroQuoteKey('r1', '72h')).not.toBe(customerZeroQuoteKey('r1', 'close'))
  })
})
