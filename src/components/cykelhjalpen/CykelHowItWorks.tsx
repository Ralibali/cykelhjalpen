import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, CircleDot, Cog, Heart, MessageSquare, Settings2, Wrench, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackClick } from '@/hooks/usePageTracking'
import { useT } from '@/lib/i18n'

const CykelHowItWorks = () => {
  const t = useT()
  const steps = [
    { icon: Wrench, title: t('Beskriv cykeln'), text: t('Välj stad, cykeltyp och problem. Lägg gärna till bilder.') },
    { icon: MessageSquare, title: t('Ta emot prisförslag'), text: t('Godkända verkstäder i den valda staden kan svara med pris och möjlig tid.') },
    { icon: Heart, title: t('Välj helt fritt'), text: t('Jämför alternativen och kontakta den verkstad som passar dig bäst.') },
  ]

  const repairs = [
    { icon: CircleDot, title: t('Punktering och däck'), text: t('Punka, däckbyte eller problem med slang och ventil.'), problem: 'Punktering' },
    { icon: Settings2, title: t('Bromsar'), text: t('Bromsar som tar dåligt, ligger på eller behöver justeras.'), problem: 'Bromsar' },
    { icon: Cog, title: t('Växlar och kedja'), text: t('Kedja som hoppar, växlar som strular eller drivlina som behöver ses över.'), problem: 'Växlar' },
    { icon: Wrench, title: t('Service'), text: t('Genomgång, justering och service inför säsongen eller efter många mil.'), problem: 'Service' },
    { icon: Zap, title: t('Elcykel'), text: t('Hjälp med elassistans, drivning eller annan felsökning av elcykel.'), problem: 'Elcykel-problem' },
    { icon: Bike, title: t('Elsparkcykel'), text: t('Felsökning och reparation av vanliga problem på elsparkcykel.'), problem: 'Elsparkcykel' },
  ]

  return (
    <>
      <section id="sa-fungerar-det" className="py-20 md:py-24 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{t('Så fungerar det')}</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{t('Från problem till rätt verkstad i tre steg')}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-secondary/60 p-8"
              >
                <span aria-hidden className="pointer-events-none absolute -top-6 -right-3 font-display text-[7rem] leading-none font-extrabold text-foreground/5 transition-colors group-hover:text-accent/15">
                  {index + 1}
                </span>
                <div className="relative z-10">
                  <span className="inline-flex items-center justify-center rounded-2xl bg-primary p-3 mb-6">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </span>
                  <h3 className="font-display text-xl font-bold mb-3">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-[hsl(var(--brand-cream))]/35">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-2xl mb-12 md:mb-14">
            <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{t('Vanliga reparationer')}</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{t('Börja med det som bäst beskriver problemet')}</h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{t('Välj en vanlig reparation så förbereder vi ärendet åt dig. Du kan ändra allt innan du skickar.')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {repairs.map(({ icon: Icon, title, text, problem }) => (
              <Link
                key={problem}
                to={`/skicka-arende?stad=linkoping&problem=${encodeURIComponent(problem)}`}
                onClick={() => trackClick('home_repair_shortcut_clicked', title, { problem, city: 'Linköping' })}
                className="group rounded-[1.6rem] border border-border/70 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </Link>
            ))}
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-dashed border-border bg-background/60 p-6 md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className="font-display text-xl font-bold">{t('Hittar du inte rätt?')}</p>
              <p className="mt-1 text-muted-foreground">{t('Beskriv problemet med egna ord – formuläret guidar dig vidare.')}</p>
            </div>
            <Button asChild variant="outline" className="mt-4 md:mt-0 rounded-full shrink-0">
              <Link to="/skicka-arende?stad=linkoping" onClick={() => trackClick('home_other_problem_clicked', 'Beskriv ett annat problem', { city: 'Linköping' })}>
                {t('Beskriv ett annat problem')} <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

export default CykelHowItWorks
