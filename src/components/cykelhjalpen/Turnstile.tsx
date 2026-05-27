import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

let scriptPromise: Promise<void> | null = null
const loadScript = () => {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    if (window.turnstile) return resolve()
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('turnstile-load-failed'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

interface Props {
  onVerify: (token: string) => void
  onExpire?: () => void
}

const Turnstile = ({ onVerify, onExpire }: Props) => {
  const ref = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [siteKey, setSiteKey] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    supabase.functions.invoke('get-turnstile-key').then(({ data }) => {
      if (mounted && data?.siteKey) setSiteKey(data.siteKey)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!siteKey || !ref.current) return
    let cancelled = false
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onExpire?.(),
        'error-callback': () => onExpire?.(),
        theme: 'auto',
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
      }
    }
  }, [siteKey, onVerify, onExpire])

  if (!siteKey) return <div className="text-xs text-muted-foreground">Laddar säkerhetskontroll…</div>
  return <div ref={ref} />
}

export default Turnstile
