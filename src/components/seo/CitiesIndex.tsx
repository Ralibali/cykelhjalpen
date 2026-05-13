import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CITIES } from '@/lib/seoCities'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, ChevronRight, MapPin } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'
import { setSEOMeta } from '@/lib/seoHelpers'

const CitiesIndex = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Digitala byråer per stad – Jämför offerter | Updro',
      description: 'Hitta digitala byråer i din stad. Stockholm, Göteborg, Malmö och fler – jämför offerter kostnadsfritt.',
      canonical: 'https://updro.se/stader',
    })
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Städer</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Digitala byråer per stad</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Hitta byråer nära dig. Jämför offerter från kvalitetssäkrade digitala byråer i Sveriges största städer – kostnadsfritt och utan förpliktelser.
          </p>
        </div>
      </section>

      <section className="container pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITIES.map(city => (
            <Link key={city.slug} to={`/stader/${city.slug}`}
              className="bg-card border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{city.population} inv.</span>
              </div>
              <h2 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{city.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{city.description}</p>
              <span className="text-xs text-primary mt-3 inline-flex items-center gap-1">
                Se alla tjänster <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SEOLeadCTA categoryName="digitala tjänster" />
      <Footer />
    </div>
  )
}

export default CitiesIndex
