import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import { CYKEL_CITIES, cityQuery } from '@/lib/cykelCities'

const CykelCitiesSection = () => (
  <section id="stader" className="py-20">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">Välj stad</p>
          <h2 className="font-display text-4xl md:text-5xl">Byggt för Sveriges cykel- och studentstäder.</h2>
        </div>
        <p className="text-muted-foreground max-w-md">Välj var cykeln finns så matchas förfrågan med verkstäder i samma stad.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CYKEL_CITIES.map((city) => (
          <Link key={city.name} to={cityQuery(city.name)} className="sticker bg-card rounded-2xl p-5 hover:-translate-y-1 transition-transform">
            <MapPin className="h-6 w-6 text-primary mb-4" />
            <h3 className="font-display text-2xl">{city.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">Få prisförslag från lokala cykelverkstäder.</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">Skicka ärende <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </div>
  </section>
)

export default CykelCitiesSection
