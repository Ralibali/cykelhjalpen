import { useMemo, useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import { LEAD_FEE_KR } from '@/lib/pricing'
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  MapPin,
  BadgeCheck,
  Sparkles,
  Wrench,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

type Stats = { workshops: number; requests: number; responses: number }

const WorkshopAdCityPage = () => {
  const { citySlug } = useParams<{ citySlug: string }>()
  const city = useMemo(() => CYKEL_CITIES.find((c) => c.slug === citySlug), [citySlug])
  const [stats, setStats] = useState<Stats | null>(null)
  const [openCount, setOpenCount] = useState<number | null>(null)

  useEffect(() => {
    supabase.rpc('get_cykel_public_stats').then(({ data }) => {
      if (data) setStats(data as unknown as Stats)
    })
    supabase.rpc('get_cykel_open_requests_teaser').then(({ data }) => {
      if (Array.isArray(data) && city) {
        setOpenCount(data.filter((r: { city: string }) => r.city === city.name).length)
      }
    })
  }, [city])

  if (!city) return <Navigate to="/" replace />

  const registerHref = `/registrera/verkstad?stad=${encodeURIComponent(city.name)}&utm_source=google&utm_medium=cpc&utm_campaign=verkstad-${city.slug}`
  const pageTitle = `Cykelverkstad i ${city.name}? Få nya kunder via Cykelhjälpen`
  const pageDesc = `Anslut din verkstad i ${city.name} till Cykelhjälpen. Få kvalificerade leads direkt i inboxen – du betalar bara ${LEAD_FEE_KR} kr per lead du väljer att svara på. Ingen månadskostnad, ingen bindning.`
  const canonical = `https://cykelhjalpen.se/annons/verkstad/${city.slug}`

  const benefits = [
    { icon: Sparkles, title: 'Tre gratis leads', body: 'Du får testa tre kundförfrågningar utan kostnad när du är godkänd. Fungerar det – fortsätt. Passar det inte – ingen bindning.' },
    { icon: Wrench, title: `Kunder i ${city.name}`, body: `Vi visar dig bara förfrågningar från cyklister i ${city.name} och närområdet. Ingen tid slösas på fel jobb.` },
    { icon: Clock, title: 'Svara på tio sekunder', body: 'Ring, mejla eller lämna en offert direkt från dashboarden. Kunden ser ditt svar med logotyp och recensioner.' },
    { icon: TrendingUp, title: `Bara ${LEAD_FEE_KR} kr per lead`, body: 'Ingen månadskostnad. Ingen provision. Du betalar bara för de leads du faktiskt vill jobba med.' },
    { icon: ShieldCheck, title: 'Kvalitetsgranskade förfrågningar', body: 'Varje förfrågan granskas av oss innan den skickas till dig – inga botar, inga skämt, bara riktiga cyklister som behöver hjälp.' },
    { icon: BadgeCheck, title: 'Bli synlig i sökningar', body: `Godkända verkstäder listas på våra stadssidor som rankar högt för sökningar som "cykelreparation ${city.name}".` },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
      </Helmet>

      {/* Minimal top bar */}
      <header className="border-b bg-background/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">Cykelhjälpen</Link>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to={registerHref}>Anslut din verkstad</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-5">
            <MapPin className="w-3.5 h-3.5" /> För cykelverkstäder i {city.name}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 max-w-3xl mx-auto">
            Fyll kalendern med nya cykeljobb i {city.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Vi skickar kvalificerade kundförfrågningar direkt till din verkstad. Du väljer vilka du svarar på – betalar bara <strong>{LEAD_FEE_KR} kr per lead</strong>, ingen månadskostnad, ingen bindning.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base font-semibold">
              <Link to={registerHref}>
                Anslut din verkstad gratis <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6">
              <Link to="/for-cykelverkstader">Läs mer om upplägget</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-5">
            Tre gratis leads när du blir godkänd · Godkännande sker inom ett dygn
          </p>

          {/* Trust stats */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto mt-12">
            {[
              { label: 'Godkända verkstäder', value: stats?.workshops ?? '—' },
              { label: 'Förfrågningar hittills', value: stats?.requests ?? '—' },
              { label: `Öppna jobb i ${city.name}`, value: openCount ?? '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4">
                <div className="text-2xl md:text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Vad du vinner hos oss</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Cykelhjälpen är gjort för verkstäder som vill växa i {city.name} utan att lägga tid och pengar på marknadsföring.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border bg-card p-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/40 py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Så funkar det</h2>
          <ol className="space-y-6">
            {[
              { n: '1', title: 'Anslut din verkstad', body: `Fyll i uppgifterna om din verkstad i ${city.name}. Vi granskar och godkänner inom ett dygn.` },
              { n: '2', title: 'Få förfrågningar', body: 'Vi mejlar (och SMS:ar om du vill) så fort en cyklist i ditt område behöver hjälp.' },
              { n: '3', title: 'Svara på det som passar', body: `Lämna offert med ett klick. Första tre leads är gratis, därefter ${LEAD_FEE_KR} kr per lead du väljer att svara på.` },
              { n: '4', title: 'Ta jobbet', body: 'Kunden hör av sig direkt till dig – du fakturerar som vanligt, vi tar ingen provision.' },
            ].map((step) => (
              <li key={step.n} className="flex gap-4 items-start">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{step.n}</div>
                <div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing card */}
      <section className="py-14 md:py-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="rounded-2xl border-2 border-primary bg-card p-8 md:p-10 text-center shadow-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Ingen bindning · Ingen månadskostnad
            </div>
            <div className="text-5xl font-bold mb-2">{LEAD_FEE_KR} kr</div>
            <div className="text-muted-foreground mb-6">per lead du väljer att svara på</div>
            <ul className="text-left space-y-2 mb-8 max-w-sm mx-auto">
              {[
                'Tre gratis leads när du blir godkänd',
                `Bara kunder i ${city.name} och närområdet`,
                'Full kontroll: du väljer vilka du svarar på',
                'Ingen provision på jobbet du utför',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 w-full sm:w-auto text-base font-semibold">
              <Link to={registerHref}>
                Anslut din verkstad i {city.name} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Bottom bar */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>© {new Date().getFullYear()} Cykelhjälpen</span>
          <span>
            <Link to="/integritetspolicy" className="hover:underline">Integritetspolicy</Link>
            {' · '}
            <Link to="/villkor" className="hover:underline">Villkor</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default WorkshopAdCityPage
