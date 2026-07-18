import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Wrench, TrendingUp, Users, Bell, CheckCircle2, ArrowRight, MapPin } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import CykelOpenRequestsTeaser from '@/components/cykelhjalpen/CykelOpenRequestsTeaser'
import Reveal from '@/components/cykelhjalpen/Reveal'
import { Button } from '@/components/ui/button'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import { LEAD_FEE_KR } from '@/lib/pricing'
import { trackClick } from '@/hooks/usePageTracking'
import verkstadHero1200 from '@/assets/cykel-verkstad-hero-1200.webp'
import verkstadHero640 from '@/assets/cykel-verkstad-hero-640.webp'

const benefits = [
  { icon: Users, title: 'Lokala kunder', text: 'Ta emot relevanta förfrågningar från cyklister i den stad där ni arbetar.' },
  { icon: Bell, title: 'Notiser direkt', text: 'Få mejl och valfria SMS när ett godkänt ärende matchar er stad.' },
  { icon: TrendingUp, title: 'Fyll luckor i kalendern', text: 'Välj själv vilka jobb som passar er kapacitet, kompetens och säsong.' },
  { icon: Wrench, title: 'En enkel verkstadsvy', text: 'Hantera ärenden, offerter, betalningar och kontaktuppgifter på ett ställe.' },
]

const steps = [
  { title: 'Registrera verkstaden', text: 'Kostnadsfritt och utan bindningstid. Välj vilken stad ni arbetar i.' },
  { title: 'Vi granskar manuellt', text: 'Efter godkännande får ni tillgång till granskade ärenden i er stad.' },
  { title: 'Svara på de jobb ni vill', text: `Skriv pris och möjlig tid. ${LEAD_FEE_KR} kr exkl. moms debiteras via Stripe först när ni väljer att skicka.` },
  { title: 'Kunden hör av sig', text: 'De får prisförslaget och era kontaktuppgifter. Fortsatt bokning sker direkt med er.' },
]

const trackWorkshopCta = (placement: string) => {
  trackClick('workshop_acquisition_cta_clicked', 'Registrera verkstaden', { placement })
  const gtag = (window as any).gtag
  if (typeof gtag === 'function') gtag('event', 'workshop_registration_started', { placement })
}

const ForVerkstaderPage = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Få fler kunder till din cykelverkstad | Cykelhjälpen</title>
      <meta name="description" content="Anslut din cykelverkstad i Linköping, Norrköping, Uppsala eller Lund. Ingen månadsavgift, välj själv vilka lokala ärenden ni vill svara på." />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href="https://cykelhjalpen.se/for-cykelverkstader" />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="sv_SE" />
      <meta property="og:site_name" content="Cykelhjälpen" />
      <meta property="og:title" content="Få fler lokala kunder till din cykelverkstad" />
      <meta property="og:description" content="Ingen månadsavgift. Välj själv vilka lokala ärenden ni vill svara på." />
      <meta property="og:url" content="https://cykelhjalpen.se/for-cykelverkstader" />
      <meta property="og:image" content="https://cykelhjalpen.se/og/for-cykelverkstader.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>

    <CykelNavbar />
    <main>
      {/* Hero */}
      <section className="bg-hero-gradient">
        <div className="container mx-auto px-4 pt-14 pb-20 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-[1fr_.85fr] gap-10 items-center max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-6">
                <Wrench className="h-4 w-4" /> För cykelverkstäder
              </span>
              <h1 className="font-display text-4xl md:text-6xl tracking-tight mb-6">
                Få fler lokala cykelkunder – <span className="italic text-accent">utan månadsavgift</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
                Cykelhjälpen skickar relevanta, manuellt granskade ärenden från cyklister i er stad. Ni väljer själva om och när ni vill lämna offert.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="cta-playful rounded-full h-14 px-8 shadow-brand">
                  <Link to="/registrera/verkstad" onClick={() => trackWorkshopCta('hero')}>
                    Registrera verkstaden <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full h-14 px-8 border-2"><a href="#sa-fungerar-det">Så fungerar det</a></Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">Kostnadsfri registrering · Ingen bindningstid · Manuell granskning</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="rounded-[2rem] overflow-hidden sticker bg-card">
                <img
                  src={verkstadHero1200}
                  srcSet={`${verkstadHero640} 640w, ${verkstadHero1200} 1200w`}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  alt="Cykelmekaniker i sin verkstad med cyklar på väggen"
                  width={1200}
                  height={725}
                  className="w-full aspect-[4/3] object-cover"
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-5 left-4 right-4 sm:left-6 sm:right-auto sticker bg-card rounded-2xl px-5 py-4 flex items-center gap-4">
                <div>
                  <p className="font-display text-3xl leading-none">{LEAD_FEE_KR} kr</p>
                  <p className="text-xs text-muted-foreground mt-1">exkl. moms per skickad offert</p>
                </div>
                <div className="hidden sm:block w-px self-stretch bg-border" />
                <p className="hidden sm:block text-sm text-muted-foreground max-w-44">Ingen kostnad att se eller avstå från ett ärende.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <CykelOpenRequestsTeaser trackCta={trackWorkshopCta} />

      {/* Fördelar */}
      <section className="container mx-auto px-4 py-16 md:py-20 max-w-6xl">
        <Reveal>
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3 text-center">Fördelar</p>
          <h2 className="font-display text-3xl md:text-5xl text-center mb-12">Därför ansluter verkstäder sig</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-5">
          {benefits.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.08}>
              <div className="sticker rounded-3xl bg-card p-7 h-full hover:-translate-y-1 transition-transform">
                <span className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 mb-5">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </span>
                <h3 className="font-display text-2xl mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Steg-tidslinje */}
      <section id="sa-fungerar-det" className="bg-muted/40 py-16 md:py-20 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <Reveal>
            <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3 text-center">Kom igång</p>
            <h2 className="font-display text-3xl md:text-5xl text-center mb-12">Så fungerar det</h2>
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
                    <p className="text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Avslutande CTA */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <Reveal>
          <div className="sticker rounded-[2rem] bg-[hsl(var(--brand-dark))] p-8 md:p-14 max-w-3xl mx-auto text-center text-background">
            <span className="inline-flex items-center justify-center rounded-2xl bg-background/10 p-4 mb-6">
              <CheckCircle2 className="h-9 w-9 text-[hsl(var(--brand-sun))]" />
            </span>
            <h2 className="font-display text-3xl md:text-5xl mb-4">Redo att ta emot fler lokala ärenden?</h2>
            <p className="text-lg text-background/70 mb-8 max-w-xl mx-auto">Registreringen är kostnadsfri och ni bestämmer helt själva vilka jobb ni vill svara på.</p>
            <Button asChild size="lg" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full h-14 px-10 text-base">
              <Link to="/registrera/verkstad" onClick={() => trackWorkshopCta('bottom')}>
                Kom igång nu <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-5 text-sm text-background/60">Tillgängligt i {CYKEL_CITIES.map((city) => city.name).join(', ')}</p>
          </div>
        </Reveal>
      </section>
    </main>
    <CykelFooter />
  </div>
)

export default ForVerkstaderPage
