export const COOKIE_CONSENT_KEY = 'cykelhjalpen_cookie_consent'
export const COOKIE_CONSENT_EVENT = 'cykelhjalpen:cookie-consent-changed'

export type ConsentLevel = 'all' | 'necessary'

type ConsentRecord = {
  level?: ConsentLevel
  date?: string
  version?: string
}

export function readConsentLevel(): ConsentLevel | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentRecord
    return parsed.level === 'all' || parsed.level === 'necessary' ? parsed.level : null
  } catch {
    window.localStorage.removeItem(COOKIE_CONSENT_KEY)
    return null
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsentLevel() === 'all'
}

export function notifyConsentChanged(level: ConsentLevel): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ConsentLevel>(COOKIE_CONSENT_EVENT, { detail: level }))
}

/** Remove known non-essential Google measurement cookies after consent is withdrawn. */
export function clearAnalyticsCookies(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const cookieNames = document.cookie
    .split(';')
    .map((entry) => entry.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name) => /^(_ga|_gid|_gat|_gcl_|_gac_)/i.test(name))

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
