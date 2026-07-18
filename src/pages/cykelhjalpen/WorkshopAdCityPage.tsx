import { useMemo, useEffect, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import Reveal from '@/components/cykelhjalpen/Reveal'
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
import verkstadHero1200 from '@/assets/cykel-verkstad-hero-1200.webp'
import verkstadHero640 from '@/assets/cykel-verkstad-hero-640.webp'

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

  const steps = [
    { title: 'Anslut din verkstad', body: `Fyll i uppgifterna om din verkstad i ${city.name}. Vi granskar och godkänner inom ett dygn.` },
    { title: 'Få förfrågningar', body: 'Vi mejlar (och SMS:ar om du vill) så fort en cyklist i ditt område behöver hjälp.' },
    { title: 'Svara på det som passar', body: `Lämna offert med ett klick. Första tre leads är gratis, därefter ${LEAD_FEE_KR} kr per lead du väljer att svara på.` },
    { title: 'Ta jobbet', body: 'Kunden hör av sig direkt till dig – du fakturerar som vanligt, vi tar ingen provision.' },
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
          <Link to="/" className="font-display text-xl tracking-tight">Cykelhjälpen</Link>
          <Button asChild size="sm" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-5">
            <Link to={registerHref}>Anslut din verkstad</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-hero-gradient">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-semibold mb-6">
                <MapPin className="w-4 h-4" /> För cykelverkstäder i {city.name}
              </div>
              <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-5">
                Fyll kalendern med nya cykeljobb i {city.name}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
                Vi skickar kvalificerade kundförfrågningar direkt till din verkstad. Du väljer vilka du svarar på – betalar bara <strong className="text-foreground">{LEAD_FEE_KR} kr per lead</strong>. Ingen månadskostnad, ingen bindning.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-14 px-8 text-base shadow-brand">
                  <Link to={registerHref}>
                    Anslut din verkstad gratis <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full h-14 px-7 border-2">
                  <Link to="/for-cykelverkstader">Läs mer om upplägget</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-5">
                Tre gratis leads när du blir godkänd · Godkännande sker inom ett dygn
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="rounded-[2rem] overflow-hidden sticker bg-card">
                <img
                  src={verkstadHero1200}
                  srcSet={`${verkstadHero640} 640w, ${verkstadHero1200} 1200w`}
                  sizes="45vw"
                  alt="Cykelmekaniker i sin verkstad"
                  width={1200}
                  height={725}
                  className="w-full aspect-[4/3] object-cover"
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-5 left-6 sticker rounded-2xl bg-card px-5 py-4">
                <p className="font-display text-3xl leading-none">{LEAD_FEE_KR} kr</p>
                <p className="text-xs text-muted-foreground mt-1">per lead du själv väljer</p>
              </div>
            </motion.div>
          </div>

          {/* Trust stats – visas först när siffrorna är trovärdiga */}
          {stats && stats.workshops >= 3 && stats.requests >= 10 && (
            <div className="grid grid-cols-3 gap-3 md:gap-5 max-w-2xl mt-14">
              {[
                { label: 'Godkända verkstäder', value: stats.workshops },
                { label: 'Förfrågningar hittills', value: stats.requests },
                ...(openCount && openCount > 0 ? [{ label: `Öppna jobb i ${city.name}`, value: openCount }] : []),
              ].map((s) => (
                <div key={s.label} className="sticker rounded-2xl bg-card p-4 md:p-5">
                  <div className="font-display text-2xl md:text-3xl text-primary">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits grid */}
      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal>
            <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3 text-center">Fördelar</p>
            <h2 className="font-display text-3xl md:text-5xl text-center mb-3">Vad du vinner hos oss</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Cykelhjälpen är gjort för verkstäder som vill växa i {city.name} utan att lägga tid och pengar på marknadsföring.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={index * 0.06}>
                <div className="sticker rounded-3xl bg-card p-6 h-full hover:-translate-y-1 transition-transform">
                  <span className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </span>
                  <h3 className="font-display text-xl mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/40 py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal>
            <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3 text-center">Kom igång</p>
            <h2 className="font-display text-3xl md:text-5xl text-center mb-12">Så funkar det</h2>
          </Reveal>
          <ol className="relative space-y-6 before:absolute before:left-[27px] before:top-4 before:bottom-4 before:w-0.5 before:bg-border">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.1}>
                <li className="relative flex items-start gap-5">
                  <span className="relative z-10 shrink-0 w-14 h-14 rounded-2xl bg-primary text-primary-foreground font-display text-xl flex items-center justify-center border-2 border-foreground shadow-[3px_3px_0_hsl(var(--ink))]">
                    {index + 1}
                  </span>
                  <div className="sticker rounded-3xl bg-card p-5 flex-1">
                    <h3 className="font-display text-xl mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing card */}
      <section className="py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4">
          <Reveal>
            <div className="sticker rounded-[2rem] bg-[hsl(var(--brand-dark))] p-8 md:p-12 text-center text-background">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-1.5 text-sm font-semibold mb-5">
                <Sparkles className="w-4 h-4 text-[hsl(var(--brand-sun))]" /> Ingen bindning · Ingen månadskostnad
              </div>
              <div className="font-display text-6xl mb-2">{LEAD_FEE_KR} kr</div>
              <div className="text-background/70 mb-8">per lead du väljer att svara på</div>
              <ul className="text-left space-y-3 mb-9 max-w-sm mx-auto">
                {[
                  'Tre gratis leads när du blir godkänd',
                  `Bara kunder i ${city.name} och närområdet`,
                  'Full kontroll: du väljer vilka du svarar på',
                  'Ingen provision på jobbet du utför',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[hsl(var(--brand-sun))] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-14 px-10 w-full sm:w-auto text-base">
                <Link to={registerHref}>
                  Anslut din verkstad i {city.name} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </Reveal>
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
