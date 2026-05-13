import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getServiceBySlug, SEO_SERVICES } from '@/lib/seoAgencyData'
import { setSEOMeta } from '@/lib/seoHelpers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import NotFound from '@/pages/NotFound'
import SEOLeadCTA from '@/components/seo/SEOLeadCTA'
import { Button } from '@/components/ui/button'
import { ChevronRight, ArrowRight } from 'lucide-react'

const ServicePage = () => {
  const { tjanst } = useParams<{ tjanst: string }>()
  const service = getServiceBySlug(tjanst || '')

  useEffect(() => {
    if (service) {
      setSEOMeta({
        title: `${service.name} – Hitta rätt byrå | Updro`,
        description: `Anlita en byrå för ${service.name.toLowerCase()} via Updro. Jämför byråer och få offerter.`,
        canonical: `https://updro.se/leveranser/${service.slug}`,
      })
    }
    window.scrollTo(0, 0)
  }, [service])

  if (!service) return <NotFound />

  const schemas = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://updro.se/' },
      { '@type': 'ListItem', position: 2, name: 'Leveranser', item: 'https://updro.se/leveranser' },
      { '@type': 'ListItem', position: 3, name: service.name, item: `https://updro.se/leveranser/${service.slug}` },
    ]},
    { '@context': 'https://schema.org', '@type': 'Service', name: service.name, description: service.description,
      provider: { '@type': 'Organization', name: 'Updro', '@id': 'https://updro.se/#organization' },
      areaServed: { '@type': 'Country', name: 'Sweden' },
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {schemas.map((s, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />)}
      <link rel="canonical" href={`https://updro.se/leveranser/${service.slug}`} />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{service.name}</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Hitta byrå för {service.name}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{service.description}</p>

          <div className="mt-8">
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/publicera">
                Lägg upp ditt uppdrag <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Other services */}
      <section className="container pb-16">
        <h2 className="font-display text-xl font-semibold mb-6">Andra tjänster</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SEO_SERVICES.filter(s => s.slug !== service.slug).map(s => (
            <Link key={s.slug} to={`/leveranser/${s.slug}`}
              className="bg-card rounded-xl border p-4 hover:shadow-md transition-shadow">
              <h3 className="font-display font-semibold text-sm">{s.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <SEOLeadCTA categoryName={service.name.toLowerCase()} />
      <Footer />
    </div>
  )
}

export default ServicePage
