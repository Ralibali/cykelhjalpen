// V2 S8 retention — tester för ren logik i _shared/v2/retention.ts plus
// frontend-hjälparna i src/lib/v2/retention.ts. Samma parity-mönster som
// contracts.test.ts: vitest importerar den beroendefria edge-modellen direkt.

import { describe, expect, it } from 'vitest'

import {
  QUIET_END_HOUR,
  addMonthsUtc,
  buildPrefillWizardUrl,
  buildSeasonalReminderEmail,
  buildUnsubscribeUrl,
  isInSeasonWindow,
  isQuietHours,
  messageDisposition,
  nextAllowedSendTime,
  planReminderForJob,
  reminderDedupeKey,
  ruleForCategory,
  seasonWindowEndUtc,
  seasonWindowStartUtc,
  stockholmLocalParts,
  type MaintenanceReminderRule,
  type RetentionContactState,
} from '../../../supabase/functions/_shared/v2/retention'

import { buildRepeatRequestUrl, historyStatusLabel } from './retention'

const t = (s: string) => s

const CONSENTED: RetentionContactState = {
  consent_basis: 'marketing_consent',
  unsubscribed_at: null,
  last_contacted_at: null,
}

const RULE: MaintenanceReminderRule = {
  repair_category: 'Service / genomgång',
  kind: 'seasonal_reminder',
  remind_after_months: 11,
  followup_days: 14,
  enabled: true,
}

const MESSAGE = {
  kind: 'seasonal_reminder' as const,
  channel: 'email',
  scheduled_for: new Date('2026-03-10T10:00:00Z'),
}

// 2026-03-10 10:00 UTC = 11:00/12:00 i Stockholm (CET) — utanför tysta timmar.
const DAYTIME = new Date('2026-03-10T10:00:00Z')

describe('consent-gating (hårda regler)', () => {
  it('avregistrerad kontakt suppressas alltid (icke-transactionell)', () => {
    const d = messageDisposition({ ...CONSENTED, unsubscribed_at: '2026-01-01T00:00:00Z' }, MESSAGE, DAYTIME)
    expect(d).toEqual({ action: 'suppress', reason: 'unsubscribed' })
  })

  it('säsongspåminnelse kräver marketing_consent', () => {
    const d = messageDisposition({ ...CONSENTED, consent_basis: 'legitimate_interest' }, MESSAGE, DAYTIME)
    expect(d).toEqual({ action: 'suppress', reason: 'no_marketing_consent' })
  })

  it('transactional basis påverkas inte av unsubscribed_at', () => {
    const d = messageDisposition(
      { consent_basis: 'transactional', unsubscribed_at: '2026-01-01T00:00:00Z', last_contacted_at: null },
      { ...MESSAGE, kind: 'onboarding_nudge' },
      DAYTIME,
    )
    expect(d.action).toBe('send')
  })

  it('samtyckt kontakt utan historik får skickas', () => {
    expect(messageDisposition(CONSENTED, MESSAGE, DAYTIME).action).toBe('send')
  })
})

describe('frekvenstak (cadence cap)', () => {
  it('utskick inom 30 dagar blockeras', () => {
    const contact = { ...CONSENTED, last_contacted_at: '2026-02-20T10:00:00Z' }
    expect(messageDisposition(contact, MESSAGE, DAYTIME)).toEqual({ action: 'skip', reason: 'cadence_cap' })
  })

  it('utskick efter 30 dagar tillåts', () => {
    const contact = { ...CONSENTED, last_contacted_at: '2026-01-15T10:00:00Z' }
    expect(messageDisposition(contact, MESSAGE, DAYTIME).action).toBe('send')
  })

  it('uppföljning är undantagen taket (samma säsongskadens)', () => {
    const contact = { ...CONSENTED, last_contacted_at: '2026-02-25T10:00:00Z' } // 13 dagar sedan
    expect(messageDisposition(contact, { ...MESSAGE, is_followup: true }, DAYTIME).action).toBe('send')
  })
})

describe('tysta timmar (Europe/Stockholm 21–08)', () => {
  it('22:30 lokal tid (sommar, UTC+2) är tyst', () => {
    const at = new Date('2026-06-15T20:30:00Z') // 22:30 CEST
    expect(stockholmLocalParts(at).hour).toBe(22)
    expect(isQuietHours(at)).toBe(true)
  })

  it('07:30 lokal tid (vinter, UTC+1) är tyst', () => {
    const at = new Date('2026-01-15T06:30:00Z') // 07:30 CET
    expect(stockholmLocalParts(at).hour).toBe(7)
    expect(isQuietHours(at)).toBe(true)
  })

  it('12:00 lokal tid är inte tyst', () => {
    expect(isQuietHours(new Date('2026-06-15T10:00:00Z'))).toBe(false)
  })

  it('kvällsutskick skjuts till 08:00 nästa dag (sommar)', () => {
    const next = nextAllowedSendTime(new Date('2026-06-15T20:30:00Z'))
    const parts = stockholmLocalParts(next)
    expect(parts.hour).toBe(QUIET_END_HOUR)
    expect(parts.day).toBe(16)
  })

  it('morgon före 08 skjuts till 08:00 samma dag (vinter)', () => {
    const next = nextAllowedSendTime(new Date('2026-01-15T06:30:00Z'))
    const parts = stockholmLocalParts(next)
    expect(parts.hour).toBe(QUIET_END_HOUR)
    expect(parts.day).toBe(15)
  })

  it('utskick under tyst tid schemaläggs om i stället för att skickas', () => {
    const d = messageDisposition(CONSENTED, MESSAGE, new Date('2026-06-15T22:30:00Z')) // 00:30 lokal tid
    expect(d.action).toBe('reschedule')
  })
})

describe('säsongsschemaläggning (vårfönster 15 feb–31 maj)', () => {
  it('jobb klart i juni → första vårfönstret efter 11 månader', () => {
    const plan = planReminderForJob(new Date('2025-06-01T12:00:00Z'), RULE, new Date('2025-12-01T00:00:00Z'))
    expect(plan).not.toBeNull()
    expect(plan!.season_year).toBe(2026)
    // 11 månader efter 1 juni = 1 maj 2026, inne i fönstret.
    expect(plan!.scheduled_for.toISOString()).toBe(addMonthsUtc(new Date('2025-06-01T12:00:00Z'), 11).toISOString())
    expect(plan!.followup_for).not.toBeNull()
  })

  it('jobb klart sent på hösten → nästnästa vår (fönstret hinner passera)', () => {
    const plan = planReminderForJob(new Date('2025-09-15T12:00:00Z'), RULE, new Date('2025-12-01T00:00:00Z'))
    // 11 månader senare = aug 2026 → efter fönsterslutet → våren 2027.
    expect(plan!.season_year).toBe(2027)
    expect(plan!.scheduled_for.toISOString()).toBe(seasonWindowStartUtc(2027).toISOString())
  })

  it('jobb vars fönster redan passerat schemaläggs aldrig (anti-backlog)', () => {
    const plan = planReminderForJob(new Date('2024-06-01T12:00:00Z'), RULE, new Date('2026-06-01T00:00:00Z'))
    expect(plan).toBeNull()
  })

  it('fönstergränser: 14 feb är utanför, 15 feb innanför', () => {
    expect(isInSeasonWindow(new Date('2026-02-14T12:00:00Z'))).toBe(false)
    expect(isInSeasonWindow(new Date('2026-02-15T08:00:00Z'))).toBe(true)
    expect(isInSeasonWindow(new Date('2026-05-31T12:00:00Z'))).toBe(true)
    expect(isInSeasonWindow(new Date('2026-06-01T12:00:00Z'))).toBe(false)
  })

  it('regel utan uppföljning ger ingen followup', () => {
    const plan = planReminderForJob(new Date('2025-06-01T12:00:00Z'), { ...RULE, followup_days: 0 }, new Date('2025-12-01T00:00:00Z'))
    expect(plan!.followup_for).toBeNull()
  })

  it('inaktiv regel schemalägger inget', () => {
    expect(planReminderForJob(new Date('2025-06-01T12:00:00Z'), { ...RULE, enabled: false }, new Date('2025-12-01T00:00:00Z'))).toBeNull()
  })
})

describe('regeluppslag + dedupe', () => {
  const rules: MaintenanceReminderRule[] = [
    RULE,
    { repair_category: '*', kind: 'seasonal_reminder', remind_after_months: 12, followup_days: 0, enabled: true },
  ]

  it('exakt kategori-match vinner före fallback', () => {
    expect(ruleForCategory(rules, 'Service / genomgång')?.remind_after_months).toBe(11)
  })

  it('okänd kategori faller tillbaka på *', () => {
    expect(ruleForCategory(rules, 'Framtida kategori')?.repair_category).toBe('*')
  })

  it('inga regler alls → null', () => {
    expect(ruleForCategory([], 'Service / genomgång')).toBeNull()
  })

  it('dedupe-nyckel är per kontakt + säsong, uppföljning har suffix', () => {
    const base = reminderDedupeKey('c-1', 'seasonal_reminder', 2026)
    expect(base).toBe('v2:seasonal_reminder:c-1:2026')
    expect(reminderDedupeKey('c-1', 'seasonal_reminder', 2026, true)).toBe(`${base}:followup`)
    expect(reminderDedupeKey('c-1', 'seasonal_reminder', 2027)).not.toBe(base)
  })
})

describe('uppföljningsregel (max en, ställs in vid nytt ärende)', () => {
  it('uppföljning hoppas över om kunden skapat nytt ärende', () => {
    const d = messageDisposition(CONSENTED, { ...MESSAGE, is_followup: true }, DAYTIME, {
      newerRequestSince: new Date('2026-03-15T00:00:00Z'),
    })
    expect(d).toEqual({ action: 'skip', reason: 'newer_request_exists' })
  })

  it('uppföljning utan nytt ärende skickas', () => {
    const d = messageDisposition(CONSENTED, { ...MESSAGE, is_followup: true }, DAYTIME, { newerRequestSince: null })
    expect(d.action).toBe('send')
  })
})

describe('prefill-länkar (repeat CTA)', () => {
  it('edge: bygger wizard-URL med stad/cykel/problem', () => {
    const url = buildPrefillWizardUrl({ citySlug: 'linkoping', bikeType: 'Elcykel', repairCategory: 'Service / genomgång' })
    expect(url).toContain('https://cykelhjalpen.se/skicka-arende?')
    expect(url).toContain('stad=linkoping')
    expect(url).toContain('cykel=Elcykel')
    expect(url).toContain('problem=Service')
  })

  it('frontend: svensk stadsnamn mappas till ascii-slug', () => {
    const url = buildRepeatRequestUrl({ city: 'Linköping', bikeType: 'Vanlig cykel', repairCategory: 'Bromsar' })
    expect(url.startsWith('/skicka-arende?')).toBe(true)
    expect(url).toContain('stad=linkoping')
    expect(url).toContain('cykel=Vanlig+cykel')
  })

  it('frontend: okänd stad ger länk utan stadsparam', () => {
    expect(buildRepeatRequestUrl({ city: 'Göteborg' })).toBe('/skicka-arende')
  })
})

describe('mejlmall (svensk ton + obligatorisk avregistrering)', () => {
  const email = buildSeasonalReminderEmail({
    customerName: 'Ada <Lovelace>',
    city: 'Linköping',
    bikeType: 'Elcykel',
    repairCategory: 'Service / genomgång',
    prefillUrl: 'https://cykelhjalpen.se/skicka-arende?stad=linkoping',
    tokenUrl: 'https://cykelhjalpen.se/mitt-arende/abc',
    unsubscribeUrl: buildUnsubscribeUrl('11111111-1111-1111-1111-111111111111'),
  })

  it('innehåller alltid fungerande avregistreringslänk', () => {
    expect(email.html).toContain('/avsluta-paminnelser/11111111-1111-1111-1111-111111111111')
    expect(email.html).toContain('Avregistrera')
  })

  it('innehåller prefill-CTA och token-sida', () => {
    expect(email.html).toContain('skicka-arende?stad=linkoping')
    expect(email.html).toContain('mitt-arende/abc')
  })

  it('escapar HTML i kundnamn', () => {
    expect(email.html).not.toContain('<Lovelace>')
    expect(email.html).toContain('Ada &lt;Lovelace&gt;')
  })

  it('uppföljningsvarianten markerar sista påminnelsen', () => {
    const followup = buildSeasonalReminderEmail({
      customerName: 'Ada', city: 'Lund', bikeType: 'Vanlig cykel', repairCategory: 'Bromsar',
      prefillUrl: 'https://cykelhjalpen.se/skicka-arende', tokenUrl: 'https://cykelhjalpen.se/mitt-arende/x',
      unsubscribeUrl: 'https://cykelhjalpen.se/avsluta-paminnelser/y', followup: true,
    })
    expect(followup.html).toContain('sista påminnelse')
  })
})

describe('historiketiketter', () => {
  const base = {
    id: '1', bike_type: 'Elcykel', repair_category: 'Bromsar', city: 'Lund',
    status: 'completed', created_at: '2025-05-01T00:00:00Z', view_token: 'tok', outcome: null,
  }
  it('utfört när outcome är completed', () => {
    expect(historyStatusLabel({ ...base, outcome: { state: 'completed', final_price_sek: 450 } }, t)).toBe('Utfört')
  })
  it('verkstad vald i v1-flödet', () => {
    expect(historyStatusLabel(base, t)).toBe('Verkstad vald')
  })
  it('utgånget ärende', () => {
    expect(historyStatusLabel({ ...base, status: 'choice_expired' }, t)).toBe('Avslutat utan val')
  })
})

describe('säsongsfönster-hjälpare', () => {
  it('start/slut bygger rätt datum', () => {
    expect(seasonWindowStartUtc(2026).toISOString()).toContain('2026-02-15')
    expect(seasonWindowEndUtc(2026).toISOString()).toContain('2026-05-31')
  })
})
