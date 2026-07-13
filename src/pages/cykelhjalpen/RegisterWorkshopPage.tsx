import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wrench, Loader2, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import Turnstile from '@/components/cykelhjalpen/Turnstile'
import { Helmet } from 'react-helmet-async'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { trackClick } from '@/hooks/usePageTracking'
import { trackEvent } from '@/lib/analytics'
import { CYKEL_CITIES, DEFAULT_CYKEL_CITY, type CykelCityName } from '@/lib/cykelCities'

const SERVICES = ['Punktering', 'Bromsservice', 'Växelservice', 'Komplett service', 'Elcykelservice', 'Hjulbygge', 'Mobil reparation']

const trackGoogleEvent = (eventName: string, parameters: Record<string, unknown> = {}) => {
  const gtag = (window as any).gtag
  if (typeof gtag === 'function') gtag('event', eventName, parameters)
}

const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as any)?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json()
      if (typeof payload?.error === 'string') return payload.error
    } catch {
      // Edge-funktionen returnerade inte JSON.
    }
  }
  return (error as any)?.message || fallback
}

const RegisterWorkshopPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cityParam = searchParams.get('stad')
  const initialCity = (CYKEL_CITIES.find((c) => c.name.toLowerCase() === (cityParam || '').toLowerCase() || c.slug === (cityParam || '').toLowerCase())?.name || DEFAULT_CYKEL_CITY) as CykelCityName
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    website: '',
    city: initialCity,
    services: [] as string[],
    terms_accepted: false,
  })
  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), [])
  useEffect(() => {
    if (cityParam) {
      const match = CYKEL_CITIES.find((c) => c.name.toLowerCase() === cityParam.toLowerCase() || c.slug === cityParam.toLowerCase())
      if (match) setForm((current) => ({ ...current, city: match.name as CykelCityName }))
    }
  }, [cityParam])

  const update = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }))
  const toggleService = (service: string) => {
    update('services', form.services.includes(service) ? form.services.filter((current) => current !== service) : [...form.services, service])
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.terms_accepted) return toast.error('Du måste godkänna villkoren')
    if (form.company_name.trim().length < 2) return toast.error('Ange verkstadens namn')
    if (form.password.length < 8) return toast.error('Lösenordet måste vara minst åtta tecken')
    if (!turnstileToken) return toast.error('Bekräfta säkerhetskontrollen innan du registrerar verkstaden.')

    setLoading(true)
    trackClick('workshop_registration_submit_clicked', 'Skicka ansökan', { services_count: form.services.length, city: form.city })

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
          turnstile_token: turnstileToken,
        },
      })

      if (error) throw new Error(await getFunctionErrorMessage(error, 'Registreringen misslyckades'))
      if (data?.error) throw new Error(data.error)

      trackClick('workshop_registration_completed', 'Skicka ansökan', { services_count: form.services.length, city: form.city })
      trackGoogleEvent('sign_up', { method: 'workshop_registration', city: form.city })
      trackEvent('Workshop Signup Completed', { city: form.city, user_type: 'workshop' })


      if (data?.session?.access_token && data?.session?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        if (sessionError) throw sessionError

        toast.success(`Tack! ${form.company_name} är registrerad i ${form.city} och väntar på godkännande.`)
        navigate('/dashboard/verkstad')
        return
      }

      toast.success('Kontot är skapat. Bekräfta e-postadressen via länken vi skickat innan du loggar in.')
      navigate('/logga-in?registrerad=verkstad')
    } catch (error) {
      trackClick('workshop_registration_failed', 'Skicka ansökan', { city: form.city })
      // Vid backend-fel behöver Turnstile-token förnyas – det är single-use.
      setTurnstileToken(null)
      setTurnstileResetKey((current) => current + 1)
      toast.error((error as Error)?.message || 'Registreringen misslyckades')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Registrera cykelverkstad | Cykelhjälpen</title>
        <meta name="description" content="Registrera din cykelverkstad i Linköping, Norrköping, Uppsala eller Lund. Ingen månadsavgift och betalning endast när ni väljer att skicka en offert." />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href="https://cykelhjalpen.se/registrera/verkstad" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Registrera cykelverkstad | Cykelhjälpen" />
        <meta property="og:description" content="Kostnadsfri registrering. Betala bara när ni väljer att skicka en offert." />
        <meta property="og:url" content="https://cykelhjalpen.se/registrera/verkstad" />
        <meta property="og:image" content="https://cykelhjalpen.se/og/registrera-verkstad.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <CykelNavbar />
      <main className="container mx-auto px-4 py-10 md:py-14 max-w-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="sticker bg-accent p-2"><Wrench className="h-5 w-5 text-accent-foreground" /></div>
          <h1 className="font-display text-3xl font-bold">Anslut din verkstad</h1>
        </div>
        <p className="text-muted-foreground mb-5">
          Skapa ett kostnadsfritt konto och få relevanta förfrågningar från cyklister i den stad där ni arbetar. Ni väljer själva vilka jobb ni vill svara på.
        </p>

        <div className="grid sm:grid-cols-3 gap-2 mb-8 text-sm">
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Ingen månadsavgift</div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Välj ärenden själv</div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-3"><ShieldCheck className="h-4 w-4 text-primary shrink-0" /> Manuell granskning</div>
        </div>

        <form onSubmit={submit} className="sticker bg-card p-6 md:p-8 space-y-5">
          <div>
            <Label htmlFor="cn">Verkstadens namn</Label>
            <Input id="cn" autoComplete="organization" required value={form.company_name} onChange={(event) => update('company_name', event.target.value)} />
          </div>

          <div>
            <Label>Vilken stad arbetar ni i?</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {CYKEL_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => update('city', city.name)}
                  aria-pressed={form.city === city.name}
                  className={`flex items-center gap-2 text-left px-4 py-3 border-2 border-foreground rounded-md transition ${form.city === city.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <MapPin className="h-4 w-4" /> {city.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="em">E-post</Label>
              <Input id="em" type="email" inputMode="email" autoComplete="email" required value={form.email} onChange={(event) => update('email', event.target.value)} />
            </div>
            <div>
              <Label htmlFor="pw">Lösenord</Label>
              <Input id="pw" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(event) => update('password', event.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Minst åtta tecken.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ph">Telefon <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
              <Input id="ph" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
            </div>
            <div>
              <Label htmlFor="ws">Webbplats <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
              <Input id="ws" inputMode="url" autoComplete="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="verkstad.se" />
            </div>
          </div>

          <div>
            <Label htmlFor="ad">Adress i {form.city} <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <Input id="ad" autoComplete="street-address" value={form.address} onChange={(event) => update('address', event.target.value)} />
          </div>

          <div>
            <Label>Tjänster ni erbjuder <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">Det hjälper oss att skicka mer relevanta förfrågningar.</p>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((service) => (
                <button key={service} type="button" onClick={() => toggleService(service)} aria-pressed={form.services.includes(service)} className={`px-3 py-2 rounded-full border-2 border-foreground text-sm transition ${form.services.includes(service) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {service}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm cursor-pointer pt-4 border-t">
            <input type="checkbox" checked={form.terms_accepted} onChange={(event) => update('terms_accepted', event.target.checked)} className="mt-1 h-4 w-4" required />
            <span className="text-muted-foreground leading-relaxed">
              Jag godkänner <Link to="/villkor" className="underline text-foreground" target="_blank">allmänna villkor</Link> och <Link to="/integritetspolicy" className="underline text-foreground" target="_blank">integritetspolicy</Link>. Jag förstår att <strong className="text-foreground">{LEAD_FEE_KR} kr exkl. moms (62,50 kr inkl. moms)</strong> debiteras via Stripe först när jag väljer att skicka en offert.
            </span>
          </label>

          <div>
            <Turnstile
              action="register_workshop"
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              resetKey={turnstileResetKey}
            />
          </div>

          <Button type="submit" disabled={loading || !form.terms_accepted || !turnstileToken} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Skapar verkstad…' : 'Registrera verkstaden kostnadsfritt'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">Har du redan ett konto? <Link to="/logga-in" className="underline">Logga in</Link></p>
        </form>
      </main>
      <CykelFooter />
    </div>
  )
}

export default RegisterWorkshopPage
