import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

function getSessionId() {
  let id = sessionStorage.getItem('_sid')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('_sid', id)
  }
  return id
}

function getDeviceType(): string {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export function usePageTracking() {
  const location = useLocation()
  const lastPath = useRef('')

  useEffect(() => {
    const path = location.pathname
    // Skip admin and dashboard routes from tracking
    if (path.startsWith('/admin') || path.startsWith('/dashboard')) return
    // Don't double-track same path
    if (path === lastPath.current) return
    lastPath.current = path

    const sessionId = getSessionId()
    supabase.from('page_views').insert({
      session_id: sessionId,
      path,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
    }).then(() => {})
  }, [location.pathname])
}

/** Track a click event. Call from onClick handlers on important CTAs. */
export function trackClick(eventName: string, elementText?: string, metadata?: Record<string, any>) {
  const sessionId = sessionStorage.getItem('_sid') || 'unknown'
  supabase.from('click_events').insert({
    session_id: sessionId,
    event_name: eventName,
    element_text: elementText || null,
    path: window.location.pathname,
    metadata: metadata || {},
  }).then(() => {})
}
