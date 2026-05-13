import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, MapPin, MessageSquare, ShieldCheck, CheckCircle2, Wrench, Clock, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Helmet } from 'react-helmet-async'

const FAQS = [
  {
    q: 'Vad kostar det att skicka in en förfrågan?',
    a: 'Det är helt gratis för dig som cyklar. Du betalar inget och förbinder dig inte till något. Du väljer själv om du vill anlita någon av verkstäderna som svarar.',
  },
  {
    q: 'Hur snabbt får jag svar?',
    a: 'De flesta ärenden får sitt första prisförslag inom några timmar på vardagar. Du får upp till fem prisförslag från olika verkstäder.',
  },
  {
    q: 'Vilka cyklar kan ni hjälpa med?',
    a: 'Standardcyklar, elcyklar, mountainbike, racercykel, barncykel och lådcykel. Beskriv din cykel i formuläret så matchar vi mot rätt verkstad.',
  },
  {
    q: 'Måste jag lämna in cykeln själv?',
    a: 'Nej. En del verkstäder erbjuder hämtning. Markera "Jag vill ha hämtning" i formuläret så får du svar från verkstäder som kör hem till dig.',
  },
  {
    q: 'Hur väljs cykelverkstäderna ut?',
    a: 'Endast godkända verkstäder i Linköping får svara. Vi kontrollerar att de är seriösa innan de släpps in.',
  },
]

const CykelhjalpenIndex = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Cykelhjälpen – Få prisförslag från cykelverkstäder i Linköping</title>
        <meta name="description" content="Beskriv felet på din cykel och få upp till fem prisförslag från lokala cykelverkstäder i Linköping. Helt gratis och utan förbindelse." />
        <link rel="canonical" href="/" />
      </Helmet>

      <CykelNavbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <MapPin className="h-4 w-4" />
                Linköping
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Få prisförslag från <span className="text-primary">cykelverkstäder</span> i Linköping
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-lg">
                Beskriv vad som är fel med din cykel. Vi skickar din förfrågan till anslutna cykelverkstäder i Linköping. Du får prisförslag och väljer själv om du vill gå vidare.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="text-base">
                  <Link to="/skicka-arende">
                    Beskriv ditt cykelproblem <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link to="/sa-fungerar-det">Så fungerar det</Link>
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Helt gratis</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Inga förbindelser</span>
                <span className="inline-flex items-center gap-1.5 hidden sm:inline-flex"><CheckCircle2 className="h-4 w-4 text-primary" /> Lokala verkstäder</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 p-8 flex flex-col justify-between border border-border/50 shadow-xl">
                <div>
                  <Bike className="h-12 w-12 text-primary" />
                  <p className="mt-6 font-display text-2xl font-semibold leading-tight">
                    "Punktering på elcykeln. Fick tre prisförslag samma dag."
                  </p>
                  <p className="mt-3 text-muted-foreground">— Anna, Vasastan</p>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
                  <div>
                    <div className="font-display text-2xl font-bold">tre</div>
                    <div className="text-xs text-muted-foreground">prisförslag</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold">fyra</div>
                    <div className="text-xs text-muted-foreground">timmar</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold">noll</div>
                    <div className="text-xs text-muted-foreground">kronor</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="sa-fungerar-det" className="py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold">Så fungerar det</h2>
              <p className="mt-4 text-muted-foreground">Tre enkla steg från trasig cykel till åkbar cykel.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Wrench, n: 'Ett', title: 'Beskriv felet på din cykel', desc: 'Berätta vilken cykel du har och vad som krånglar. Lägg gärna till en bild.' },
                { icon: MessageSquare, n: 'Två', title: 'Lokala verkstäder svarar med prisförslag', desc: 'Anslutna verkstäder i Linköping skickar dig prisförslag inom kort.' },
                { icon: Heart, n: 'Tre', title: 'Du väljer själv vem du vill anlita', desc: 'Jämför pris, leveranstid och omdömen. Inga förbindelser.' },
              ].map(({ icon: Icon, n, title, desc }) => (
                <div key={title} className="rounded-2xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">{n}</div>
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-8 md:p-12 grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <h2 className="font-display text-3xl md:text-4xl font-bold">Tryggt, lokalt och gratis för dig</h2>
                <p className="mt-4 text-muted-foreground max-w-xl">
                  Cykelhjälpen är gjort för dig som cyklar i Linköping. Du betalar aldrig något till oss – det är verkstäderna som betalar för att få svara på din förfrågan.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground">Godkända verkstäder</div>
                </div>
                <div>
                  <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground">Snabba svar</div>
                </div>
                <div>
                  <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-xs text-muted-foreground">Gratis för dig</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">Vanliga frågor</h2>
            <div className="space-y-4">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group rounded-xl border border-border bg-card p-5">
                  <summary className="flex items-center justify-between cursor-pointer font-display font-semibold">
                    {q}
                    <span className="text-primary group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Redo att laga cykeln?</h2>
            <p className="mt-4 text-muted-foreground">
              Det tar mindre än två minuter att beskriva felet. Få dina första prisförslag samma dag.
            </p>
            <Button asChild size="lg" className="mt-8 text-base">
              <Link to="/skicka-arende">Beskriv ditt cykelproblem <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <CykelFooter />

      {/* JSON-LD: FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />
    </div>
  )
}

export default CykelhjalpenIndex
