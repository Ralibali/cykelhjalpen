// Vitest-svit för S8:s retention-logik. Testar den faktiska modulen som
// edge-funktionerna använder (supabase/functions/_shared/v2/retention.ts).

import { describe, expect, it } from 'vitest'
import {
  RETENTION_CONFIG,
  computeLifecycleStage,
  computeProfileCompleteness,
  deferForQuietHours,
  dormancyCycleKey,
  isDigestDay,
  isDormant,
  isPerformanceDay,
  isSeasonalTarget,
  isSeasonalWindow,
  isSmsQuietHours,
  isSuppressed,
  isoWeekKey,
  previousMonthKey,
  reactivationSchedule,
  retentionDedupeKeys,
  seasonalKey,
  shouldSendDigest,
  shouldSendPerformanceSummary,
  shouldSendProfileNudge,
  stockholmParts,
  summarizeDigest,
  underFrequencyCap,
} from '../../../supabase/functions/_shared/v2/retention'

const utc = (iso: string) => new Date(iso)

describe('tysta timmar för SMS (21–08 svensk tid)', () => {
  it('vinter: 23:30 svensk tid är tyst', () => {
    expect(isSmsQuietHours(utc('2026-02-15T22:30:00Z'))).toBe(true) // 23:30 CET
  })
  it('vinter: 07:30 svensk tid är fortfarande tyst', () => {
    expect(isSmsQuietHours(utc('2026-02-16T06:30:00Z'))).toBe(true) // 07:30 CET
  })
  it('vinter: 08:30 svensk tid är inte tyst', () => {
    expect(isSmsQuietHours(utc('2026-02-16T07:30:00Z'))).toBe(false) // 08:30 CET
  })
  it('sommar (DST): 21:30 svensk tid är tyst', () => {
    expect(isSmsQuietHours(utc('2026-06-15T19:30:00Z'))).toBe(true) // 21:30 CEST
  })
  it('sommar (DST): 12:00 svensk tid är inte tyst', () => {
    expect(isSmsQuietHours(utc('2026-06-15T10:00:00Z'))).toBe(false) // 12:00 CEST
  })
  it('e-post påverkas aldrig av tysta timmar', () => {
    expect(deferForQuietHours(utc('2026-02-15T22:30:00Z'), 'email')).toBeNull()
  })
  it('SMS under tysta timmar skjuts till 08:00 svensk tid', () => {
    const deferred = deferForQuietHours(utc('2026-02-15T22:30:00Z'), 'sms')
    expect(deferred?.toISOString()).toBe('2026-02-16T07:00:00.000Z')
  })
  it('SMS mitt på dagen skjuts inte upp', () => {
    expect(deferForQuietHours(utc('2026-02-16T10:00:00Z'), 'sms')).toBeNull()
  })
})

describe('dormant-detektering och livscykel', () => {
  const base = { approved: true, createdAt: utc('2026-01-01T00:00:00Z') }
  it('godkänd verkstad utan offert på 30+ dagar är dormant', () => {
    expect(isDormant({ ...base, lastQuoteAt: utc('2026-07-01T00:00:00Z'), now: utc('2026-08-15T00:00:00Z') })).toBe(true)
  })
  it('verkstad som slutat offerera (senaste offert 31 dagar sedan) är dormant', () => {
    expect(computeLifecycleStage({ ...base, lastQuoteAt: utc('2026-07-15T00:00:00Z'), now: utc('2026-08-15T00:00:00Z') })).toBe('dormant')
  })
  it('29 dagar utan offert är lapsing, inte dormant', () => {
    expect(computeLifecycleStage({ ...base, lastQuoteAt: utc('2026-07-17T00:00:00Z'), now: utc('2026-08-15T00:00:00Z') })).toBe('lapsing')
  })
  it('offert inom 14 dagar är active', () => {
    expect(computeLifecycleStage({ ...base, lastQuoteAt: utc('2026-08-10T00:00:00Z'), now: utc('2026-08-15T00:00:00Z') })).toBe('active')
  })
  it('ej godkänd verkstad rörs inte (onboarding ägs av S2)', () => {
    expect(computeLifecycleStage({ approved: false, createdAt: utc('2025-01-01T00:00:00Z'), lastQuoteAt: null, now: utc('2026-08-15T00:00:00Z') })).toBe('new')
  })
})

describe('återaktiveringssekvens (capped, cron-säker)', () => {
  const now = utc('2026-08-15T12:00:00Z')
  it('sekvensen ankars vid upptäckt: steg 1 direkt, steg 2 och 3 i framtiden', () => {
    const steps = reactivationSchedule(now, now)
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3])
    expect(steps[0].sendAt.toISOString()).toBe(now.toISOString())
    expect(steps[1].sendAt.toISOString()).toBe('2026-08-22T12:00:00.000Z')
    expect(steps[2].sendAt.toISOString()).toBe('2026-09-05T12:00:00.000Z')
  })
  it('sen upptäckt (gammal dormancy) behåller mellanrummen framåt', () => {
    const dormantSince = utc('2026-07-01T12:00:00Z')
    const steps = reactivationSchedule(dormantSince, now)
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3])
    expect(steps[0].sendAt.toISOString()).toBe(now.toISOString())
    expect(steps[1].sendAt.getTime() - steps[0].sendAt.getTime()).toBe(7 * 24 * 3_600_000)
    expect(steps[2].sendAt.getTime() - steps[0].sendAt.getTime()).toBe(21 * 24 * 3_600_000)
  })
  it('sekvensen är hårt capped på 3 steg', () => {
    expect(RETENTION_CONFIG.reactivationStepDays.length).toBe(3)
    expect(reactivationSchedule(utc('2025-01-01T00:00:00Z'), now)).toHaveLength(3)
  })
  it('cykelnyckeln skiljer nya dormant-perioder åt (ny sekvens tillåts)', () => {
    expect(dormancyCycleKey(utc('2026-07-01T00:00:00Z'), utc('2026-01-01T00:00:00Z'))).toBe('2026-07-01')
    expect(dormancyCycleKey(null, utc('2026-01-01T00:00:00Z'))).toBe('2026-01-01')
  })
})

describe('veckodigest: skip-empty och måndagskadens', () => {
  const items = [
    { id: 'a', repair_category: 'Punktering', bike_type: 'Elcykel', area: 'Centrum', created_at: '2026-09-07T08:00:00Z' },
    { id: 'b', repair_category: 'Punktering', bike_type: 'Racer', area: null, created_at: '2026-09-08T08:00:00Z' },
    { id: 'c', repair_category: 'Service', bike_type: 'MTB', area: 'Norr', created_at: '2026-09-09T08:00:00Z' },
  ]
  it('tom efterfrågan → inget mejl', () => {
    expect(shouldSendDigest([])).toBe(false)
  })
  it('relevant efterfrågan → mejl skapas', () => {
    expect(shouldSendDigest(items)).toBe(true)
  })
  it('sammanfattning grupperar per kategori, flest först', () => {
    const summary = summarizeDigest(items)
    expect(summary.total).toBe(3)
    expect(summary.categories).toEqual([
      { category: 'Punktering', count: 2 },
      { category: 'Service', count: 1 },
    ])
  })
  it('digest skickas bara på måndagar (svensk tid)', () => {
    // 2026-09-07 är en måndag, 2026-09-08 en tisdag.
    expect(isDigestDay(utc('2026-09-07T10:00:00Z'))).toBe(true)
    expect(isDigestDay(utc('2026-09-08T10:00:00Z'))).toBe(false)
  })
  it('ISO-veckonyckeln är stabil inom veckan och ändras nästa vecka', () => {
    expect(isoWeekKey(utc('2026-09-07T08:00:00Z'))).toBe(isoWeekKey(utc('2026-09-13T20:00:00Z')))
    expect(isoWeekKey(utc('2026-09-07T08:00:00Z'))).not.toBe(isoWeekKey(utc('2026-09-14T08:00:00Z')))
  })
})

describe('säsongsreaktivering (februari–mars)', () => {
  it('februari är inne i fönstret, april utanför', () => {
    expect(isSeasonalWindow(utc('2026-02-10T10:00:00Z'))).toBe(true)
    expect(isSeasonalWindow(utc('2026-03-31T10:00:00Z'))).toBe(true)
    expect(isSeasonalWindow(utc('2026-04-01T10:00:00Z'))).toBe(false)
  })
  it('målgrupp: aktiv förra säsongen (mar–okt) men inaktiv nu', () => {
    expect(isSeasonalTarget(utc('2025-06-15T10:00:00Z'), utc('2026-02-10T10:00:00Z'))).toBe(true)
  })
  it('inte målgrupp: offert efter säsongen (december)', () => {
    expect(isSeasonalTarget(utc('2025-12-01T10:00:00Z'), utc('2026-02-10T10:00:00Z'))).toBe(false)
  })
  it('inte målgrupp: ingen offert alls', () => {
    expect(isSeasonalTarget(null, utc('2026-02-10T10:00:00Z'))).toBe(false)
  })
  it('inte målgrupp utanför fönstret även med säsongshistorik', () => {
    expect(isSeasonalTarget(utc('2025-06-15T10:00:00Z'), utc('2026-05-10T10:00:00Z'))).toBe(false)
  })
  it('säsongsnyckeln är en per år', () => {
    expect(seasonalKey(utc('2026-02-10T10:00:00Z'))).toBe('spring-2026')
  })
})

describe('månadssammanfattning: skip-empty och periodnyckel', () => {
  it('ingen aktivitet → inget mejl', () => {
    expect(shouldSendPerformanceSummary({ quotesSent: 0, wins: 0, revenueSek: null, avgRating: null, publishedReviewCount: 0 })).toBe(false)
  })
  it('minst en offert eller vinst → mejl skapas', () => {
    expect(shouldSendPerformanceSummary({ quotesSent: 4, wins: 0, revenueSek: null, avgRating: null, publishedReviewCount: 0 })).toBe(true)
    expect(shouldSendPerformanceSummary({ quotesSent: 0, wins: 1, revenueSek: 2400, avgRating: null, publishedReviewCount: 0 })).toBe(true)
  })
  it('periodnyckeln är föregående månad, även över årsskiftet', () => {
    expect(previousMonthKey(utc('2026-09-01T10:00:00Z'))).toBe('2026-08')
    expect(previousMonthKey(utc('2027-01-01T10:00:00Z'))).toBe('2026-12')
  })
  it('sammanfattningen skickas bara den 1:a (svensk tid)', () => {
    expect(isPerformanceDay(utc('2026-09-01T10:00:00Z'))).toBe(true)
    expect(isPerformanceDay(utc('2026-09-02T10:00:00Z'))).toBe(false)
  })
})

describe('profilkompletthet', () => {
  it('tom profil → 0 % och allt saknas', () => {
    const result = computeProfileCompleteness({})
    expect(result.percent).toBe(0)
    expect(result.missing).toHaveLength(5)
    expect(shouldSendProfileNudge(result)).toBe(true)
  })
  it('komplett profil → 100 % och ingen knuff', () => {
    const result = computeProfileCompleteness({
      bio_short: 'Vi är en cykelverkstad i stan med lång erfarenhet.',
      logo_url: 'https://example.se/logo.png',
      areas_served: ['Centrum'],
      services: ['Service'],
      website: 'https://verkstad.se',
    })
    expect(result.percent).toBe(100)
    expect(result.missing).toHaveLength(0)
    expect(shouldSendProfileNudge(result)).toBe(false)
  })
  it('lång description räknas som presentation (bio_short saknas)', () => {
    const result = computeProfileCompleteness({
      description: 'En presentation som är tillräckligt lång för att räknas.',
      logo_url: 'https://example.se/logo.png',
      areas_served: ['Centrum'],
      services: ['Service'],
      website: 'https://verkstad.se',
    })
    expect(result.missing).not.toContain('Kort presentation')
  })
})

describe('suppression, frekvenstak och dedupe (I4)', () => {
  it('avregistrerad kontakt undertrycks alltid (utom transaktionellt)', () => {
    expect(isSuppressed({ unsubscribedAt: '2026-08-01T00:00:00Z', consentBasis: 'legitimate_interest' })).toBe(true)
    expect(isSuppressed({ unsubscribedAt: '2026-08-01T00:00:00Z', consentBasis: 'marketing_consent' })).toBe(true)
    expect(isSuppressed({ unsubscribedAt: '2026-08-01T00:00:00Z', consentBasis: 'transactional' })).toBe(false)
  })
  it('aktiv kontakt undertrycks aldrig', () => {
    expect(isSuppressed({ unsubscribedAt: null, consentBasis: 'legitimate_interest' })).toBe(false)
  })
  it('frekvenstaket stoppar vid 2 skickade per 7 dygn', () => {
    expect(underFrequencyCap(0)).toBe(true)
    expect(underFrequencyCap(1)).toBe(true)
    expect(underFrequencyCap(2)).toBe(false)
    expect(underFrequencyCap(5)).toBe(false)
  })
  it('dedupe-nycklar är deterministiska (cron-retry = samma nyckel)', () => {
    const key = retentionDedupeKeys.digest('ws-1', '2026-W37')
    expect(key).toBe('v2ret:digest:ws-1:2026-W37')
    expect(retentionDedupeKeys.digest('ws-1', '2026-W37')).toBe(key)
    expect(retentionDedupeKeys.reactivation('ws-1', '2026-07-01', 2)).toBe('v2ret:reactivation:ws-1:2026-07-01:s2')
    expect(retentionDedupeKeys.reviewNotification('rev-9')).toBe('v2ret:notify:review:rev-9')
    expect(retentionDedupeKeys.outcomeNotification('out-1', 'completed')).toBe('v2ret:notify:outcome:out-1:completed')
    expect(retentionDedupeKeys.performance('ws-1', '2026-08')).toBe('v2ret:perf:ws-1:2026-08')
    expect(retentionDedupeKeys.profileNudge('ws-1', 2)).toBe('v2ret:profile:ws-1:n2')
  })
})

describe('mejlmallar (svensk ton, unsubscribe-länk, escaping)', () => {
  const ctx = {
    companyName: 'Lasses Cykel <b>',
    city: 'Linköping',
    unsubscribeUrl: 'https://example.supabase.co/functions/v1/v2-retention-unsubscribe?token=abc',
  }
  it('alla mallar har ämne, unsubscribe-länk och escapede värden', async () => {
    const templates = await import('../../../supabase/functions/_shared/v2/retention-templates')
    const all = [
      templates.buildReactivationEmail(1, ctx, 45),
      templates.buildReactivationEmail(2, ctx, 52),
      templates.buildReactivationEmail(3, ctx, 66),
      templates.buildDigestEmail(ctx, { total: 2, categories: [{ category: 'Service', count: 2 }] }, [], '2026-W37'),
      templates.buildSeasonalEmail(ctx),
      templates.buildPerformanceEmail(ctx, '2026-08', { quotesSent: 5, wins: 2, revenueSek: 4800, avgRating: 4.5, publishedReviewCount: 3 }),
      templates.buildProfileNudgeEmail(ctx, { percent: 40, missing: ['Logotyp', 'Tjänster', 'Webbplats'] }),
      templates.buildReviewNotificationEmail(ctx, 4, 'Mycket <bra> service!'),
      templates.buildOutcomeNotificationEmail(ctx, 'completed', 1200),
    ]
    for (const mail of all) {
      expect(mail.subject.length).toBeGreaterThan(3)
      expect(mail.html).toContain('Avregistrera')
      expect(mail.html).toContain(ctx.unsubscribeUrl)
      expect(mail.html).not.toContain('<b>')
    }
    expect(all[0].html).toContain('Lasses Cykel &lt;b&gt;')
  })
  it('månadssammanfattning utelämnar intäktsraden när outcome-data saknas', async () => {
    const templates = await import('../../../supabase/functions/_shared/v2/retention-templates')
    const without = templates.buildPerformanceEmail(ctx, '2026-08', { quotesSent: 3, wins: 1, revenueSek: null, avgRating: null, publishedReviewCount: 0 })
    expect(without.html).not.toContain('Bekräftat jobbvärde')
    expect(without.html).not.toContain('Omdöme')
    const withData = templates.buildPerformanceEmail(ctx, '2026-08', { quotesSent: 3, wins: 1, revenueSek: 2400, avgRating: 4.5, publishedReviewCount: 2 })
    expect(withData.html).toContain('Bekräftat jobbvärde')
    // sv-SE grupperar tusental med icke-brytande blanksteg (NBSP/narrow NBSP).
    expect(withData.html).toMatch(/2[\s]400 kr/)
  })
})

describe('stockholmParts', () => {
  it('vintertid (CET, UTC+1)', () => {
    const parts = stockholmParts(utc('2026-02-15T22:30:00Z'))
    expect(parts.hour).toBe(23)
    expect(parts.dateKey).toBe('2026-02-15')
  })
  it('sommartid (CEST, UTC+2) och veckodag', () => {
    const parts = stockholmParts(utc('2026-09-07T10:00:00Z'))
    expect(parts.hour).toBe(12)
    expect(parts.weekday).toBe(1) // måndag
  })
})
