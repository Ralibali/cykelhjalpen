import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, createConsent, hasAnalyticsConsent, hasMarketingConsent, notifyConsentChanged, parseConsent, readConsentLevel } from './analyticsConsent'

describe('analytics consent', () => {
  beforeEach(() => localStorage.clear())
  it('keeps statistics and marketing independent', () => {
    expect(readConsentLevel()).toBeNull()
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(createConsent(true, false)))
    expect(hasAnalyticsConsent()).toBe(true)
    expect(hasMarketingConsent()).toBe(false)
    expect(readConsentLevel()).toBe('analytics')
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(createConsent(false, true)))
    expect(hasAnalyticsConsent()).toBe(false)
    expect(hasMarketingConsent()).toBe(true)
  })
  it('rejects malformed, expired, future and legacy bundled choices', () => {
    const now = Date.parse('2026-09-30T10:00:00Z')
    for (const raw of ['{invalid', JSON.stringify({ level: 'all' }), JSON.stringify(createConsent(true, true, '2025-09-30')), JSON.stringify(createConsent(true, true, '2027-09-30'))]) expect(parseConsent(raw, now)).toBeNull()
    localStorage.setItem(COOKIE_CONSENT_KEY, '{invalid')
    expect(readConsentLevel()).toBeNull()
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull()
  })
  it('notifies the app with category choices', () => {
    const listener = vi.fn()
    window.addEventListener(COOKIE_CONSENT_EVENT, listener)
    const state = createConsent(false, true)
    notifyConsentChanged(state)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual(state)
    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })
})
