import { useLocation, Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { buildCykelSeoPages, seoPagePath, type CykelSeoPage as CykelSeoPageType } from '@/lib/cykelSeoPages'
import { CYKEL_CITIES, cityLandingPath, cityQuery, getCykelCity, type CykelCityName } from '@/lib/cykelCities'
import { getCityImage } from '@/lib/cykelCityImages'
import elsparkBanner1200 from '@/assets/cykel-elsparkcykel-1200.webp'
import elsparkBanner640 from '@/assets/cykel-elsparkcykel-640.webp'
import { Button } from '@/components/ui/button'
import { Bike, CheckCircle2, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { trackClick } from '@/hooks/usePageTracking'
import { useT, useLanguage } from '@/lib/i18n'

type PriceRow = {
  repair_category: string
  sample_count: number
  price_low: number
  price_high: number
  price_typical: number
}

const FALLBACK_PRICES: PriceRow[] = [
  { repair_category: 'Punktering', sample_count: 0, price_low: 200, price_high: 400, price_typical: 300 },
  { repair_category: 'Liten service', sample_count: 0, price_low: 500, price_high: 700, price_typical: 600 },
  { repair_category: 'Komplett service', sample_count: 0, price_low: 1200, price_high: 1700, price_typical: 1450 },
  { repair_category: 'Växeljustering', sample_count: 0, price_low: 200, price_high: 400, price_typical: 300 },
  { repair_category: 'Bromsservice', sample_count: 0, price_low: 250, price_high: 500, price_typical: 375 },
  { repair_category: 'Elsparkcykel-service', sample_count: 0, price_low: 350, price_high: 800, price_typical: 550 },
]

const PriceStatsTable = ({ city }: { city: CykelCityName }) => {
  const t = useT()
  const { data, isLoading } = useQuery({
    queryKey: ['cykel-price-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cykel_price_stats')
      if (error) throw error
      return (data ?? []) as PriceRow[]
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (isLoading) return null
  const rows = data && data.length > 0 ? data : FALLBACK_PRICES
  const isFallback = !data || data.length === 0

  return (
    <section className="mt-10 mb-10" aria-labelledby="prisstatistik-rubrik">
      <h2 id="prisstatistik-rubrik" className="font-display text-2xl font-bold mb-4">{t('Prisstatistik per reparationstyp')}</h2>
      <div className="overflow-x-auto sticker bg-card p-4 rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">{t('Reparationstyp')}</th>
              <th className="py-2 pr-4">{t('Prisspann')}</th>
              <th className="py-2 pr-4">{t('Typiskt pris')}</th>
              <th className="py-2">{t('Underlag')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.repair_category} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{row.repair_category}</td>
                <td className="py-2 pr-4">{row.price_low}–{row.price_high} kr</td>
                <td className="py-2 pr-4">{t('cirka {n} kr', { n: row.price_typical })}</td>
                <td className="py-2 text-muted-foreground">{isFallback ? t('riktpris') : t('{n} offerter', { n: row.sample_count })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        {isFallback
          ? t('Riktpriser. Faktisk offertstatistik visas när underlaget är tillräckligt stort.')
          : t('Priserna bygger på offerter från godkända verkstäder i {city} och uppdateras löpande.', { city })}
      </p>
    </section>
  )
}

const RelatedPages = ({ currentSlug, city, seoPages }: { currentSlug: string; city: CykelCityName; seoPages: CykelSeoPageType[] }) => {
  const t = useT()
  const { lang } = useLanguage()
  const related = useMemo(() => {

    const priorityStems = [
      'cykelverkstad',
      'cykelreparation',
      'cykelservice',
      'punktering',
      'elcykel-reparation',
      'elsparkcykel-reparation',
      'vad-kostar-cykelreparation',
    ]
    const sameCity = seoPages
      .filter((p) => p.city === city && p.slug !== currentSlug)
      .sort((a, b) => {
        const stem = (s: string) => priorityStems.find((st) => s.startsWith(`${st}-`)) ?? ''
        const ai = priorityStems.indexOf(stem(a.slug))
        const bi = priorityStems.indexOf(stem(b.slug))
        if (ai === -1 && bi === -1) return a.title.localeCompare(b.title, 'sv')
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
      .slice(0, 5)

    const otherCityHubs = CYKEL_CITIES
      .filter((c) => c.name !== city)
      .map((c) => seoPages.find((p) => p.city === c.name && p.slug === `cykelverkstad-${c.slug}`))
      .filter((p): p is CykelSeoPageType => Boolean(p))

    return [...sameCity, ...otherCityHubs]
  }, [currentSlug, city, seoPages])

  return (
    <section className="mt-12" aria-labelledby="relaterade-sidor">
      <h2 id="relaterade-sidor" className="font-display text-2xl font-bold mb-4">{t('Mer cykelhjälp i {city}', { city })}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {related.map((page) => (
          <Link
            key={page.slug}
            to={seoPagePath(page, lang)}
            onClick={() => trackClick('seo_related_page_clicked', page.h1, { from: currentSlug, to: page.slug })}
            className="sticker bg-card p-4 rounded-xl hover:-translate-y-0.5 transition-transform"
          >
            <span className="font-semibold">{page.h1}</span>
            <span className="block text-sm text-muted-foreground mt-1 line-clamp-2">{page.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

const CykelSeoPage = () => {
  const { pathname } = useLocation()
  const t = useT()
  const { lang } = useLanguage()
  const seoPages = useMemo(() => buildCykelSeoPages(t), [t])
  const slug = pathname.replace(/^\//, '').replace(/\/$/, '')
  const page = seoPages.find(
    (candidate) => (lang === 'en' ? candidate.enSlug : candidate.slug) === slug,
  ) as CykelSeoPageType | undefined
  if (!page) return <Navigate to="/" replace />

  const svUrl = `https://cykelhjalpen.se/${page.slug}`
  const enUrl = `https://cykelhjalpen.se/en/${page.enSlug}`
  const canonical = lang === 'en' ? enUrl : svUrl
  const city = page.city
  const ogImage = page.ogImage ?? `/og/stad-${getCykelCity(city).slug}.jpg`
  const isElspark = page.slug.startsWith('elsparkcykel-reparation-')
  const cityImage = getCityImage(city)
  const bannerImage = isElspark
    ? { large: elsparkBanner1200, small: elsparkBanner640, alt: t('Elsparkcykel på reparationsstativ i en varm cykelverkstad') }
    : cityImage
  const citySlug = getCykelCity(city).slug
  // In-router path — the /en basename is applied automatically on English URLs.
  const requestHref = lang === 'en' ? `/submit-request?stad=${citySlug}` : cityQuery(city)
  const cityHubUrl = lang === 'en'
    ? `https://cykelhjalpen.se/en/bike-repair-${citySlug}`
    : `https://cykelhjalpen.se${cityLandingPath(city)}`
  const homeUrl = lang === 'en' ? 'https://cykelhjalpen.se/en' : 'https://cykelhjalpen.se/'



  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: page.title,
        headline: page.h1,
        description: page.description,
        inLanguage: lang === 'en' ? 'en' : 'sv-SE',
        isPartOf: { '@id': 'https://cykelhjalpen.se/#website' },
      },
      {
        '@type': 'Service',
        '@id': `${canonical}#service`,
        name: page.h1,
        serviceType: t('Cykelreparation och cykelservice'),
        provider: { '@id': 'https://cykelhjalpen.se/#organization' },
        areaServed: { '@type': 'City', name: city },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: t('Kostnadsfri offertförfrågan för cyklister') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: homeUrl },
          { '@type': 'ListItem', position: 2, name: t('Cykelverkstad {city}', { city }), item: cityHubUrl },

          { '@type': 'ListItem', position: 3, name: page.h1, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  }

  const trackCta = (placement: string) => {
    trackClick('seo_request_cta_clicked', t('Få prisförslag gratis'), { page: page.slug, placement, city })
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') gtag('event', 'select_content', { content_type: 'seo_cta', item_id: page.slug, placement })
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang="sv" href={svUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="x-default" href={svUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content={lang === 'en' ? 'en_US' : 'sv_SE'} />
        <meta property="og:locale:alternate" content={lang === 'en' ? 'sv_SE' : 'en_US'} />
        <meta property="og:site_name" content="Cykelhjälpen" />

        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`https://cykelhjalpen.se${ogImage}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={page.h1} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />
        <meta name="twitter:image" content={`https://cykelhjalpen.se${ogImage}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <CykelNavbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <article>
          <nav aria-label={t('Brödsmulor')} className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:underline">Cykelhjälpen</Link> <span aria-hidden="true">/</span> <span>{page.h1}</span>
          </nav>

          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="sticker bg-brand-sun p-2 rounded-xl"><Bike className="h-5 w-5" /></div>
              <span className="text-sm font-mono text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {city}</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl mb-4">{page.h1}</h1>
            <p className="text-lg text-muted-foreground">{page.intro}</p>
            <div className="mt-6 rounded-3xl overflow-hidden sticker bg-card">
              <img
                src={bannerImage.large}
                srcSet={`${bannerImage.small} 640w, ${bannerImage.large} 1200w`}
                sizes="(min-width: 768px) 768px, 100vw"
                alt={bannerImage.alt}
                width={1200}
                height={725}
                className="w-full aspect-[2/1] object-cover"
                loading="eager"
              />
            </div>
          </header>

          <div className="sticker rounded-3xl bg-brand-sun/30 p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-display text-xl">{page.variant === 'price-stats' ? t('Få pris för just din cykel') : t('Jämför lokala prisförslag')}</p>
              <p className="text-sm">{t('Gratis · Inget konto · Ingen köpplikt')}</p>
            </div>
            <Button asChild className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-6">
              <Link to={requestHref} onClick={() => trackCta('top')}>{t('Få prisförslag gratis')}</Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-2 mb-10 text-sm">
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('Kostnadsfritt')}</div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('Granskade verkstäder')}</div>
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {t('Du väljer själv')}</div>
          </div>

          {page.sections.map((section) => (
            <section key={section.h2} className="mb-8">
              <h2 className="font-display text-2xl font-bold mb-2">{section.h2}</h2>
              <p className="text-foreground/90 leading-relaxed">{section.body}</p>
            </section>
          ))}

          {page.variant === 'price-stats' && <PriceStatsTable city={city} />}

          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold mb-4">{t('Vanliga frågor')}</h2>
            <div className="space-y-3">
              {page.faq.map((item) => (
                <details key={item.q} className="group rounded-2xl bg-card p-5 sticker">
                  <summary className="flex items-center justify-between cursor-pointer font-display text-lg">{item.q}<span className="text-accent group-open:rotate-45 transition-transform text-3xl leading-none">+</span></summary>
                  <p className="mt-3 text-muted-foreground leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <RelatedPages currentSlug={page.slug} city={city} seoPages={seoPages} />

          <div className="mt-12 sticker rounded-3xl bg-[hsl(var(--brand-dark))] p-8 text-center text-background">
            <p className="font-display text-2xl mb-2">{t('Beskriv problemet och jämför alternativen')}</p>
            <p className="text-sm text-background/70 mb-6">{t('Det tar omkring två minuter att skicka ett kostnadsfritt ärende.')}</p>
            <Button asChild size="lg" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
              <Link to={requestHref} onClick={() => trackCta('bottom')}>{t('Skicka cykelärende gratis')}</Link>
            </Button>
          </div>
        </article>
      </main>
      <CykelFooter />
    </div>
  )
}

export default CykelSeoPage
