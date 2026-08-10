import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import hero640 from '@/assets/cykel-hero-640.webp'
import hero960 from '@/assets/cykel-hero-960.webp'
import hero1440 from '@/assets/cykel-hero-1440.webp'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { trackClick } from '@/hooks/usePageTracking'
import { useT } from '@/lib/i18n'

const CykelHomeHero = () => {
  const t = useT()

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 backdrop-blur px-3.5 py-1.5 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Linköping · Norrköping · Uppsala · Lund
            </div>

            <h1 className="mt-7 font-display text-5xl md:text-7xl font-extrabold leading-[1.02] tracking-tight text-balance">
              {t('Trasig cykel?')}{' '}
              <span className="block text-accent">{t('Jämför innan du väljer.')}</span>
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              {t('Beskriv problemet en gång och jämför pris och möjlig tid från anslutna cykelverkstäder i din stad — för cyklar')} <em>{t('och')}</em> {t('elsparkcyklar.')} <strong className="text-foreground">{t('Gratis för dig som cyklist.')}</strong>
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-2" aria-label={t('Välj stad')}>
              {CYKEL_CITIES.map((city) => (
                <Link
                  key={city.name}
                  to={cityLandingPath(city.name)}
                  onClick={() => trackClick('home_city_clicked', city.name, { city: city.name })}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary hover:border-foreground/30"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {city.name}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 mx-auto max-w-3xl rounded-[2rem] border border-border/60 bg-background/60 backdrop-blur-sm p-6 md:p-9 shadow-brand"
          >
            <p className="text-xs uppercase tracking-[.18em] text-muted-foreground font-semibold text-center">
              {t('Vanligast just nu – ett klick startar ärendet:')}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {[
                { label: t('Punktering'), param: 'Punktering' },
                { label: t('Bromsar'), param: 'Bromsar' },
                { label: t('Växlar / kedja'), param: 'Växlar' },
                { label: t('Service'), param: 'Service' },
                { label: t('Elcykel'), param: 'Elcykel-problem' },
              ].map(({ label, param }) => (
                <Link
                  key={param}
                  to={`/skicka-arende?problem=${encodeURIComponent(param)}`}
                  onClick={() => trackClick('home_quickstart_clicked', label, { problem: param })}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild size="lg" className="cta-playful h-14 px-9 rounded-full shadow-brand">
                <Link
                  to="/skicka-arende"
                  onClick={() => trackClick('home_primary_cta_clicked', 'Få prisförslag gratis')}
                >
                  {t('Få prisförslag gratis')} <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-14 px-7 rounded-full">
                <a href="#sa-fungerar-det" onClick={() => trackClick('home_how_it_works_clicked', 'Så fungerar det')}>
                  {t('Så fungerar det')}
                </a>
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> {t('Inget konto')}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> {t('Upp till tre svar')}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> {t('Ingen köpplikt')}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-14"
          >
            <div className="rounded-[2rem] overflow-hidden border border-border/60 shadow-brand bg-card">
              <img
                src={hero960}
                srcSet={`${hero640} 640w, ${hero960} 960w, ${hero1440} 1440w`}
                sizes="(min-width: 1024px) 960px, 100vw"
                alt={t('Tealfärgad cykel på reparationsstativ i en varm, solig cykelverkstad')}
                width={1536}
                height={928}
                fetchPriority="high"
                className="w-full aspect-[16/9] md:aspect-[21/9] object-cover"
              />
            </div>
            <div className="mx-auto -mt-10 md:-mt-12 w-[92%] max-w-lg rounded-2xl bg-background/95 backdrop-blur border border-border p-5 text-center shadow-brand">
              <p className="text-[11px] uppercase tracking-[.18em] text-muted-foreground mb-1">{t('Så enkelt är det')}</p>
              <p className="font-display text-lg">{t('Ett formulär. Flera lokala alternativ. Du väljer själv.')}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default CykelHomeHero
