import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const TURNSTILE_ERROR_MESSAGE = 'Säkerhetskontrollen kunde inte laddas. Ladda om sidan eller kontakta oss om problemet kvarstår.'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const timeout = window.setTimeout(() => {
      if (mounted && !siteKey) setError(TURNSTILE_ERROR_MESSAGE)
    }, 8000)

    supabase.functions.invoke('get-turnstile-key').then(({ data, error: fnError }) => {
      if (!mounted) return
      if (fnError || !data?.siteKey) {
        setError(TURNSTILE_ERROR_MESSAGE)
        return
      }
      setError(null)
      setSiteKey(data.siteKey)
    }).catch(() => {
      if (mounted) setError(TURNSTILE_ERROR_MESSAGE)
    }).finally(() => window.clearTimeout(timeout))

    return () => {
      mounted = false
      window.clearTimeout(timeout)
    }
  }, [siteKey])

  useEffect(() => {
    if (!siteKey || !ref.current) return
    let cancelled = false
    setError(null)
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          setError(null)
          onVerify(token)
        },
        'expired-callback': () => onExpire?.(),
        'error-callback': () => {
          setError('Säkerhetskontrollen misslyckades. Försök igen.')
          onExpire?.()
        },
        theme: 'auto',
      })
    }).catch(() => {
      if (!cancelled) setError(TURNSTILE_ERROR_MESSAGE)
    })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch {}
      }
    }
  }, [siteKey, onVerify, onExpire])

  if (error) return <div className="text-sm text-destructive" role="alert">{error}</div>
  if (!siteKey) return <div className="text-xs text-muted-foreground">Laddar säkerhetskontroll…</div>
  return <div ref={ref} />
}

export default Turnstile
