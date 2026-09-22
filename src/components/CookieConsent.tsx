import { setAnalyticsConsent, cleanAnalyticsUrl } from '@/lib/ga4Runtime'
import { useState, useEffect, useRef } from 'react'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  COOKIE_CONSENT_KEY,
  clearAnalyticsCookies,
  notifyConsentChanged,
  readConsentLevel,
  type ConsentLevel,
} from '@/lib/analyticsConsent'
import { useT } from '@/lib/i18n'

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

const injectGtagScript = () => {
  if (gtagScriptInjected || typeof document === 'undefined') return
  if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    gtagScriptInjected = true
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`
  document.head.appendChild(script)
  gtagScriptInjected = true
}

const applyConsent = (level: ConsentLevel) => {
  const gtag = ensureDataLayer()
  if (!gtag) return

  setAnalyticsConsent(level === 'all')
  if (level === 'all') {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    })
    injectGtagScript()
    gtag('config', ADS_ID, { send_page_view: false, page_location: cleanAnalyticsUrl(window.location.href) || window.location.origin + "/internal" })
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
  const t = useT()
  const [visible, setVisible] = useState(false)
  const [level, setLevel] = useState<ConsentLevel | null>(null)
  const bannerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
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
    const openSettings = () => setVisible(true)
    window.addEventListener('cookie-settings:open', openSettings)
    return () => window.removeEventListener('cookie-settings:open', openSettings)
  }, [])

  // Reserve space so the fixed banner never covers buttons/fields on small screens.
  useEffect(() => {
    if (!visible) {
      document.body.style.paddingBottom = ''
      return
    }
    const apply = () => {
      const height = bannerRef.current?.getBoundingClientRect().height ?? 0
      document.body.style.paddingBottom = height ? `${Math.ceil(height)}px` : ''
    }
    apply()
    const observer = new ResizeObserver(apply)
    if (bannerRef.current) observer.observe(bannerRef.current)
    window.addEventListener('resize', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
      document.body.style.paddingBottom = ''
    }
  }, [visible])

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
        aria-label={t('Ändra cookieinställningar')}
      >
        <Cookie className="h-3.5 w-3.5" />
        {t('Cookieinställningar')}
      </button>
    )
  }

  return (
    <div ref={bannerRef} className="fixed bottom-0 inset-x-0 z-50 p-2 md:p-4" role="dialog" aria-modal="true" aria-labelledby="cookie-heading">
      <div className="max-w-3xl mx-auto bg-card border-2 border-foreground rounded-2xl md:rounded-3xl shadow-[6px_6px_0_hsl(var(--ink))] p-3 md:p-6 flex flex-col gap-3 md:gap-4">
        <div className="text-sm text-foreground/80">
          <p id="cookie-heading" className="font-display text-base md:text-lg text-foreground mb-1 md:mb-1.5 flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-xl bg-muted p-1.5"><Cookie className="h-4 w-4 text-primary" /></span>
            {t('Dina cookieinställningar')}
          </p>
          <p className="hidden md:block">
            {t('Vi använder nödvändiga lagringsfunktioner för att webbplatsen och tjänsten ska fungera. Med ditt aktiva samtycke använder vi även Google Analytics, Google Ads och vår egen anonymiserade produktstatistik för att förbättra tjänsten och mäta marknadsföring. Du kan neka utan att grundfunktionerna påverkas. Läs mer i vår')}{' '}
            <Link to="/integritetspolicy" className="text-primary hover:underline">{t('integritetspolicy')}</Link>{' '}{t('och')}{' '}
            <Link to="/cookies" className="text-primary hover:underline">{t('cookiepolicy')}</Link>.
          </p>
          <p className="md:hidden text-xs">
            {t('Vi använder cookies för statistik och marknadsföring.')}{' '}
            <Link to="/cookies" className="text-primary underline">{t('cookiepolicy')}</Link>
          </p>
          {level && <p className="mt-2 hidden md:block text-xs text-muted-foreground">{t('Nuvarande val: {choice}.', { choice: level === 'all' ? t('statistik och marknadsföring tillåts') : t('endast nödvändiga funktioner') })}</p>}
        </div>
        <div className="flex flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none min-h-11 rounded-xl" onClick={() => accept('necessary')}>
            {t('Endast nödvändiga')}
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none min-h-11 rounded-xl bg-primary text-primary-foreground" onClick={() => accept('all')}>
            <span className="md:hidden">{t('Tillåt alla')}</span>
            <span className="hidden md:inline">{t('Tillåt statistik och marknadsföring')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
