import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n'
import { supabase } from '@/integrations/supabase/client'

const TURNSTILE_ERROR_MESSAGE_SV = 'Säkerhetskontrollen kunde inte laddas. Stäng gärna av annonsblockerare för den här sidan eller prova en annan webbläsare, och försök sedan igen.'
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
    const script = existing || document.createElement('script')
    const cleanup = () => {
      window.clearTimeout(timeout)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
    const fail = (reason: string) => {
      cleanup()
      script.remove()
      reject(new Error(reason))
    }
    const handleLoad = () => {
      if (!window.turnstile) return fail('turnstile-api-missing')
      cleanup()
      resolve()
    }
    const handleError = () => fail('turnstile-load-failed')
    const timeout = window.setTimeout(() => {
      if (window.turnstile) handleLoad()
      else fail('turnstile-api-timeout')
    }, 12000)
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    if (!existing) {
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  }).catch((error) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}

interface Props {
  onVerify: (token: string) => void
  onExpire?: () => void
  onStatus?: (status: 'ready' | 'expired' | 'failed') => void
  resetKey?: number
  /**
   * Action-namn skickas till Cloudflare Turnstile och kontrolleras server-side
   * så att ett token utfärdat för ett formulär inte kan återanvändas i ett annat.
   */
  action?: string
}

const Turnstile = ({ onVerify, onExpire, onStatus, resetKey = 0, action = 'submit_bike_request' }: Props) => {
  const t = useT()
  const TURNSTILE_ERROR_MESSAGE = t(TURNSTILE_ERROR_MESSAGE_SV)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onVerifyRef = useRef(onVerify)
  const onExpireRef = useRef(onExpire)
  const onStatusRef = useRef(onStatus)
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
    onStatusRef.current = onStatus
  }, [onStatus])

  useEffect(() => {
    if (error) onStatusRef.current?.('failed')
  }, [error])

  useEffect(() => {
    let mounted = true
    let resolved = false
    setError(null)

    const timeout = window.setTimeout(() => {
      if (mounted && !resolved) setError(TURNSTILE_ERROR_MESSAGE)
    }, 12000)

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
  }, [retryVersion, TURNSTILE_ERROR_MESSAGE])

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
        action,
        callback: (token: string) => {
          if (cancelled) return
          onStatusRef.current?.('ready')
          setError(null)
          onVerifyRef.current(token)
        },
        'expired-callback': () => {
          if (cancelled) return
          onExpireRef.current?.()
          onStatusRef.current?.('expired')
        },
        'timeout-callback': () => {
          if (cancelled) return
          onExpireRef.current?.()
          onStatusRef.current?.('expired')
        },
        'error-callback': () => {
          if (cancelled) return
          setError(t('Säkerhetskontrollen misslyckades. Försök igen.'))
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
  }, [siteKey, resetKey, retryVersion, action, TURNSTILE_ERROR_MESSAGE, t])

  const retry = () => {
    setError(null)
    setSiteKey(null)
    onExpireRef.current?.()
    setRetryVersion((current) => current + 1)
  }

  return (
    <div className="space-y-2">
      {!siteKey && !error && (
        <div className="text-xs text-muted-foreground" aria-live="polite">{t('Laddar säkerhetskontroll…')}</div>
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
            {t('Försök igen')}
          </button>
        </div>
      )}
    </div>
  )
}

export default Turnstile
