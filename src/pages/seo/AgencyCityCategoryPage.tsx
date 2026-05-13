import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCityBySlug, getCategoryBySlug, getPriorityCombo, SEO_AGENCY_CATEGORIES, PRIMARY_CATEGORY_SLUGS } from '@/lib/seoAgencyData'
import { CITIES, SERVICE_CATEGORIES, getCityIntroVariant, getPriceCopy, getProjectExamples, getNearbyCities } from '@/lib/seoCities'
import { setSEOMeta, setJsonLd, setBreadcrumb } from '@/lib/seoHelpers'
import { supabase } from '@/integrations/supabase/client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import NotFound from '@/pages/NotFound'
import SEOLeadCTA from '@/components/seo/SEOLeadCTA'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight, MapPin, Star, Check, Calendar, Building2 } from 'lucide-react'

const LAST_UPDATED = '2026-04-15'

const AgencyCityCategoryPage = () => {
  const { stad, kategori } = useParams<{ stad: string; kategori: string }>()
  const city = getCityBySlug(stad || '')
  const category = getCategoryBySlug(kategori || '')
  // Rich data from seoCities (price, project types, intro variant)
  const cityData = CITIES.find(c => c.slug === stad)
  const serviceData = SERVICE_CATEGORIES.find(s => s.slug === kategori)
  const priority = city && category ? getPriorityCombo(city.slug, category.slug) : undefined
  const [agencies, setAgencies] = useState<any[]>([])

  useEffect(() => {
    if (!city || !category) return
    const url = `https://updro.se/byraer/${city.slug}/${category.slug}`
    setSEOMeta({
      title: `${category.name}-byrå i ${city.name} – jämför offerter 2026 | Updro`,
      description: `Hitta ${category.name.toLowerCase()}-byrå i ${city.name}. Jämför offerter från kvalitetssäkrade byråer kostnadsfritt. Svar inom 24 timmar.`,
      canonical: url,
    })
    setBreadcrumb([
      { name: 'Hem', url: 'https://updro.se/' },
      { name: 'Byråer', url: 'https://updro.se/byraer' },
      { name: city.name, url: `https://updro.se/byraer/${city.slug}` },
      { name: category.name, url },
    ])
    // Service + LocalBusiness schema
    setJsonLd('city-cat-service-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `${category.name} i ${city.name}`,
      serviceType: category.name,
      areaServed: { '@type': 'City', name: city.name },
      provider: { '@type': 'Organization', '@id': 'https://updro.se/#organization' },
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: 'Gratis offertjämförelse' },
      datePublished: '2026-01-01',
      dateModified: LAST_UPDATED,
    })
    window.scrollTo(0, 0)
  }, [city, category])

  useEffect(() => {
    if (!city || !category) return
    const fetch = async () => {
      let query = supabase
        .from('supplier_profiles')
        .select('*, profiles!supplier_profiles_id_fkey(full_name, company_name, city, avatar_url)')
        .order('avg_rating', { ascending: false })
        .limit(50)
      if (category.dbCategory) query = query.contains('categories', [category.dbCategory])
      const { data } = await query
      if (data) {
        setAgencies(data.filter(a => {
          const c = (a.profiles?.city || '').toLowerCase()
          return c.includes(city.name.toLowerCase())
        }))
      }
    }
    fetch()
  }, [city, category])

  // Inject FAQ schema once we have data
  useEffect(() => {
    if (!city || !category) return
    const faq = buildFaq(city.name, category.name, kategori || '')
    setJsonLd('city-cat-faq-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }, [city, category, kategori])

  if (!city || !category) return <NotFound />

  // Build unique intro: prefer rich data when available, else fall back
  const intro = cityData && serviceData
    ? getCityIntroVariant(cityData, serviceData)
    : `${category.name}-byråer i ${city.name}. ${category.description}`

  const priceCopy = serviceData ? getPriceCopy(serviceData.slug, city.name) : null
  const projectExamples = serviceData ? getProjectExamples(serviceData.slug) : []
  const nearby = getNearbyCities(city.slug, 6)
  const otherCategories = SERVICE_CATEGORIES.filter(c => c.slug !== category.slug).slice(0, 9)
  const faq = buildFaq(city.name, category.name, kategori || '')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap" aria-label="Brödsmulor">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/byraer" className="hover:text-foreground">Byråer</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/byraer/${city.slug}`} className="hover:text-foreground">{city.name}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{category.name}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="container py-10 md:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{city.name} {cityData?.region ? `· ${cityData.region}` : ''}</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            {category.name}-byrå i {city.name} – jämför offerter 2026
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{intro}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/publicera">
              <Button size="lg" className="rounded-xl shadow-blue">
                Jämför offerter i {city.name} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to={`/byraer/${city.slug}`}>
              <Button size="lg" variant="outline" className="rounded-xl">Alla byråer i {city.name}</Button>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Senast uppdaterad: {LAST_UPDATED}</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Helt gratis</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-accent" /> Svar inom 24 h</span>
          </div>

          {priority && (
            <div className="mt-7 bg-primary/5 border border-primary/10 rounded-xl p-5">
              <p className="text-sm leading-relaxed">{priority.extraContent}</p>
            </div>
          )}
        </div>
      </section>

      {/* Pris-sektion */}
      {priceCopy && (
        <section className="container pb-12">
          <div className="bg-surface-alt border rounded-2xl p-6 md:p-8 max-w-3xl">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Så mycket kostar {category.name.toLowerCase()} i {city.name}</h2>
            <p className="mt-3 text-muted-foreground">
              Räkna med <strong className="text-foreground">{priceCopy}</strong> för {category.name.toLowerCase()} i {city.name}.
              Priset varierar med byråns storlek, projektets komplexitet och hur mycket strategiskt arbete som ingår.
              Storstadsbyråer ligger ofta tio till femton procent över rikssnittet, men levererar samtidigt djupare specialistkompetens.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Det enda sättet att veta exakt vad <em>ditt</em> projekt kostar är att jämföra minst tre offerter.
              Det gör du gratis via Updro.
            </p>
          </div>
        </section>
      )}

      {/* Vanliga projekt */}
      {projectExamples.length > 0 && (
        <section className="container pb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Vanliga {category.name.toLowerCase()}-projekt i {city.name}</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
            {projectExamples.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-card border rounded-xl">
                <Building2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Checklista */}
      <section className="container pb-12">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Så väljer du rätt {category.name.toLowerCase()}-byrå i {city.name}</h2>
        <ul className="space-y-3 max-w-3xl">
          {[
            `Be om case och referenser från liknande projekt – helst kunder i ${cityData?.region || city.name}.`,
            `Jämför minst tre offerter så du ser spannet – inte bara en siffra.`,
            `Stäm av process, kommunikation och vem som faktiskt sitter med arbetet.`,
            `Säkerställ ägarskap till kod, design, konton och spårning innan du skriver på.`,
            `Begär en första delleverans inom 2–4 veckor istället för en stor leverans efter månader.`,
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <SEOLeadCTA categoryName={`${category.name.toLowerCase()} i ${city.name}`} />

      {/* Byrå-listning */}
      <section className="container py-12">
        <h2 className="font-display text-xl font-semibold mb-6">
          {agencies.length > 0
            ? `${agencies.length} byråer inom ${category.name.toLowerCase()} i ${city.name}`
            : `Vi söker byråer inom ${category.name.toLowerCase()} i ${city.name}`}
        </h2>
        {agencies.length === 0 ? (
          <div className="bg-surface-alt border rounded-xl p-8 text-center max-w-2xl">
            <p className="text-muted-foreground">
              Just nu har vi inga registrerade byråer inom {category.name.toLowerCase()} i {city.name}.
              Publicera ditt uppdrag så matchar vi dig med rätt byrå – ofta även från närliggande städer som levererar på distans.
            </p>
            <Link to="/publicera" className="inline-block mt-4">
              <Button className="rounded-xl">Publicera uppdrag <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencies.map(a => (
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

      {/* FAQ */}
      <section className="container pb-16">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Vanliga frågor om {category.name.toLowerCase()} i {city.name}</h2>
        <div className="space-y-4 max-w-3xl">
          {faq.map((f, i) => (
            <details key={i} className="bg-card border rounded-xl p-5 group">
              <summary className="font-semibold cursor-pointer list-none flex items-start justify-between gap-3">
                <span>{f.q}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 flex-shrink-0 mt-1" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Other categories in this city */}
      <section className="container pb-12 border-t pt-12">
        <h2 className="font-display text-xl font-semibold mb-4">Andra kategorier i {city.name}</h2>
        <div className="flex flex-wrap gap-2">
          {otherCategories.map(cat => (
            <Link key={cat.slug} to={`/byraer/${city.slug}/${cat.slug}`}
              className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">
              {cat.name} i {city.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Nearby cities */}
      <section className="container pb-16">
        <h2 className="font-display text-xl font-semibold mb-4">{category.name} i andra städer nära {city.name}</h2>
        <div className="flex flex-wrap gap-2">
          {nearby.map(c => (
            <Link key={c.slug} to={`/byraer/${c.slug}/${category.slug}`}
              className="text-sm px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors">
              {category.name} {c.name}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

const buildFaq = (cityName: string, categoryName: string, categorySlug: string) => {
  const priceCopy = getPriceCopy(categorySlug, cityName)
  return [
    {
      q: `Vad kostar en ${categoryName.toLowerCase()}-byrå i ${cityName}?`,
      a: priceCopy
        ? `Räkna med ${priceCopy} för ${categoryName.toLowerCase()} i ${cityName}. Priset beror på projektets omfattning och byråns storlek. Jämför minst tre offerter via Updro för att hitta rätt nivå.`
        : `Priset beror på projektets omfattning. Jämför minst tre offerter via Updro för att hitta rätt nivå.`,
    },
    {
      q: `Hur lång tid tar ett ${categoryName.toLowerCase()}-projekt i ${cityName}?`,
      a: `För de flesta projekt ligger leveranstiden på 4–12 veckor från start. Större ${categoryName.toLowerCase()}-projekt kan ta 3–6 månader. Be alltid om en delleveransplan så du ser progress under tiden.`,
    },
    {
      q: `Kan jag anlita en byrå utanför ${cityName}?`,
      a: `Absolut. Många ${categoryName.toLowerCase()}-projekt levereras helt på distans. Det viktiga är byråns kompetens, kommunikation och process – inte adressen. Via Updro kan du välja att enbart se lokala byråer eller öppna upp för hela landet.`,
    },
    {
      q: `Hur hittar jag rätt ${categoryName.toLowerCase()}-byrå i ${cityName}?`,
      a: `Beskriv ditt uppdrag på Updro. Vi matchar dig med upp till fem kvalitetssäkrade byråer i ${cityName} som arbetar med ${categoryName.toLowerCase()}. Du får offerter inom 24 timmar och väljer fritt – kostnadsfritt och utan förpliktelser.`,
    },
    {
      q: `Vad ingår i ett typiskt ${categoryName.toLowerCase()}-uppdrag?`,
      a: `Ett bra ${categoryName.toLowerCase()}-uppdrag inkluderar förstudie, leverans i delsteg, dokumentation och en överlämning där du själv kan fortsätta arbeta. Säkerställ att ägarskap till material, kod och konton är ditt redan från start.`,
    },
  ]
}

export default AgencyCityCategoryPage
