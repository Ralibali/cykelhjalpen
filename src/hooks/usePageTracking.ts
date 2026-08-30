import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, hasAnalyticsConsent } from '@/lib/analyticsConsent'
import { getNoindexSeoRoutes } from '@/lib/seoStatic'
import { getCurrentHost } from '@/lib/hostConfig'
import { shouldNoindexPath } from '@/lib/seoRobots'
import {
  captureAttribution as captureAttributionPure,
  readAttribution as readAttributionPure,
  sanitizeReferrer,
  sanitizeTrackingPath,
  type Attribution,
} from '@/lib/attribution'

const SESSION_ID_KEY = '_sid'

export { sanitizeTrackingPath }
export type { Attribution }

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

function readAttribution(): Attribution {
  return readAttributionPure(sessionStorage, localStorage)
}

function captureAttribution(search: string, pathname: string): Attribution {
  return captureAttributionPure(
    {
      search,
      pathname,
      referrer: document.referrer,
      origin: window.location.origin,
    },
    sessionStorage,
    localStorage,
  )
}

function routeShouldRemainNoindex(pathname: string): boolean {
  const host = getCurrentHost()
  return shouldNoindexPath(pathname, getNoindexSeoRoutes(host).map((route) => route.path))
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
      referrer: sanitizeReferrer(document.referrer, window.location.origin) || null,
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
