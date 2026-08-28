import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Sparkles, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { getCityImage } from '@/lib/cykelCityImages'
import { trackClick } from '@/hooks/usePageTracking'
import { useLanguage } from '@/lib/i18n'

const useText = () => {
  const { lang } = useLanguage()
  return (sv: string, en: string) => lang === 'en' ? en : sv
}

export const CykelV3CitiesNeutral = () => {
  const text = useText()

  return (
    <section id="stader" className="py-16 md:py-24 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">{text('Städer', 'Cities')}</p>
            <h2 className="font-display text-4xl md:text-5xl">{text('Cykelhjälpen i fyra städer', 'Cykelhjälpen in four cities')}</h2>
          </div>
          <p className="text-muted-foreground max-w-md">{text('Välj din stad för lokala guider och för att skicka ett kostnadsfritt cykelärende.', 'Choose your city for local guides and to send a free bike-repair request.')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {CYKEL_CITIES.map((city) => {
            const image = getCityImage(city.name)
            return (
              <Link
                key={city.name}
                to={cityLandingPath(city.name)}
                onClick={() => trackClick('home_v3_city_clicked', city.name, { city: city.name })}
                className="group sticker bg-card rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={image.small} alt={image.alt} width={640} height={387} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute top-3 left-3 rounded-full bg-background/90 text-foreground px-3 py-1 text-xs font-semibold backdrop-blur inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{city.name}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-2xl">{city.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">{text('Se lokala guider och skicka ett kostnadsfritt ärende.', 'See local guides and send a free request.')}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">{text('Cykelhjälp i ', 'Bike help in ')}{city.name}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export const CykelV3WorkshopRecruitmentNeutral = () => {
  const text = useText()

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--brand-cream))]/40">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="sticker rounded-[2rem] bg-[hsl(var(--brand-dark))] text-background p-6 md:p-12 grid md:grid-cols-[1fr_auto] gap-6 md:gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1.5 text-xs font-semibold mb-5"><Sparkles className="h-3.5 w-3.5 text-[hsl(var(--brand-sun))]" /> Founding Partner</span>
            <h2 className="font-display text-4xl md:text-5xl">{text('Driver du cykelverkstad?', 'Do you run a bike shop?')}</h2>
            <p className="mt-4 text-background/70 text-lg max-w-2xl">{text('Vi söker fler partnerverkstäder i Linköping, Norrköping, Uppsala och Lund. Registreringen är gratis, ni väljer själva vilka jobb ni vill svara på och de två första vunna kunderna är gratis.', 'We are looking for more partner bike shops in Linköping, Norrköping, Uppsala and Lund. Registration is free, you choose which jobs to respond to, and your first two won customers are free.')}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-background/10 px-3 py-1.5">0 kr/mån</span>
              <span className="rounded-full bg-background/10 px-3 py-1.5">{text('Två första vinsterna gratis', 'First two wins free')}</span>
              <span className="rounded-full bg-background/10 px-3 py-1.5">{text('Ingen bindningstid', 'No commitment')}</span>
            </div>
          </div>
          <Button asChild size="lg" className="rounded-full h-14 px-8 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/for-cykelverkstader" onClick={() => trackClick('home_v3_workshop_cta', 'Founding Partner')}><Store className="h-4 w-4 mr-2" />{text('Bli partnerverkstad', 'Become a partner shop')} <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export const CykelV3MobileStickyNeutral = () => {
  const text = useText()

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur p-3 md:hidden">
      <Button asChild className="w-full rounded-full h-12">
        <Link to="/skicka-arende" onClick={() => trackClick('home_mobile_sticky_cta', 'Skicka ärende')}>{text('Få prisförslag gratis', 'Get quotes for free')} <ArrowRight className="h-4 w-4 ml-2" /></Link>
      </Button>
    </div>
  )
}
