/**
 * Google Ads-konverteringsspårning (gtag.js) med samtycke först.
 *
 * Integritetsprecis som Plausible-gaten: inget Google-script laddas förrän
 * besökaren sagt ja till alla cookies ('all'), och bara på produktionsdomänen.
 * Consent Mode-signaler skickas så att Google vet laget (granted/denied).
 *
 * SETUP: fyll i de tre värdena nedan från Google Ads
 * (Verktyg → Konverteringar → respektive konverteringsåtgärd → Tagginställningar).
 * Lämna tomt så blir allt en tyst no-op – helt säkert att deploya i förväg.
 */
import { COOKIE_CONSENT_EVENT, hasAnalyticsConsent, type ConsentLevel } from './analyticsConsent'

export const googleAdsConfig = {
  /** Tagg-ID, t.ex. 'AW-123456789' */
  tagId: '',
  /** Konverteringsetikett för "Skickat ärende" (kund skickar förfrågan) */
  labelRequest: '',
  /** Konverteringsetikett för "Registrerad verkstad" */
  labelSignup: '',
}

type GtagFn = (command: string, ...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagFn
  }
}

const SCRIPT_ID = 'cykelhjalpen-google-ads-tag'

let initialized = false
let scriptInjected = false

const isProdHost = (): boolean => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'cykelhjalpen.se' || host === 'www.cykelhjalpen.se'
}

const gtag = (...args: unknown[]): void => {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(args)
}

const setConsent = (granted: boolean): void => {
  gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    analytics_storage: granted ? 'granted' : 'denied',
  })
}

/** Laddar gtag.js och aktiverar spårning. Anropas bara efter fullt samtycke. */
const enableGoogleAds = (): void => {
  if (!googleAdsConfig.tagId) return
  if (!scriptInjected) {
    scriptInjected = true
    window.gtag = window.gtag || gtag
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAdsConfig.tagId)}`
    document.head.appendChild(script)
    gtag('js', new Date())
    gtag('config', googleAdsConfig.tagId)
  }
  setConsent(true)
}

const disableGoogleAds = (): void => {
  if (!scriptInjected) return
  setConsent(false)
}

/**
 * Anropas en gång vid app-start. Läser befintligt samtycke och lyssnar på
 * ändringar från cookie-bannern. No-op utanför produktion och utan tagg-ID.
 */
export function initGoogleAds(): void {
  if (typeof window === 'undefined' || initialized) return
  initialized = true
  if (!isProdHost() || !googleAdsConfig.tagId) return

  if (hasAnalyticsConsent()) enableGoogleAds()

  window.addEventListener(COOKIE_CONSENT_EVENT, (event) => {
    const level = (event as CustomEvent<ConsentLevel>).detail
    if (level === 'all') enableGoogleAds()
    else disableGoogleAds()
  })
}

export type AdsConversion = 'request_submitted' | 'workshop_signup'

/**
 * Skickar en konvertering till Google Ads. Kräver att besökaren samtyckt
 * (annars är taggen aldrig laddad) och att etiketten är ifylld.
 */
export function trackAdsConversion(kind: AdsConversion): void {
  if (typeof window === 'undefined') return
  if (!scriptInjected || typeof window.gtag !== 'function') return
  const label = kind === 'request_submitted' ? googleAdsConfig.labelRequest : googleAdsConfig.labelSignup
  if (!googleAdsConfig.tagId || !label) return
  try {
    window.gtag('event', 'conversion', { send_to: `${googleAdsConfig.tagId}/${label}` })
  } catch {
    // Spårning får aldrig störa flödet.
  }
}
