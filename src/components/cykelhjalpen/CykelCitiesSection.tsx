import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { getCityImage } from '@/lib/cykelCityImages'
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
        {CYKEL_CITIES.map((city) => {
          const image = getCityImage(city.name)
          return (
            <Link
              key={city.name}
              to={cityLandingPath(city.name)}
              onClick={() => trackClick('home_city_card_clicked', city.name, { city: city.name })}
              className="group sticker bg-card rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={image.small}
                  alt={image.alt}
                  width={640}
                  height={387}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-2xl">{city.name}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">Lokala områden, vanliga reparationer och kostnadsfri offertförfrågan.</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">
                  Cykelverkstad i {city.name}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  </section>
)

export default CykelCitiesSection
