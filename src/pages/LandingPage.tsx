import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Shield, Star, Clock, Flame, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useEffect } from 'react'
import { setSEOMeta } from '@/lib/seoHelpers'

const trustItems = [
  { icon: Shield, text: 'Kvalitetssäkrade byråer' },
  { icon: Star, text: 'Verifierade omdömen' },
  { icon: Clock, text: 'Svar inom 24 timmar' },
  { icon: Users, text: 'Max fem byråer per uppdrag' },
]

const steps = [
  { num: '1', title: 'Beskriv ditt projekt', desc: 'Fyll i ett kort formulär med dina behov, budget och tidsram.' },
  { num: '2', title: 'Få offerter', desc: 'Kvalitetssäkrade byråer skickar offerter inom 24 timmar.' },
  { num: '3', title: 'Jämför & välj', desc: 'Jämför pris, kvalitet och omdömen – välj den byrå som passar bäst.' },
]

const LandingPage = () => {
  const [params] = useSearchParams()
  const category = params.get('kategori') || 'digitala tjänster'

  useEffect(() => {
    setSEOMeta({
      title: `Jämför offerter för ${category} – Gratis | Updro`,
      description: `Få upp till fem offerter från kvalitetssäkrade byråer inom ${category}. Helt gratis och utan förpliktelser. Svar inom 24 timmar.`,
      noindex: true,
    })
  }, [category])

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
                  <Flame className="h-3.5 w-3.5" />
                  100% gratis – inga förpliktelser
                </span>
              </motion.div>

              <motion.h1
                className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                Jämför offerter för{' '}
                <span className="text-brand-gradient">{category}</span>
              </motion.h1>

              <motion.p
                className="mt-5 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                Beskriv ditt projekt och få offerter från upp till fem kvalitetssäkrade byråer inom 24 timmar. Helt gratis.
              </motion.p>

              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Link to="/publicera">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl px-10 py-6 text-base font-semibold shadow-blue transition-all active:scale-[0.98]">
                    Kom igång – helt gratis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                {trustItems.map((item) => (
                  <span key={item.text} className="flex items-center gap-1.5">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.text}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-card border-y">
          <div className="container max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-10">
              Så fungerar det
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

        {/* Final CTA */}
        <section className="py-16 bg-primary/5 border-y">
          <div className="container max-w-2xl text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Redo att hitta rätt byrå?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Det tar bara två minuter att publicera ditt uppdrag. Helt gratis och utan förpliktelser.
            </p>
            <Link to="/publicera">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10 py-6 text-base font-semibold shadow-blue transition-all active:scale-[0.98]">
                Publicera ditt uppdrag nu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Gratis för beställare</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Svar inom 24 timmar</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> Ingen bindningstid</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default LandingPage
