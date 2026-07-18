import { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'
import {
  COOKIE_CONSENT_KEY,
  clearAnalyticsCookies,
  notifyConsentChanged,
  readConsentLevel,
  type ConsentLevel,
} from '@/lib/analyticsConsent'

const GA_ID = 'G-C0XMZG0KDQ'
const ADS_ID = 'AW-10941540384'

type Gtag = (...args: unknown[]) => void
type AnalyticsWindow = Window & {
  dataLayer?: unknown[][]
  gtag?: Gtag
}

let gtagScriptInjected = false

const ensureDataLayer = (): Gtag | null => {
  if (typeof window === 'undefined') return null

  const analyticsWindow = window as AnalyticsWindow
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || []
  if (!analyticsWindow.gtag) {
    analyticsWindow.gtag = (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args)
    }
  }
  return analyticsWindow.gtag
}

const safePath = (pathname: string) =>
  /^\/mitt-arende\/[^/]+/i.test(pathname) ? '/mitt-arende/[redacted]' : pathname

const safePageLocation = (pathname: string) =>
  `${window.location.origin}${safePath(pathname)}`

const injectGtagScript = () => {
  if (gtagScriptInjected || typeof document === 'undefined') return
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`)) {
    gtagScriptInjected = true
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
  gtagScriptInjected = true
}

const applyConsent = (level: ConsentLevel) => {
  const gtag = ensureDataLayer()
  if (!gtag) return

  if (level === 'all') {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
    injectGtagScript()
    gtag('js', new Date())
    // Automatic page views stay disabled so personal token URLs are never sent.
    gtag('config', GA_ID, { anonymize_ip: true, send_page_view: false })
    gtag('config', ADS_ID, { send_page_view: false })
  } else {
    gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
    clearAnalyticsCookies()
  }
}

const CookieConsent = () => {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [level, setLevel] = useState<ConsentLevel | null>(null)

  useEffect(() => {
    const gtag = ensureDataLayer()
    gtag?.('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    })

    const storedLevel = readConsentLevel()
    if (storedLevel) {
      setLevel(storedLevel)
      applyConsent(storedLevel)
    } else {
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COOKIE_CONSENT_KEY) return
      const nextLevel = readConsentLevel()
      setLevel(nextLevel)
      if (nextLevel) applyConsent(nextLevel)
      else {
        applyConsent('necessary')
        setVisible(true)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (level !== 'all') return
    const gtag = ensureDataLayer()
    const pathname = safePath(location.pathname)
    gtag?.('event', 'page_view', {
      page_location: safePageLocation(location.pathname),
      page_path: pathname,
      page_title: document.title,
    })
  }, [level, location.pathname])

  useEffect(() => {
    const openSettings = () => setVisible(true)
    window.addEventListener('cookie-settings:open', openSettings)
    return () => window.removeEventListener('cookie-settings:open', openSettings)
  }, [])

  const accept = (nextLevel: ConsentLevel) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      level: nextLevel,
      date: new Date().toISOString(),
      version: '2026-07-12',
    }))
    setLevel(nextLevel)
    applyConsent(nextLevel)
    notifyConsentChanged(nextLevel)
    setVisible(false)
  }

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur transition hover:border-foreground hover:text-foreground"
        aria-label="Ändra cookieinställningar"
      >
        <Cookie className="h-3.5 w-3.5" />
        Cookieinställningar
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="cookie-heading">
      <div className="max-w-3xl mx-auto bg-card border-2 border-foreground rounded-3xl shadow-[6px_6px_0_hsl(var(--ink))] p-5 md:p-6 flex flex-col gap-4">
        <div className="text-sm text-foreground/80">
          <p id="cookie-heading" className="font-display text-lg text-foreground mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-xl bg-muted p-1.5"><Cookie className="h-4 w-4 text-primary" /></span>
            Dina cookieinställningar
          </p>
          <p>
            Vi använder nödvändiga lagringsfunktioner för att webbplatsen och tjänsten ska fungera. Med ditt aktiva samtycke använder vi även Google Analytics, Google Ads och vår egen anonymiserade produktstatistik för att förbättra tjänsten och mäta marknadsföring. Du kan neka utan att grundfunktionerna påverkas. Läs mer i vår{' '}
            <Link to="/integritetspolicy" className="text-primary hover:underline">integritetspolicy</Link> och{' '}
            <Link to="/cookies" className="text-primary hover:underline">cookiepolicy</Link>.
          </p>
          {level && <p className="mt-2 text-xs text-muted-foreground">Nuvarande val: {level === 'all' ? 'statistik och marknadsföring tillåts' : 'endast nödvändiga funktioner'}.</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => accept('necessary')}>
            Endast nödvändiga
          </Button>
          <Button size="sm" className="rounded-xl bg-primary text-primary-foreground" onClick={() => accept('all')}>
            Tillåt statistik och marknadsföring
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
