import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { COOKIE_CONSENT_KEY, COOKIE_CONSENT_EVENT } from './analyticsConsent'

const TAG_SRC_ID = 'cykelhjalpen-google-ads-tag'

const setHost = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    value: { hostname, href: `https://${hostname}/` },
    writable: true,
    configurable: true,
  })
}

const setConsentAll = () => {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ level: 'all', date: '2026-07-31' }))
}

const fireConsentEvent = (level: 'all' | 'necessary') => {
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: level }))
}

const dataLayerCalls = (command: string): unknown[][] =>
  (window.dataLayer as unknown[][] | undefined ?? []).filter((args) => args[0] === command)

describe('googleAds', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    document.getElementById(TAG_SRC_ID)?.remove()
    delete window.gtag
    delete window.dataLayer
  })

  afterEach(() => {
    setHost('localhost')
  })

  it('no-op utan tagg-id – inget script laddas ens med samtycke', async () => {
    setHost('cykelhjalpen.se')
    setConsentAll()
    const { initGoogleAds } = await import('./googleAds')
    initGoogleAds()
    expect(document.getElementById(TAG_SRC_ID)).toBeNull()
    expect(window.gtag).toBeUndefined()
  })

  it('laddar inte utan samtycke', async () => {
    setHost('cykelhjalpen.se')
    const { initGoogleAds, googleAdsConfig } = await import('./googleAds')
    googleAdsConfig.tagId = 'AW-123'
    initGoogleAds()
    expect(document.getElementById(TAG_SRC_ID)).toBeNull()
  })

  it('laddar inte utanför produktionsdomänen', async () => {
    setHost('localhost')
    setConsentAll()
    const { initGoogleAds, googleAdsConfig } = await import('./googleAds')
    googleAdsConfig.tagId = 'AW-123'
    initGoogleAds()
    expect(document.getElementById(TAG_SRC_ID)).toBeNull()
  })

  it('laddar gtag med granted-samtycke när besökaren godkänt alla cookies', async () => {
    setHost('cykelhjalpen.se')
    setConsentAll()
    const { initGoogleAds, googleAdsConfig } = await import('./googleAds')
    googleAdsConfig.tagId = 'AW-123'
    initGoogleAds()

    const script = document.getElementById(TAG_SRC_ID) as HTMLScriptElement | null
    expect(script).not.toBeNull()
    expect(script!.src).toContain('gtag/js?id=AW-123')
    expect(typeof window.gtag).toBe('function')
    expect(dataLayerCalls('config')[0]?.[1]).toBe('AW-123')
    const consentCall = dataLayerCalls('consent')[0]
    expect(consentCall?.[1]).toBe('update')
    expect((consentCall?.[2] as Record<string, string>).ad_storage).toBe('granted')
  })

  it('reagerar på samtyckesändringar från bannern', async () => {
    setHost('cykelhjalpen.se')
    const { initGoogleAds, googleAdsConfig } = await import('./googleAds')
    googleAdsConfig.tagId = 'AW-123'
    initGoogleAds()
    expect(document.getElementById(TAG_SRC_ID)).toBeNull()

    fireConsentEvent('all')
    expect(document.getElementById(TAG_SRC_ID)).not.toBeNull()

    fireConsentEvent('necessary')
    const updates = dataLayerCalls('consent')
    const last = updates[updates.length - 1]?.[2] as Record<string, string>
    expect(last.ad_storage).toBe('denied')
  })

  it('trackAdsConversion skickar conversion-event med rätt send_to', async () => {
    setHost('cykelhjalpen.se')
    setConsentAll()
    const { initGoogleAds, trackAdsConversion, googleAdsConfig } = await import('./googleAds')
    googleAdsConfig.tagId = 'AW-123'
    googleAdsConfig.labelRequest = 'labelXYZ'
    initGoogleAds()

    trackAdsConversion('request_submitted')
    const events = dataLayerCalls('event')
    const conv = events.find((args) => args[1] === 'conversion')
    expect(conv).toBeDefined()
    expect((conv![2] as { send_to: string }).send_to).toBe('AW-123/labelXYZ')
  })

  it('trackAdsConversion är no-op utan ifylld etikett', async () => {
    setHost('cykelhjalpen.se')
    setConsentAll()
    const { initGoogleAds, trackAdsConversion, googleAdsConfig } = await import('./googleAds')
    googleAdsConfig.tagId = 'AW-123'
    initGoogleAds()

    trackAdsConversion('workshop_signup')
    const events = dataLayerCalls('event')
    expect(events.find((args) => args[1] === 'conversion')).toBeUndefined()
  })
})
