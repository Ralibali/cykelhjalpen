import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, MapPin, MessageSquare, ShieldCheck, CheckCircle2, Wrench, Clock, Heart, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import heroImg from '@/assets/cykel-hero.jpg'
import TestimonialsCarousel from '@/components/cykelhjalpen/TestimonialsCarousel'

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
    <div className="min-h-screen flex flex-col bg-hero-gradient">
      <CykelNavbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-10 pb-24 md:pt-16 md:pb-32">
          {/* floating stickers */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-24 left-[6%] hidden md:block animate-float">
              <div className="rotate-[-8deg] sticker rounded-2xl bg-[hsl(var(--brand-sun))] px-4 py-2 font-mono-display text-xs font-semibold text-[hsl(var(--brand-dark))]">
                ✺ punktering? fixat.
              </div>
            </div>
            <div className="absolute bottom-32 right-[4%] hidden md:block animate-float" style={{ animationDelay: '1.5s' }}>
              <div className="rotate-[6deg] sticker rounded-2xl bg-[hsl(var(--accent))] px-4 py-2 font-mono-display text-xs font-semibold text-white">
                ⚙ växel-trubbel? fixat.
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 relative">
            {/* mono ticker */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3 mb-8 font-mono-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] animate-pulse" />
              <span>cykelhjälpen · linköping · est. 2026</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-teal))]" />
            </motion.div>

            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--brand-sun))]/30 border border-[hsl(var(--brand-sun))]/50 text-[hsl(var(--brand-dark))] text-xs font-mono-display font-semibold mb-6"
              >
                <MapPin className="h-3.5 w-3.5" />
                bara för cyklister i Linköping
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 }}
                className="font-display text-5xl md:text-7xl lg:text-8xl font-medium leading-[0.95] tracking-tight"
              >
                Trasig cykel?{' '}
                <span className="relative inline-block">
                  <span className="italic text-[hsl(var(--accent))]">Vi fixar det.</span>
                  <svg className="absolute -bottom-3 left-0 w-full" viewBox="0 0 300 12" preserveAspectRatio="none">
                    <path d="M2 8 Q 75 2, 150 6 T 298 5" stroke="hsl(var(--brand-sun))" strokeWidth="4" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                Beskriv vad som krånglar med din cykel. Anslutna verkstäder i Linköping skickar dig prisförslag inom timmar. <span className="text-foreground font-medium">Helt gratis. Inga förbindelser.</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button asChild size="lg" className="cta-playful text-base h-14 px-8 rounded-full shadow-brand">
                  <Link to="/skicka-arende">
                    Beskriv mitt cykelproblem
                    <span className="cta-icon cta-icon-arrow ml-2"><ArrowRight className="h-4 w-4" /></span>
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="cta-playful text-base h-14 px-8 rounded-full border-2 border-foreground/20 hover:bg-foreground hover:text-background">
                  <Link to="/sa-fungerar-det">Så fungerar det</Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-mono-display"
              >
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> 0 kr för dig</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> upp till 5 prisförslag</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> svar samma dag</span>
              </motion.div>
            </div>

            {/* Hero image */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-16 max-w-6xl mx-auto"
            >
              <div className="relative rounded-[2.5rem] overflow-hidden sticker">
                <img
                  src={heroImg}
                  alt="Cyklar parkerade på en kullerstensgata i Linköping i kvällsljus"
                  width={1920}
                  height={1080}
                  className="w-full h-auto block"
                />
                {/* overlay quote card */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm">
                  <div className="rounded-2xl bg-background/95 backdrop-blur-sm border-2 border-[hsl(var(--brand-dark))] p-4 sticker">
                    <div className="flex items-center gap-2 font-mono-display text-[10px] uppercase tracking-widest text-[hsl(var(--accent))] mb-2">
                      <Sparkles className="h-3 w-3" /> kund · vasastan
                    </div>
                    <p className="font-display text-base md:text-lg leading-snug">
                      "Punktering på elcykeln en måndag. Tre prisförslag innan lunch."
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="sa-fungerar-det" className="py-24 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mb-14">
              <div className="font-mono-display text-xs uppercase tracking-[0.2em] text-[hsl(var(--accent))] mb-3">// så fungerar det</div>
              <h2 className="font-display text-4xl md:text-6xl font-medium leading-[1]">
                Tre steg från <span className="italic text-[hsl(var(--brand-teal))]">trasig</span> till <span className="italic text-[hsl(var(--accent))]">åkbar</span>.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: Wrench, n: '01', title: 'Beskriv felet', desc: 'Berätta vilken cykel du har och vad som krånglar. Lägg gärna till en bild.', color: 'hsl(var(--brand-sun))' },
                { icon: MessageSquare, n: '02', title: 'Få prisförslag', desc: 'Anslutna verkstäder i Linköping skickar dig upp till fem prisförslag.', color: 'hsl(var(--accent))' },
                { icon: Heart, n: '03', title: 'Välj fritt', desc: 'Jämför pris, leveranstid och omdömen. Du bestämmer – inga förbindelser.', color: 'hsl(var(--brand-teal))' },
              ].map(({ icon: Icon, n, title, desc, color }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative rounded-3xl border-2 border-[hsl(var(--brand-dark))] bg-card p-7 hover:-translate-y-1 transition-transform sticker"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono-display text-sm font-semibold text-muted-foreground">{n}</span>
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 border-[hsl(var(--brand-dark))]"
                      style={{ backgroundColor: color }}
                    >
                      <Icon className="h-5 w-5 text-[hsl(var(--brand-dark))]" />
                    </div>
                  </div>
                  <h3 className="font-display text-2xl mb-2">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST BAND */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="relative rounded-[2rem] bg-[hsl(var(--brand-dark))] text-background p-8 md:p-14 overflow-hidden sticker">
              <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[hsl(var(--accent))]/30 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-[hsl(var(--brand-sun))]/20 blur-2xl" />
              <div className="relative grid md:grid-cols-3 gap-10 items-center">
                <div className="md:col-span-2">
                  <div className="font-mono-display text-xs uppercase tracking-[0.2em] text-[hsl(var(--brand-sun))] mb-3">// varför oss</div>
                  <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
                    Tryggt, lokalt, och <span className="italic text-[hsl(var(--brand-sun))]">noll kronor</span> för dig.
                  </h2>
                  <p className="mt-5 text-background/70 max-w-xl leading-relaxed">
                    Cykelhjälpen är gjort för dig som cyklar i Linköping. Du betalar aldrig något till oss. Verkstäderna betalar en liten avgift för att få lämna prisförslag – det är så vi håller det gratis åt dig.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { Icon: ShieldCheck, label: 'Endast godkända verkstäder' },
                    { Icon: Clock, label: 'Svar inom timmar, inte dagar' },
                    { Icon: Heart, label: 'Gratis & utan förbindelser' },
                  ].map(({ Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl bg-background/10 backdrop-blur-sm border-2 border-background/20 px-4 py-3 transition-transform hover:-translate-y-0.5 hover:translate-x-0.5">
                      <Icon className="h-5 w-5 text-[hsl(var(--brand-sun))]" />
                      <span className="text-sm text-background/90">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <TestimonialsCarousel />

        {/* FAQ */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <div className="font-mono-display text-xs uppercase tracking-[0.2em] text-[hsl(var(--accent))] mb-3">// vanliga frågor</div>
              <h2 className="font-display text-4xl md:text-5xl">Du undrar säkert.</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group rounded-2xl bg-card p-5 sticker">
                  <summary className="flex items-center justify-between cursor-pointer font-display text-lg">
                    {q}
                    <span className="text-[hsl(var(--accent))] group-open:rotate-45 transition-transform text-3xl leading-none font-light">+</span>
                  </summary>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto sticker rounded-[2rem] bg-card p-10 md:p-14 text-center">
              <h2 className="font-display text-4xl md:text-6xl leading-[1]">
                Redo att laga <span className="italic text-[hsl(var(--accent))]">cykeln</span>?
              </h2>
              <p className="mt-5 text-lg text-muted-foreground">
                Det tar mindre än två minuter. Få dina första prisförslag samma dag.
              </p>
              <Button asChild size="lg" className="cta-playful mt-10 text-base h-14 px-8 rounded-full shadow-brand">
                <Link to="/skicka-arende">
                  Beskriv mitt cykelproblem
                  <span className="cta-icon cta-icon-arrow ml-2"><ArrowRight className="h-4 w-4" /></span>
                </Link>
              </Button>
            </div>
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
