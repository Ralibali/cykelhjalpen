import { setAnalyticsConsent, cleanAnalyticsUrl } from '@/lib/ga4Runtime'
import { useState, useEffect, useRef } from 'react'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { COOKIE_CONSENT_KEY, clearAnalyticsCookies, clearMarketingCookies, notifyConsentChanged, readConsent, createConsent, type ConsentRecord } from '@/lib/analyticsConsent'
import { useT } from '@/lib/i18n'

const ADS_ID = 'AW-10941540384'
let adsConfigured = false

const applyConsent = (state: ConsentRecord) => {
  setAnalyticsConsent(state.analytics)
  window.dataLayer ||= []
  // Keep the documented Google command queue shared with the GA4 runtime.
  // eslint-disable-next-line prefer-rest-params
  window.gtag ||= function () { window.dataLayer!.push(arguments) }
  window.gtag('consent', 'update', {
    ad_storage: state.marketing ? 'granted' : 'denied',
    ad_user_data: state.marketing ? 'granted' : 'denied',
    ad_personalization: state.marketing ? 'granted' : 'denied',
  })
  if (!state.analytics) { clearAnalyticsCookies(); try { sessionStorage.removeItem('_sid') } catch { /* storage unavailable */ } }
  if (!state.marketing) {
    clearMarketingCookies()
    try { sessionStorage.removeItem('_cykel_attribution'); localStorage.removeItem('_cykel_attribution_first') } catch { /* storage unavailable */ }
  }
  if (state.marketing && !adsConfigured) {
    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`
      document.head.appendChild(script)
    }
    window.gtag('js', new Date())
    window.gtag('config', ADS_ID, { send_page_view: false, page_location: cleanAnalyticsUrl(window.location.href) || window.location.origin + '/internal' })
    adsConfigured = true
  }
  notifyConsentChanged(state)
}

const CookieConsent = () => {
  const t = useT()
  const [visible, setVisible] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const bannerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const restore = () => {
      const stored = readConsent()
      setAnalytics(stored?.analytics ?? false)
      setMarketing(stored?.marketing ?? false)
      applyConsent(stored ?? createConsent(false, false))
      setVisible(!stored)
    }
    restore()
    const onStorage = (event: StorageEvent) => { if (event.key === COOKIE_CONSENT_KEY || event.key === null) restore() }
    const openSettings = () => setVisible(true)
    window.addEventListener('storage', onStorage)
    window.addEventListener('cookie-settings:open', openSettings)
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('cookie-settings:open', openSettings) }
  }, [])

  useEffect(() => {
    if (!visible) { document.body.style.paddingBottom = ''; return }
    const apply = () => { const height = bannerRef.current?.getBoundingClientRect().height ?? 0; document.body.style.paddingBottom = height ? `${Math.ceil(height)}px` : '' }
    apply()
    const observer = new ResizeObserver(apply)
    if (bannerRef.current) observer.observe(bannerRef.current)
    window.addEventListener('resize', apply)
    return () => { observer.disconnect(); window.removeEventListener('resize', apply); document.body.style.paddingBottom = '' }
  }, [visible])

  const choose = (statistics: boolean, ads: boolean) => {
    const state = createConsent(statistics, ads)
    try { localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state)) } catch { /* Choice still applies to this page. */ }
    setAnalytics(statistics); setMarketing(ads); applyConsent(state); setVisible(false)
  }

  if (!visible) return <button type="button" onClick={() => setVisible(true)} className="cookie-preferences fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm" aria-label={t('Ändra cookieinställningar')}><Cookie className="h-3.5 w-3.5" />{t('Cookieinställningar')}</button>

  return <div ref={bannerRef} className="cookie-consent fixed bottom-0 inset-x-0 z-50 p-2 md:p-4" role="dialog" aria-labelledby="cookie-heading">
    <div className="max-w-3xl mx-auto bg-card border-2 border-foreground rounded-2xl shadow-lg p-3 md:p-6 flex flex-col gap-3">
      <h2 id="cookie-heading" className="font-display text-lg">{t('Dina cookieinställningar')}</h2>
      <p className="text-sm">{t('Nödvändig lagring används för tjänsten. Välj valfri statistik och marknadsföring separat. Du kan ändra ditt val när som helst.')}{' '}<Link to="/cookies" className="underline">{t('Cookiepolicy')}</Link>{' · '}<Link to="/integritetspolicy" className="underline">{t('Integritetspolicy')}</Link></p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} />{t('Statistik (Google Analytics)')}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />{t('Marknadsföring (Google Ads)')}</label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="min-h-11 rounded-xl" onClick={() => choose(false, false)}>{t('Endast nödvändiga')}</Button>
        <Button variant="outline" size="sm" className="min-h-11 rounded-xl" onClick={() => choose(true, true)}>{t('Tillåt alla')}</Button>
        <Button size="sm" className="min-h-11 rounded-xl" onClick={() => choose(analytics, marketing)}>{t('Spara mina val')}</Button>
      </div>
    </div>
  </div>
}
export default CookieConsent
