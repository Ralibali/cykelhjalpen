import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Gift, Shield, Star, TrendingUp, Users, Zap, CreditCard, MessageCircle, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useEffect } from 'react'
import { setSEOMeta } from '@/lib/seoHelpers'
import { TRIAL_LEADS, TRIAL_DAYS } from '@/lib/constants'
import { numWord } from '@/lib/numberWords'

const stats = [
  { value: '500+', label: 'Aktiva beställare' },
  { value: '24h', label: 'Genomsnittlig svarstid' },
  { value: '87%', label: 'Match-rate' },
  { value: '4.8/5', label: 'Betyg från byråer' },
]

const benefits = [
  { icon: Gift, title: `${numWord(TRIAL_LEADS)} gratis leads`, desc: 'Starta utan kostnad – dina första leads är helt gratis.' },
  { icon: Shield, title: 'Kvalificerade uppdrag', desc: 'Alla projekt verifieras innan de publiceras till byråer.' },
  { icon: TrendingUp, title: 'Öka din omsättning', desc: 'Få en stadig ström av nya kunder utan att jaga dem.' },
  { icon: Users, title: 'Max fem byråer per uppdrag', desc: 'Begränsad konkurrens – du slipper tävla mot 50 andra.' },
  { icon: MessageCircle, title: 'Inbyggd chatt', desc: 'Kommunicera direkt med beställare via plattformen.' },
  { icon: BarChart3, title: 'Dashboard & statistik', desc: 'Följ dina leads, offerter och konverteringar i realtid.' },
]

const steps = [
  { num: '1', title: 'Skapa konto gratis', desc: 'Registrera din byrå på under två minuter. Inga kortuppgifter.' },
  { num: '2', title: 'Bläddra bland uppdrag', desc: 'Se nya projekt som matchar dina tjänster och din region.' },
  { num: '3', title: 'Skicka offert & vinn kunder', desc: 'Lås upp leads du vill ha och skicka din offert direkt.' },
]

const testimonials = [
  {
    quote: 'Vi fick vår första kund via Updro redan dag tre. Äntligen en plattform där beställarna faktiskt svarar!',
    name: 'Fredrik L.',
    role: 'VD, Webbninja AB',
  },
  {
    quote: 'Updro har blivit vår viktigaste kanal för nya kunder. ROI:n är fantastisk jämfört med att köpa leads på andra plattformar.',
    name: 'Sara K.',
    role: 'Ägare, Pixelkraft',
  },
]

const SupplierLandingPage = () => {
  const [params] = useSearchParams()
  const utm = params.get('utm_campaign') || ''

  useEffect(() => {
    setSEOMeta({
      title: 'Få fler kunder till din byrå – Prova Updro gratis',
      description: `Registrera din byrå och få ${numWord(TRIAL_LEADS)} gratis leads. Kvalificerade uppdrag, inbyggd chatt och max fem byråer per projekt. Starta gratis.`,
      noindex: true,
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-background">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />

          <div className="container relative z-10 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
                  <Zap className="h-3.5 w-3.5" />
                  {TRIAL_LEADS} gratis leads – inget kreditkort krävs
                </span>
              </motion.div>

              <motion.h1
                className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                Få fler kunder till{' '}
                <span className="text-brand-gradient">din byrå</span>
              </motion.h1>

              <motion.p
                className="mt-5 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                Anslut din byrå till Updro och få tillgång till kvalificerade uppdrag från företag som aktivt söker dina tjänster.
              </motion.p>

              <motion.div
                className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Link to="/registrera/byra">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl px-10 py-6 text-base font-semibold shadow-blue transition-all active:scale-[0.98]">
                    Skapa konto gratis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>

              <motion.p
                className="mt-4 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                🔒 Ingen bindningstid · Inga kortuppgifter · Avbryt när som helst
              </motion.p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-card">
          <div className="container py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-20">
          <div className="container max-w-5xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-4">
              Varför byråer väljer Updro
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
              Sluta jaga kunder – låt dem komma till dig.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="rounded-xl bg-primary/10 w-10 h-10 flex items-center justify-center mb-4">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-card border-y">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
              Kom igång på tre steg
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.num} className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary font-display font-bold text-xl flex items-center justify-center mb-4">
                    {step.num}
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
              Vad byråer säger
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((t) => (
                <div key={t.name} className="rounded-2xl border bg-card p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-foreground/90 italic mb-4">"{t.quote}"</blockquote>
                  <p className="text-sm text-muted-foreground">— {t.name}, {t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing hint */}
        <section className="py-16 bg-primary/5 border-y">
          <div className="container max-w-2xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Starta gratis – betala bara för leads du vill ha
            </h2>
            <p className="text-muted-foreground mb-4 text-lg">
              Du betalar aldrig för att visa ditt företag. Köp lead-krediter när du hittar ett uppdrag som passar – från 119 kr per lead (öppningserbjudande).
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> {TRIAL_LEADS} gratis leads vid start</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> {TRIAL_DAYS} dagars provperiod</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Ingen bindningstid</span>
            </div>
            <Link to="/registrera/byra">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10 py-6 text-base font-semibold shadow-blue transition-all active:scale-[0.98]">
                Skapa byråkonto gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <CreditCard className="h-3.5 w-3.5" /> Inget kreditkort krävs
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default SupplierLandingPage
