import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const TURNSTILE_ERROR_MESSAGE = 'Säkerhetskontrollen kunde inte laddas. Kontrollera anslutningen och försök igen.'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

const loadScript = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)

    const handleLoad = () => {
      if (window.turnstile) resolve()
      else reject(new Error('turnstile-api-missing'))
    }
    const handleError = () => reject(new Error('turnstile-load-failed'))

    if (existing) {
      existing.addEventListener('load', handleLoad, { once: true })
      existing.addEventListener('error', handleError, { once: true })
      window.setTimeout(() => {
        if (window.turnstile) resolve()
        else reject(new Error('turnstile-api-timeout'))
      }, 5000)
      return
    }

    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  }).catch((error) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}

interface Props {
  onVerify: (token: string) => void
  onExpire?: () => void
  resetKey?: number
}

const Turnstile = ({ onVerify, onExpire, resetKey = 0 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    let mounted = true
    let resolved = false
    setError(null)

    const timeout = window.setTimeout(() => {
      if (mounted && !resolved) setError(TURNSTILE_ERROR_MESSAGE)
    }, 8000)

    supabase.functions.invoke('get-turnstile-key').then(({ data, error: functionError }) => {
      if (!mounted) return
      resolved = true
      if (functionError || !data?.siteKey) {
        setSiteKey(null)
        setError(TURNSTILE_ERROR_MESSAGE)
        return
      }
      setError(null)
      setSiteKey(data.siteKey)
    }).catch(() => {
      if (mounted) {
        setSiteKey(null)
        setError(TURNSTILE_ERROR_MESSAGE)
      }
    }).finally(() => window.clearTimeout(timeout))

    return () => {
      mounted = false
      window.clearTimeout(timeout)
    }
  }, [retryVersion])

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false
    setError(null)
    onExpireRef.current?.()

    const removeWidget = () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Widgeten kan redan ha tagits bort av Cloudflare.
        }
      }
      widgetIdRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ''
    }

    removeWidget()

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action: 'submit_bike_request',
        callback: (token: string) => {
          setError(null)
          onVerifyRef.current(token)
        },
        'expired-callback': () => onExpireRef.current?.(),
        'timeout-callback': () => onExpireRef.current?.(),
        'error-callback': () => {
          setError('Säkerhetskontrollen misslyckades. Försök igen.')
          onExpireRef.current?.()
        },
        theme: 'auto',
      })
    }).catch(() => {
      if (!cancelled) setError(TURNSTILE_ERROR_MESSAGE)
    })

    return () => {
      cancelled = true
      removeWidget()
    }
  }, [siteKey, resetKey, retryVersion])

  const retry = () => {
    setError(null)
    setSiteKey(null)
    onExpireRef.current?.()
    setRetryVersion((current) => current + 1)
  }

  return (
    <div className="space-y-2">
      {!siteKey && !error && (
        <div className="text-xs text-muted-foreground" aria-live="polite">Laddar säkerhetskontroll…</div>
      )}
      <div ref={containerRef} />
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3" role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-2 text-sm font-medium underline underline-offset-4"
          >
            Försök igen
          </button>
        </div>
      )}
    </div>
  )
}

export default Turnstile
