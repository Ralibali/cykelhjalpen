import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCityBySlug, SEO_AGENCY_CATEGORIES } from '@/lib/seoAgencyData'
import { CITIES, SERVICE_CATEGORIES, getNearbyCities } from '@/lib/seoCities'
import { setSEOMeta, setJsonLd, setBreadcrumb } from '@/lib/seoHelpers'
import { supabase } from '@/integrations/supabase/client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import NotFound from '@/pages/NotFound'
import SEOLeadCTA from '@/components/seo/SEOLeadCTA'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRight, ChevronRight, MapPin, Search, Star, Calendar, Check } from 'lucide-react'

const LAST_UPDATED = '2026-04-15'

const AgencyCityPage = () => {
  const { stad } = useParams<{ stad: string }>()
  const city = getCityBySlug(stad || '')
  const cityData = CITIES.find(c => c.slug === stad)
  const [agencies, setAgencies] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!city) return
    const url = `https://updro.se/byraer/${city.slug}`
    setSEOMeta({
      title: `Digitala byråer i ${city.name} – jämför offerter 2026 | Updro`,
      description: `Hitta digitala byråer i ${city.name}. Webbutveckling, SEO, e-handel, Google Ads, design – jämför offerter kostnadsfritt. Svar inom 24 timmar.`,
      canonical: url,
    })
    setBreadcrumb([
      { name: 'Hem', url: 'https://updro.se/' },
      { name: 'Byråer', url: 'https://updro.se/byraer' },
      { name: city.name, url },
    ])
    setJsonLd('city-page-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `Digitala byråer i ${city.name}`,
      description: `Jämför offerter från digitala byråer i ${city.name}.`,
      isPartOf: { '@id': 'https://updro.se/#website' },
      about: { '@type': 'City', name: city.name },
      datePublished: '2026-01-01',
      dateModified: LAST_UPDATED,
      inLanguage: 'sv-SE',
    })
    window.scrollTo(0, 0)
  }, [city])

  useEffect(() => {
    if (!city) return
    const fetch = async () => {
      const { data } = await supabase
        .from('supplier_profiles')
        .select('*, profiles!supplier_profiles_id_fkey(full_name, company_name, city, avatar_url)')
        .order('avg_rating', { ascending: false })
        .limit(50)
      if (data) {
        setAgencies(data.filter(a => {
          const c = (a.profiles?.city || '').toLowerCase()
          return c.includes(city.name.toLowerCase())
        }))
      }
    }
    fetch()
  }, [city])

  if (!city) return <NotFound />

  const filtered = search
    ? agencies.filter(a => (a.profiles?.company_name || '').toLowerCase().includes(search.toLowerCase()))
    : agencies

  const nearby = getNearbyCities(city.slug, 8)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Brödsmulor">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/byraer" className="hover:text-foreground">Byråer</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{city.name}</span>
        </nav>
      </div>

      <section className="container py-10 md:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {city.name}{cityData?.region ? ` · ${cityData.region}` : ''}{cityData?.population ? ` · ${cityData.population} inv.` : ''}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Digitala byråer i {city.name} – jämför offerter 2026
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            {cityData?.techDescription || city.description} Via Updro jämför du offerter från kvalitetssäkrade byråer i {city.name} – kostnadsfritt och utan förpliktelser.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/publicera">
              <Button size="lg" className="rounded-xl shadow-blue">
                Publicera uppdrag i {city.name} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Senast uppdaterad: {LAST_UPDATED}</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Gratis offertjämförelse</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Upp till 5 offerter</span>
          </div>
        </div>
      </section>

      {/* Service category links – primary 10 with rich names */}
      <section className="container pb-12">
        <h2 className="font-display text-2xl font-bold mb-6">Tjänster i {city.name}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SERVICE_CATEGORIES.map(cat => (
            <Link key={cat.slug} to={`/byraer/${city.slug}/${cat.slug}`}
              className="group bg-card border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all">
              <h3 className="font-display font-semibold group-hover:text-primary transition-colors">
                {cat.name} i {city.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {cat.shortName.charAt(0).toUpperCase() + cat.shortName.slice(1)} i {city.name} – jämför offerter
              </p>
              <span className="text-xs text-primary mt-2 inline-flex items-center gap-1">
                Se byråer <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container pb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Sök byrå i ${city.name}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
      </section>

      {/* Agency list */}
      <section className="container pb-16">
        <h2 className="font-display text-xl font-semibold mb-6">
          {filtered.length > 0
            ? `${filtered.length} byråer i ${city.name}`
            : `Vi söker byråer i ${city.name}`}
        </h2>
        {filtered.length === 0 ? (
          <div className="bg-surface-alt border rounded-xl p-8 max-w-2xl">
            <p className="text-muted-foreground">
              Just nu har vi inga registrerade byråer i {city.name}.
              Publicera ditt uppdrag så matchar vi dig med rätt byrå – ofta även byråer från {nearby[0]?.name || 'närliggande städer'} som levererar på distans.
            </p>
            <Link to="/publicera" className="inline-block mt-4">
              <Button className="rounded-xl">Publicera uppdrag <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => (
              <Link key={a.id} to={`/byraer/${a.slug}`} className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow">
                <h3 className="font-display font-semibold">{a.profiles?.company_name || a.profiles?.full_name || 'Byrå'}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {a.profiles?.city || city.name}
                  {a.avg_rating > 0 && <><Star className="h-3 w-3 ml-2 text-amber-500" /> {a.avg_rating}</>}
                </div>
                {a.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {a.categories.slice(0, 3).map((c: string) => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{c}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <SEOLeadCTA categoryName={`digitala tjänster i ${city.name}`} />

      {/* Other cities */}
      <section className="container py-12 border-t">
        <h2 className="font-display text-xl font-semibold mb-4">Byråer i andra städer</h2>
        <div className="flex flex-wrap gap-2">
          {nearby.map(c => (
            <Link key={c.slug} to={`/byraer/${c.slug}`}
              className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">
              Byråer i {c.name}
            </Link>
          ))}
          <Link to="/stader" className="text-sm px-3 py-1.5 rounded-lg text-primary hover:underline">
            Se alla städer →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default AgencyCityPage
