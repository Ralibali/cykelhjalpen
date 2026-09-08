import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Wrench, Loader2, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { WorkshopTerms } from '@/components/legal/WorkshopTerms'
import Turnstile from '@/components/cykelhjalpen/Turnstile'
import { Helmet } from 'react-helmet-async'
import { formatKrFromOre, useV2Pricing, v2GrossOre } from '@/lib/v2/pricing'
import { trackWorkshopRegistration } from '@/lib/workshopRegistrationTracking'
import { hasAnalyticsConsent } from '@/lib/analyticsConsent'
import { trackEvent } from '@/lib/analytics'
import { trackAdsConversion } from '@/lib/googleAds'
import { SERVICE_CITIES, isCykelCity, resolveCykelCityParam, type CykelCityName } from '@/lib/cykelCities'
import { useT } from '@/lib/i18n'

const SERVICES_SV = ['Punktering', 'Bromsservice', 'Växelservice', 'Komplett service', 'Elcykelservice', 'Elsparkcykelservice', 'Hjulbygge', 'Mobil reparation']

const trackGoogleEvent = (eventName: string, parameters: Record<string, unknown> = {}) => {
  if (!hasAnalyticsConsent()) return
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag === 'function') gtag('event', eventName, parameters)
}

const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json()
      if (typeof payload?.error === 'string') return payload.error
    } catch {
      // Edge-funktionen returnerade inte JSON.
    }
  }
  return error instanceof Error ? error.message : fallback
}

const RegisterWorkshopPage = () => {
  const t = useT()
  // Canonical pricing (contract §2.1): consent text shows the charged fee.
  const pricing = useV2Pricing()
  const feeKr = formatKrFromOre(pricing.amountOre)
  const feeGrossKr = formatKrFromOre(v2GrossOre(pricing.amountOre, pricing.vatRate))
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cityParam = searchParams.get('stad')
  const initialCity = resolveCykelCityParam(cityParam) || ''
  const [loading, setLoading] = useState(false)
  const startedRef = useRef(false)
  const submittingRef = useRef(false)
  const invalidFields = useRef(new Set<string>())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    website: '',
    city: initialCity as CykelCityName | '',
    services: [] as string[],
    terms_accepted: false,
    dpa_accepted: false,
    marketing_accepted: false,
  })
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), [])
  const handleTurnstileStatus = useCallback((status: 'ready' | 'expired' | 'failed') => {
    trackWorkshopRegistration(`security_${status}`, form.city)
  }, [form.city])
  useEffect(() => {
    if (cityParam) {
      const match = SERVICE_CITIES.find((c) => c.name.toLowerCase() === cityParam.toLowerCase() || c.slug === cityParam.toLowerCase())
      if (match) setForm((current) => ({ ...current, city: match.name as CykelCityName }))
    }
  }, [cityParam])

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    if (!startedRef.current) {
      trackWorkshopRegistration('started', form.city)
      startedRef.current = true
    }
    setForm((current) => ({ ...current, [key]: value }))
    setSubmitError(null)
  }

  const validationError = (reason: string, message: string) => {
    trackWorkshopRegistration('validation_blocked', form.city, { reason })
    setSubmitError(message)
    toast.error(message)
  }

  const handleInvalid = (event: React.FormEvent<HTMLFormElement>) => {
    const field = event.target as HTMLInputElement
    const reason = ({ cn: 'company_name', em: 'email', pw: 'password', dpa: 'dpa' } as Record<string, string>)[field.id] || 'required_field'
    if (!invalidFields.current.has(reason)) {
      trackWorkshopRegistration('validation_blocked', form.city, { reason })
      invalidFields.current.add(reason)
    }
  }

  const missingRequirements = [
    !form.terms_accepted && t('godkänn plattformsavtalet'),
    !form.dpa_accepted && t('godkänn DPA'),
    !turnstileToken && t('slutför säkerhetskontrollen'),
  ].filter(Boolean)

  const toggleService = (service: string) => {
    update('services', form.services.includes(service) ? form.services.filter((current) => current !== service) : [...form.services, service])
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (submittingRef.current) return
    if (!form.terms_accepted) return validationError('terms', t('Du måste godkänna villkoren'))
    if (!form.dpa_accepted) return validationError('dpa', t('Du måste godkänna DPA'))
    if (!isCykelCity(form.city)) return validationError('city', t('Välj vilken stad ni arbetar i'))
    if (form.company_name.trim().length < 2) return validationError('company_name', t('Ange verkstadens namn'))
    if (form.password.length < 8) return validationError('password', t('Lösenordet måste vara minst åtta tecken'))
    if (!turnstileToken) return validationError('security', t('Bekräfta säkerhetskontrollen innan du registrerar verkstaden.'))

    submittingRef.current = true
    setLoading(true)
    setSubmitError(null)
    invalidFields.current.clear()
    let failureReason = 'network_or_unknown'
    trackWorkshopRegistration('submit_clicked', form.city, { services_count: form.services.length })

    try {
      const { data, error } = await supabase.functions.invoke('register-workshop', {
        body: {
          company_name: form.company_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || null,
          address: form.address || null,
          website: form.website || null,
          city: form.city,
          services: form.services,
          terms_accepted: form.terms_accepted,
          dpa_accepted: form.dpa_accepted,
          marketing_accepted: form.marketing_accepted,
          turnstile_token: turnstileToken,
        },
      })

      if (error) {
        const context = (error as { context?: Response }).context
        failureReason = context instanceof Response ? `http_${context.status}` : 'network_or_unknown'
        throw new Error(await getFunctionErrorMessage(error, t('Registreringen misslyckades')))
      }
      if (data?.error) {
        failureReason = 'server_rejected'
        throw new Error(data.error)
      }
      if (typeof data?.userId !== 'string' || !data.userId) {
        failureReason = 'invalid_response'
        throw new Error(t('Svaret kunde inte bekräftas. Försök logga in eller kontakta oss innan du registrerar dig igen.'))
      }

      trackWorkshopRegistration('completed', form.city, { services_count: form.services.length })
      try {
        if (hasAnalyticsConsent()) {
          trackGoogleEvent('sign_up', { method: 'workshop_registration', city: form.city })
          trackEvent('Workshop Signup Completed', { city: form.city, user_type: 'workshop' })
          trackAdsConversion('workshop_signup')
        }
      } catch {
        // A measurement error must not report an already created account as failed.
      }

      if (data?.session?.access_token && data?.session?.refresh_token) {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          if (sessionError) throw sessionError
        } catch {
          trackWorkshopRegistration('session_failed', form.city)
          navigate('/logga-in?registrerad=verkstad&steg=logga-in', { replace: true })
          return
        }
        trackWorkshopRegistration('session_ready', form.city)

        toast.success(t('Tack! {company} är registrerad i {city} och väntar på godkännande.', { company: form.company_name, city: form.city }))
        navigate('/dashboard/verkstad')
        return
      }

      trackWorkshopRegistration('confirmation_required', form.city)
      navigate('/logga-in?registrerad=verkstad', { replace: true })
    } catch (error) {
      trackWorkshopRegistration('failed', form.city, { reason: failureReason })
      // Vid backend-fel behöver Turnstile-token förnyas – det är single-use.
      setTurnstileToken(null)
      setTurnstileResetKey((current) => current + 1)
      const message = (error as Error)?.message || t('Registreringen misslyckades')
      setSubmitError(message)
      toast.error(message)
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('Registrera cykelverkstad | Cykelhjälpen')}</title>
        <meta name="description" content={t('Registrera din cykelverkstad i någon av våra öppna städer. Ingen månadsavgift – ni lämnar offert gratis och betalar först när kunden väljer er.')} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://cykelhjalpen.se/registrera/verkstad" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('Registrera cykelverkstad | Cykelhjälpen')} />
        <meta property="og:description" content={t('Kostnadsfri registrering. Lämna offert gratis och betala bara när kunden väljer er.')} />
        <meta property="og:url" content="https://cykelhjalpen.se/registrera/verkstad" />
        <meta property="og:image" content="https://cykelhjalpen.se/og/registrera-verkstad.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <CykelNavbar />
      <main className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="sticker bg-accent p-2"><Wrench className="h-5 w-5 text-accent-foreground" /></div>
          <h1 className="font-display text-3xl font-bold">{t('Anslut din verkstad')}</h1>
        </div>
        <p className="text-muted-foreground mb-5">
          {t('Skapa ett kostnadsfritt konto och få relevanta förfrågningar från cyklister i den stad där ni arbetar. Ni väljer själva vilka jobb ni vill svara på.')}
        </p>

        <div className="grid sm:grid-cols-3 gap-2 mb-8 text-sm">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('Ingen månadsavgift')}</div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('Välj ärenden själv')}</div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"><ShieldCheck className="h-4 w-4 text-primary shrink-0" /> {t('Manuell granskning')}</div>
        </div>

        <form onSubmit={submit} onInvalidCapture={handleInvalid} className="sticker rounded-3xl bg-card p-6 md:p-8 space-y-5">
          <div>
            <Label htmlFor="cn">{t('Verkstadens namn')}</Label>
            <Input id="cn" autoComplete="organization" required minLength={2} maxLength={160} value={form.company_name} onChange={(event) => update('company_name', event.target.value)} className="rounded-xl border-2" />
          </div>

          <div>
            <Label>{t('Vilken stad arbetar ni i?')}</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {SERVICE_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => update('city', city.name)}
                  aria-pressed={form.city === city.name}
                  className={`flex items-center gap-2 text-left px-4 py-3.5 rounded-2xl border-2 transition-all ${form.city === city.name ? 'border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--ink))]' : 'border-border hover:border-foreground'}`}
                >
                  <MapPin className="h-4 w-4" /> {city.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="em">{t('E-post')}</Label>
              <Input id="em" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} className="rounded-xl border-2" />
            </div>
            <div>
              <Label htmlFor="pw">{t('Lösenord')}</Label>
              <PasswordInput id="pw" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => update('password', event.target.value)} className="rounded-xl border-2" showLabel={t('Visa lösenord')} hideLabel={t('Dölj lösenord')} />
              <p className="text-xs text-muted-foreground mt-1">{t('Minst åtta tecken.')}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ph">{t('Telefon')} <span className="font-normal text-muted-foreground">({t('valfritt')})</span></Label>
              <Input id="ph" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className="rounded-xl border-2" />
            </div>
            <div>
              <Label htmlFor="ws">{t('Webbplats')} <span className="font-normal text-muted-foreground">({t('valfritt')})</span></Label>
              <Input id="ws" inputMode="url" autoComplete="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="verkstad.se" className="rounded-xl border-2" />
            </div>
          </div>

          <div>
            <Label htmlFor="ad">{form.city ? t('Adress i {city}', { city: form.city }) : t('Adress')} <span className="font-normal text-muted-foreground">({t('valfritt')})</span></Label>
            <Input id="ad" autoComplete="street-address" value={form.address} onChange={(event) => update('address', event.target.value)} className="rounded-xl border-2" />
          </div>

          <div>
            <Label>{t('Tjänster ni erbjuder')} <span className="font-normal text-muted-foreground">({t('valfritt')})</span></Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">{t('Det hjälper oss att skicka mer relevanta förfrågningar.')}</p>
            <div className="flex flex-wrap gap-2">
              {SERVICES_SV.map((service) => (
                <button key={service} type="button" onClick={() => toggleService(service)} aria-pressed={form.services.includes(service)} className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${form.services.includes(service) ? 'border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--ink))]' : 'border-border hover:border-foreground'}`}>
                  {t(service)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-5 border-t-2 border-dashed border-border">
            <WorkshopTerms accepted={form.terms_accepted} onAccept={(value) => update('terms_accepted', value)} />

            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input id="dpa" type="checkbox" checked={form.dpa_accepted} onChange={(event) => update('dpa_accepted', event.target.checked)} className="mt-1 h-4 w-4" required />
              <span className="text-muted-foreground leading-relaxed">
                {t('Jag godkänner')} <strong className="text-foreground">{t('databehandlingsavtalet (DPA)')}</strong> – {t('kunduppgifter får endast användas för att besvara förfrågan och raderas när ärendet är avslutat.')}
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={form.marketing_accepted} onChange={(event) => update('marketing_accepted', event.target.checked)} className="mt-1 h-4 w-4" />
              <span className="text-muted-foreground leading-relaxed">
                {t('Jag vill gärna få nyheter och erbjudanden från Cykelhjälpen via mejl')} <span className="text-xs">({t('valfritt')})</span>.
              </span>
            </label>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('Det är kostnadsfritt att svara på förfrågningar. Först när kunden väljer din verkstad debiteras {fee} kr exkl. moms ({feeGross} kr inkl. moms) via Stripe – eller så dras ett gratis-lead. Läs gärna även våra', { fee: feeKr, feeGross: feeGrossKr })}{' '}
              <Link to="/villkor" className="underline text-foreground" target="_blank">{t('allmänna villkor')}</Link> {t('och')}{' '}
              <Link to="/integritetspolicy" className="underline text-foreground" target="_blank">{t('integritetspolicy')}</Link>.
            </p>
          </div>

          <div>
            <Turnstile
              action="register_workshop"
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              onStatus={handleTurnstileStatus}
              resetKey={turnstileResetKey}
            />
          </div>

          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          {missingRequirements.length > 0 && (
            <p id="registration-requirements" aria-live="polite" className="text-sm text-muted-foreground">
              {t('För att fortsätta:')} {missingRequirements.join(', ')}.
            </p>
          )}
          <Button type="submit" aria-describedby={missingRequirements.length ? 'registration-requirements' : undefined} disabled={loading || !form.terms_accepted || !form.dpa_accepted || !turnstileToken} className="w-full cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-12 text-base">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? t('Skapar verkstad…') : t('Registrera verkstaden kostnadsfritt')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">{t('Har du redan ett konto?')} <Link to="/logga-in" className="underline">{t('Logga in')}</Link></p>
        </form>
      </main>
      <CykelFooter />
    </div>
  )
}

export default RegisterWorkshopPage
