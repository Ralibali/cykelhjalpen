import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const COOKIE_KEY = 'updro_cookie_consent'
const GA_ID = 'G-C0XMZG0KDQ'
const ADS_ID = 'AW-10941540384'

type ConsentLevel = 'all' | 'necessary'

let gtagScriptInjected = false

const ensureDataLayer = () => {
  if (typeof window === 'undefined') return null
  ;(window as any).dataLayer = (window as any).dataLayer || []
  if (!(window as any).gtag) {
    ;(window as any).gtag = function gtag(){
      ;(window as any).dataLayer.push(arguments)
    }
  }
  return (window as any).gtag as (...args: any[]) => void
}

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
    gtag('config', GA_ID, { anonymize_ip: true })
    gtag('config', ADS_ID)
  } else {
    gtag('consent', 'update', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })
  }
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const gtag = ensureDataLayer()
    gtag?.('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500,
    })

    const raw = localStorage.getItem(COOKIE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { level?: ConsentLevel }
        if (parsed.level === 'all' || parsed.level === 'necessary') {
          applyConsent(parsed.level)
          return
        }
      } catch {
        localStorage.removeItem(COOKIE_KEY)
      }
    }

    setVisible(true)
  }, [])

  useEffect(() => {
    const openSettings = () => setVisible(true)
    window.addEventListener('updro:open-cookie-settings', openSettings)
    return () => window.removeEventListener('updro:open-cookie-settings', openSettings)
  }, [])

  const accept = (level: ConsentLevel) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({
      level,
      date: new Date().toISOString(),
      version: '2026-05-03',
    }))
    applyConsent(level)
    setVisible(false)
  }

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_KEY)
    applyConsent('necessary')
    setVisible(true)
  }

  if (!visible) {
    return (
      <button
        type="button"
        onClick={resetConsent}
        className="fixed bottom-3 left-3 z-40 rounded-full border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
        aria-label="Ändra cookieinställningar"
      >
        Cookieinställningar
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-3xl mx-auto bg-card border rounded-2xl shadow-lg p-5 flex flex-col gap-4">
        <div className="text-sm text-foreground/80">
          <p className="font-semibold text-foreground mb-1">🍪 Vi använder cookies</p>
          <p>
            Vi använder nödvändiga cookies för att webbplatsen och tjänsten ska fungera. Med ditt aktiva samtycke använder vi även Google Analytics och Google Ads för statistik, konverteringsmätning och förbättring av marknadsföring. Du kan neka utan att det påverkar grundläggande funktioner. Läs mer i vår{' '}
            <Link to="/integritetspolicy" className="text-primary hover:underline">integritetspolicy</Link> och{' '}
            <Link to="/cookies" className="text-primary hover:underline">cookiepolicy</Link>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => accept('necessary')}>
            Neka icke-nödvändiga
          </Button>
          <Button size="sm" className="rounded-xl bg-primary text-primary-foreground" onClick={() => accept('all')}>
            Acceptera statistik och marknadsföring
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
