import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, hasAnalyticsConsent } from '@/lib/analyticsConsent'
import { getNoindexSeoRoutes } from '@/lib/seoStatic'
import { getCurrentHost } from '@/lib/hostConfig'

const SESSION_ID_KEY = '_sid'
const ATTRIBUTION_KEY = '_cykel_attribution'
const ATTRIBUTION_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'] as const

type Attribution = Partial<Record<typeof ATTRIBUTION_PARAMS[number], string>> & {
  landing_path?: string
  first_referrer?: string
  captured_at?: string
}

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SESSION_ID_KEY, id)
  }
  return id
}

function getDeviceType(): string {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

export function sanitizeTrackingPath(pathname: string): string {
  if (/^\/mitt-arende\/[^/]+/i.test(pathname)) return '/mitt-arende/[redacted]'
  return (pathname || '/').slice(0, 1000)
}

function sanitizeReferrer(value: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.origin === window.location.origin) {
      return `${url.origin}${sanitizeTrackingPath(url.pathname)}`
    }
    return url.origin
  } catch {
    return undefined
  }
}

function readAttribution(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}') as Attribution
  } catch {
    sessionStorage.removeItem(ATTRIBUTION_KEY)
    return {}
  }
}

function captureAttribution(search: string, pathname: string): Attribution {
  const existing = readAttribution()
  if (Object.keys(existing).length > 0) return existing

  const params = new URLSearchParams(search)
  const attribution: Attribution = {
    landing_path: sanitizeTrackingPath(pathname),
    first_referrer: sanitizeReferrer(document.referrer),
    captured_at: new Date().toISOString(),
  }

  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) attribution[key] = value.slice(0, 300)
  }

  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  return attribution
}

function routeShouldRemainNoindex(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/'
  const host = getCurrentHost()
  const noindexPaths = new Set(getNoindexSeoRoutes(host).map((route) => route.path))
  const privatePrefixes = ['/admin', '/dashboard']
  const privateExact = ['/logga-in', '/registrera', '/registrera/byra', '/aterstall-losenord', '/landing', '/landing/byra']

  return noindexPaths.has(path)
    || privateExact.includes(path)
    || privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function usePageTracking() {
  const location = useLocation()
  const lastLocation = useRef('')
  const [analyticsEnabled, setAnalyticsEnabled] = useState(hasAnalyticsConsent)

  useEffect(() => {
    const updateConsent = () => {
      const enabled = hasAnalyticsConsent()
      setAnalyticsEnabled(enabled)
      if (!enabled) lastLocation.current = ''
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, updateConsent)
    const onStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY) updateConsent()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, updateConsent)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (!analyticsEnabled) return

    const pathname = location.pathname
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return

    const safePath = sanitizeTrackingPath(pathname)
    if (safePath === lastLocation.current) return
    lastLocation.current = safePath

    const sessionId = getSessionId()
    captureAttribution(location.search, pathname)

    supabase.from('page_views').insert({
      session_id: sessionId,
      path: safePath,
      referrer: sanitizeReferrer(document.referrer) || null,
      device_type: getDeviceType(),
    }).then(() => {})
  }, [analyticsEnabled, location.pathname, location.search])

  // Restore indexability only when leaving a route that is intentionally noindex.
  useEffect(() => {
    if (routeShouldRemainNoindex(location.pathname)) return

    const timer = window.setTimeout(() => {
      const robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
      if (robots?.content.replace(/\s/g, '').toLowerCase() === 'noindex,nofollow') {
        robots.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.pathname])
}

/** Track a conversion or meaningful interaction with first-touch attribution attached. */
export function trackClick(eventName: string, elementText?: string, metadata?: Record<string, unknown>) {
  if (!hasAnalyticsConsent()) return

  const sessionId = sessionStorage.getItem(SESSION_ID_KEY) || getSessionId()
  const attribution = readAttribution()

  supabase.from('click_events').insert({
    session_id: sessionId,
    event_name: eventName.slice(0, 120),
    element_text: elementText?.slice(0, 500) || null,
    path: sanitizeTrackingPath(window.location.pathname),
    metadata: {
      ...metadata,
      attribution,
    },
  }).then(() => {})
}
