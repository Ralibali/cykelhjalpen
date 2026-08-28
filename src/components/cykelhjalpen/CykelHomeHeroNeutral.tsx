import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import hero640 from '@/assets/cykel-hero-640.webp'
import hero960 from '@/assets/cykel-hero-960.webp'
import hero1440 from '@/assets/cykel-hero-1440.webp'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { trackClick } from '@/hooks/usePageTracking'
import { useLanguage, useT } from '@/lib/i18n'

const CykelHomeHeroNeutral = () => {
  const t = useT()
  const { lang } = useLanguage()
  const text = (sv: string, en: string) => lang === 'en' ? en : sv

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 right-[-12%] h-72 w-72 rounded-full bg-[hsl(var(--brand-sun))]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 left-[-10%] h-56 w-56 rounded-full bg-[hsl(var(--brand-teal))]/15 blur-3xl"
      />
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur px-3.5 py-1.5 text-xs font-semibold">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {text('Cykelhjälpen i Linköping, Norrköping, Uppsala och Lund', 'Cykelhjälpen in Linköping, Norrköping, Uppsala and Lund')}
            </div>

            <h1 className="mt-6 md:mt-7 font-display text-[2.6rem] leading-[1.05] sm:text-5xl md:text-7xl font-extrabold tracking-tight text-balance">
              {t('Trasig cykel?')}{' '}
              <span className="block text-accent">{t('Jämför innan du väljer.')}</span>
            </h1>

            <p className="mt-6 mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              {text(
                'Beskriv problemet en gång och låt lokala verkstäder som har kapacitet svara med pris och möjlig tid.',
                'Describe the problem once and let local bike shops with capacity respond with price and available time.',
              )}{' '}
              <strong className="text-foreground">{t('Gratis för dig som cyklist.')}</strong>
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-2" aria-label={t('Välj stad')}>
              {CYKEL_CITIES.map((city) => (
                <Link
                  key={city.name}
                  to={cityLandingPath(city.name)}
                  onClick={() => trackClick('home_city_clicked', city.name, { city: city.name })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-border bg-background/80 px-4 py-2 text-sm font-semibold transition-all hover:bg-secondary hover:border-foreground/30"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {city.name}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 md:mt-10 mx-auto max-w-3xl rounded-[2rem] border-2 border-[hsl(var(--ink)/0.12)] bg-background/80 backdrop-blur-sm p-5 md:p-9 shadow-brand"
          >
            <p className="text-xs uppercase tracking-[.18em] text-muted-foreground font-semibold text-center">
              {text('Vanliga cykelproblem – ett klick förbereder ärendet:', 'Common bike problems — one click prepares your request:')}
            </p>

            <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2.5">
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
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent"
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild size="lg" className="cta-playful h-14 px-9 rounded-full shadow-brand">
                <Link to="/skicka-arende" onClick={() => trackClick('home_primary_cta_clicked', 'Få prisförslag gratis')}>
                  {t('Få prisförslag gratis')} <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="h-14 px-7 rounded-full">
                <a href="#sa-fungerar-det" onClick={() => trackClick('home_how_it_works_clicked', 'Så fungerar det')}>
                  {t('Så fungerar det')}
                </a>
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
              {[
                { value: '0 kr', label: text('Gratis för cyklisten', 'Free for the cyclist') },
                { value: 'Max 3', label: text('offerter per ärende', 'quotes per request') },
                { value: text('Du väljer', 'You choose'), label: text('verkstad i Cykelhjälpen', 'the shop in Cykelhjälpen') },
              ].map((item) => (
                <div key={item.value} className="rounded-2xl border bg-secondary/70 px-3.5 py-3 text-left sm:text-center">
                  <p className="font-display text-lg leading-none">{item.value}</p>
                  <p className="mt-1.5 text-muted-foreground leading-snug">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> {t('Inget konto')}</span>
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
              <p className="font-display text-lg">{text('Ett formulär. Lokala svar när verkstäder har kapacitet. Du väljer själv.', 'One form. Local responses when bike shops have capacity. You choose.')}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default CykelHomeHeroNeutral
