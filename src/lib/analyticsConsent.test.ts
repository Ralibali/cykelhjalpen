import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  hasAnalyticsConsent,
  notifyConsentChanged,
  readConsentLevel,
} from './analyticsConsent'

describe('analytics consent', () => {
  afterEach(() => vi.restoreAllMocks())
  beforeEach(() => {
    localStorage.clear()
  })

  it('requires an explicit all choice before analytics is enabled', () => {
    expect(readConsentLevel()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ level: 'necessary' }))
    expect(readConsentLevel()).toBe('necessary')
    expect(hasAnalyticsConsent()).toBe(false)

    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ level: 'all' }))
    expect(readConsentLevel()).toBe('all')
    expect(hasAnalyticsConsent()).toBe(true)
  })

  it('removes invalid stored consent instead of enabling analytics', () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, '{invalid')
    expect(readConsentLevel()).toBeNull()
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull()
  })

  it('notifies the app when consent changes', () => {
    const listener = vi.fn()
    window.addEventListener(COOKIE_CONSENT_EVENT, listener)

    notifyConsentChanged('all')

    expect(listener).toHaveBeenCalledTimes(1)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('all')
    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })

  it('keeps analytics disabled when accessing storage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    expect(readConsentLevel()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('keeps analytics disabled when reading and cleanup both throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage is blocked', 'SecurityError')
    })
    expect(readConsentLevel()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
  })
})
