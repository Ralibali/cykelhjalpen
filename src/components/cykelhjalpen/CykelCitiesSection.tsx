import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { trackClick } from '@/hooks/usePageTracking'

const CykelCitiesSection = () => (
  <section id="stader" className="py-20 scroll-mt-20">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">Välj stad</p>
          <h2 className="font-display text-4xl md:text-5xl">Cykelhjälpen i fyra stora cykelstäder</h2>
        </div>
        <p className="text-muted-foreground max-w-md">Välj din stad, läs om lokal cykelhjälp och skicka sedan ett kostnadsfritt ärende.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CYKEL_CITIES.map((city) => (
          <Link
            key={city.name}
            to={cityLandingPath(city.name)}
            onClick={() => trackClick('home_city_card_clicked', city.name, { city: city.name })}
            className="sticker bg-card rounded-2xl p-5 hover:-translate-y-1 transition-transform"
          >
            <MapPin className="h-6 w-6 text-primary mb-4" />
            <h3 className="font-display text-2xl">{city.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">Lokala områden, vanliga reparationer och kostnadsfri offertförfrågan.</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">Cykelverkstad i {city.name} <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </div>
  </section>
)

export default CykelCitiesSection
