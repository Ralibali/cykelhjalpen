export const COOKIE_CONSENT_KEY = 'cykelhjalpen_cookie_consent'
export const COOKIE_CONSENT_EVENT = 'cykelhjalpen:cookie-consent-changed'
export const COOKIE_CONSENT_VERSION = '2026-09-30'
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000
export type ConsentLevel = 'all' | 'necessary' | 'analytics' | 'marketing'
export type ConsentRecord = { necessary: true; analytics: boolean; marketing: boolean; date: string; version: string }
export const createConsent = (analytics: boolean, marketing: boolean, date = new Date().toISOString()): ConsentRecord => ({ necessary: true, analytics, marketing, date, version: COOKIE_CONSENT_VERSION })
export function parseConsent(raw: string | null, now = Date.now()): ConsentRecord | null {
  try {
    const value = raw ? JSON.parse(raw) : null
    if (!value || typeof value !== 'object') return null
    const date = typeof value.date === 'string' ? Date.parse(value.date) : NaN
    if (!Number.isFinite(date) || date > now || now - date >= CONSENT_MAX_AGE_MS) return null
    if (value.version !== COOKIE_CONSENT_VERSION || typeof value.analytics !== 'boolean' || typeof value.marketing !== 'boolean') return null
    return createConsent(value.analytics, value.marketing, value.date)
  } catch { return null }
}
export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const state = parseConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY))
    if (!state) window.localStorage.removeItem(COOKIE_CONSENT_KEY)
    return state
  } catch { return null }
}
export function readConsentLevel(): ConsentLevel | null {
  const state = readConsent()
  return !state ? null : state.analytics ? (state.marketing ? 'all' : 'analytics') : (state.marketing ? 'marketing' : 'necessary')
}
export function hasAnalyticsConsent(): boolean { return readConsent()?.analytics === true }
export function hasMarketingConsent(): boolean { return readConsent()?.marketing === true }
export function notifyConsentChanged(state: ConsentRecord): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: state }))
}

/** Remove known non-essential Google measurement cookies after consent is withdrawn. */
function clearCookies(pattern: RegExp): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const cookieNames = document.cookie
    .split(';')
    .map((entry) => entry.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name) => pattern.test(name))

  const host = window.location.hostname
  const parentDomain = host.endsWith('cykelhjalpen.se') ? '.cykelhjalpen.se' : null
  const domains = [null, host, parentDomain].filter((domain, index, values) => domain === null || values.indexOf(domain) === index)

  for (const name of cookieNames) {
    for (const domain of domains) {
      const domainAttribute = domain ? `; Domain=${domain}` : ''
      document.cookie = `${name}=; Max-Age=0; Path=/${domainAttribute}; SameSite=Lax`
    }
  }
}

export function clearAnalyticsCookies(): void { clearCookies(/^(_ga(?:_|$)|_gid$|_gat(?:_|$))/i) }
export function clearMarketingCookies(): void { clearCookies(/^(_gcl_|_gac_)/i) }
