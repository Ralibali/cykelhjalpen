import { Link } from 'react-router-dom'
import { ArrowRight, Bike, CircleDot, Cog, MapPin, Wrench } from 'lucide-react'
import { trackClick } from '@/hooks/usePageTracking'

const services = [
  {
    href: '/cykelverkstad-linkoping',
    title: 'Cykelverkstad i Linköping',
    text: 'Jämför lokala verkstäder för service och reparation.',
    icon: MapPin,
  },
  {
    href: '/punktering-linkoping',
    title: 'Hjälp med punktering',
    text: 'Få pris på slangbyte, däckbyte och snabb lagning.',
    icon: CircleDot,
  },
  {
    href: '/cykelservice-linkoping',
    title: 'Cykelservice',
    text: 'Jämför liten service, helservice och vårservice.',
    icon: Wrench,
  },
  {
    href: '/elcykel-reparation-linkoping',
    title: 'Reparation av elcykel',
    text: 'Hitta verkstäder för motor, display, drivlina och batterifel.',
    icon: Cog,
  },
] as const

const CykelCitiesSection = () => (
  <section id="lokal-hjalp" className="py-20">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-accent font-semibold mb-3">Lokal cykelhjälp</p>
          <h2 className="font-display text-4xl md:text-5xl">Vanliga cykeljobb i Linköping</h2>
        </div>
        <p className="text-muted-foreground max-w-md">Läs om pris, tid och vanliga fel eller skicka ett kostnadsfritt ärende direkt.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => {
          const Icon = service.icon
          return (
            <Link
              key={service.href}
              to={service.href}
              onClick={() => trackClick('home_service_link_clicked', service.title, { href: service.href })}
              className="sticker bg-card rounded-2xl p-5 hover:-translate-y-1 transition-transform"
            >
              <Icon className="h-6 w-6 text-primary mb-4" />
              <h3 className="font-display text-2xl">{service.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{service.text}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">Läs mer <ArrowRight className="h-4 w-4" /></span>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/skicka-arende?stad=Link%C3%B6ping"
          onClick={() => trackClick('home_services_cta_clicked', 'Beskriv ditt cykelproblem', { city: 'Linköping' })}
          className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
        >
          <Bike className="h-4 w-4" /> Beskriv ditt cykelproblem <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </section>
)

export default CykelCitiesSection
