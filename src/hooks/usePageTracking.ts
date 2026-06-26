import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

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
    id = crypto.randomUUID()
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
    landing_path: `${pathname}${search}`,
    first_referrer: document.referrer || undefined,
    captured_at: new Date().toISOString(),
  }

  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key)?.trim()
    if (value) attribution[key] = value.slice(0, 300)
  }

  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  return attribution
}

export function usePageTracking() {
  const location = useLocation()
  const lastLocation = useRef('')

  useEffect(() => {
    const pathname = location.pathname
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return

    const pathWithQuery = `${pathname}${location.search}`
    if (pathWithQuery === lastLocation.current) return
    lastLocation.current = pathWithQuery

    const sessionId = getSessionId()
    captureAttribution(location.search, pathname)

    supabase.from('page_views').insert({
      session_id: sessionId,
      path: pathWithQuery.slice(0, 1000),
      referrer: document.referrer || null,
      device_type: getDeviceType(),
    }).then(() => {})
  }, [location.pathname, location.search])
}

/** Track a conversion or meaningful interaction with first-touch attribution attached. */
export function trackClick(eventName: string, elementText?: string, metadata?: Record<string, unknown>) {
  const sessionId = sessionStorage.getItem(SESSION_ID_KEY) || getSessionId()
  const attribution = readAttribution()

  supabase.from('click_events').insert({
    session_id: sessionId,
    event_name: eventName,
    element_text: elementText || null,
    path: `${window.location.pathname}${window.location.search}`.slice(0, 1000),
    metadata: {
      ...metadata,
      attribution,
    },
  }).then(() => {})
}
