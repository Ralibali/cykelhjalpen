import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Bike, CheckCircle2, MapPin } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Button } from '@/components/ui/button'
import { buildCykelSeoPages, seoPagePath, type CykelSeoPage as CykelSeoPageType } from '@/lib/cykelSeoPagesNeutral'
import { CYKEL_CITIES, cityLandingPath, cityQuery, getCykelCity, type CykelCityName } from '@/lib/cykelCities'
import { getRobotsDirectiveForPath } from '@/lib/seoRobots'
import { getCityImage } from '@/lib/cykelCityImages'
import elsparkBanner1200 from '@/assets/cykel-elsparkcykel-1200.webp'
import elsparkBanner640 from '@/assets/cykel-elsparkcykel-640.webp'
import { trackClick } from '@/hooks/usePageTracking'
import { getV2PriceIndex, type V2PriceIndexRow } from '@/lib/v2/priceIndex'
import { useLanguage, useT, type Lang } from '@/lib/i18n'

type GuidePriceRow = { repair_category: string; price_low: number; price_high: number; price_typical: number }

const GUIDE_PRICES: GuidePriceRow[] = [
  { repair_category: 'Punktering', price_low: 200, price_high: 400, price_typical: 300 },
  { repair_category: 'Liten service', price_low: 500, price_high: 700, price_typical: 600 },
  { repair_category: 'Komplett service', price_low: 1200, price_high: 1700, price_typical: 1450 },
  { repair_category: 'Växeljustering', price_low: 200, price_high: 400, price_typical: 300 },
  { repair_category: 'Bromsservice', price_low: 250, price_high: 500, price_typical: 375 },
  { repair_category: 'Elsparkcykel-service', price_low: 350, price_high: 800, price_typical: 550 },
]

const EN_PRICE_LABELS: Record<string, string> = {
  Punktering: 'Flat tire',
  'Liten service': 'Basic service',
  'Komplett service': 'Full service',
  Växeljustering: 'Gear adjustment',
  Bromsservice: 'Brake service',
  'Elsparkcykel-service': 'E-scooter service',
  'Punktering / däckbyte': 'Flat tire / tire change',
  Bromsar: 'Brakes',
  'Växlar / kedja': 'Gears / chain',
  'Service / genomgång': 'Service / inspection',
  'Elcykel-problem': 'E-bike problems',
  'Hjul / ekrar': 'Wheels / spokes',
  'Lyse / elektronik': 'Lights / electronics',
  Annat: 'Other',
}

const textFor = (lang: Lang, sv: string, en: string) => lang === 'en' ? en : sv

/** Local static riktpriser — prerender/first-paint fallback, clearly labelled. */
const LOCAL_GUIDE_ROWS: V2PriceIndexRow[] = GUIDE_PRICES.map((row) => ({
  repair_category: row.repair_category,
  sample_count: null,
  median_sek: row.price_typical,
  p25_sek: row.price_low,
  p75_sek: row.price_high,
  confidence: 'riktpris',
  window_end: null,
  kind: 'riktpris' as const,
}))

const VatNote = ({ lang }: { lang: Lang }) => (
  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
    {textFor(lang,
      'Bra att veta: arbetet på cykelreparationer har 12 % moms (delar 25 %). Priserna ovan är vägledande – verkstaden lämnar alltid ett pris innan arbetet påbörjas.',
      'Good to know: labour on bike repairs carries 12 % VAT in Sweden (parts 25 %). The prices above are indicative — the workshop always quotes a price before work begins.')}
  </p>
)

/**
 * Sample-gated price section (contract §2.5/§3.5, gate G-P2).
 * Renders REAL Cykelhjälpen statistics (median + p25–p75 + visible n +
 * window) only when the SQL gate passes; otherwise clearly labelled external
 * riktpriser. The static/prerender render shows the local riktpris block —
 * never fabricated statistics.
 */
const PriceIndexSection = ({ citySlug, lang }: { citySlug: string; lang: Lang }) => {
  const text = (sv: string, en: string) => textFor(lang, sv, en)
  const { data } = useQuery({
    queryKey: ['v2-price-index', citySlug],
    queryFn: () => getV2PriceIndex(citySlug),
    staleTime: 300_000,
  })

  const showStats = Boolean(data && !data.sampleGated && data.rows.length > 0)
  const rows: V2PriceIndexRow[] = showStats
    ? data!.rows
    : (data && data.rows.length > 0 ? data.rows : LOCAL_GUIDE_ROWS)

  const categoryLabel = (category: string) =>
    lang === 'en' ? EN_PRICE_LABELS[category] ?? category : category

  if (showStats) {
    const windowEnd = rows.find((row) => row.window_end)?.window_end ?? null
    return (
      <section className="my-10" aria-labelledby="prisstatistik-rubrik">
        <p className="text-xs uppercase tracking-[.18em] text-accent font-semibold">{text('Prisstatistik från Cykelhjälpen', 'Price statistics from Cykelhjälpen')}</p>
        <h2 id="prisstatistik-rubrik" className="font-display text-2xl font-bold mt-1 mb-4">{text('Vad liknande reparationer har kostat', 'What similar repairs have cost')}</h2>
        <div className="overflow-x-auto sticker bg-card p-4 rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-2 pr-4">{text('Reparationstyp', 'Repair type')}</th><th className="py-2 pr-4">{text('Typiskt spann', 'Typical range')}</th><th className="py-2 pr-4">{text('Median', 'Median')}</th><th className="py-2">{text('Underlag', 'Sample')}</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.repair_category} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{categoryLabel(row.repair_category)}</td>
                <td className="py-2 pr-4">{row.p25_sek != null && row.p75_sek != null ? `${row.p25_sek}–${row.p75_sek} kr` : '—'}</td>
                <td className="py-2 pr-4">{row.median_sek != null ? text(`cirka ${row.median_sek} kr`, `about SEK ${row.median_sek}`) : '—'}</td>
                <td className="py-2 text-muted-foreground">{text(`${row.sample_count ?? 0} offerter`, `${row.sample_count ?? 0} quotes`)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          {text(
            `Statistik baserad på riktiga offerter via Cykelhjälpen${windowEnd ? ` (t.o.m. ${windowEnd})` : ''} – median och mittspann (25:e–75:e percentilen) efter borttag av extremvärden. Inte bindande priser: verkstaden lämnar alltid ett pris för just din cykel innan arbetet påbörjas.`,
            `Statistics based on real quotes via Cykelhjälpen${windowEnd ? ` (through ${windowEnd})` : ''} — median and middle range (25th–75th percentile) after outlier removal. Not binding prices: the workshop always quotes a price for your specific bike before work begins.`)}
        </p>
        <VatNote lang={lang} />
      </section>
    )
  }

  return (
    <section className="my-10" aria-labelledby="riktpriser-rubrik">
      <p className="text-xs uppercase tracking-[.18em] text-accent font-semibold">{text('Riktpriser', 'Guide prices')}</p>
      <h2 id="riktpriser-rubrik" className="font-display text-2xl font-bold mt-1 mb-4">{text('Ungefärliga priser per reparationstyp', 'Approximate prices by repair type')}</h2>
      <div className="overflow-x-auto sticker bg-card p-4 rounded-2xl">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2 pr-4">{text('Reparationstyp', 'Repair type')}</th><th className="py-2 pr-4">{text('Prisspann', 'Price range')}</th><th className="py-2">{text('Riktpris', 'Guide price')}</th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.repair_category} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">{categoryLabel(row.repair_category)}</td>
              <td className="py-2 pr-4">{row.p25_sek}–{row.p75_sek} kr</td>
              <td className="py-2">{row.median_sek != null ? text(`cirka ${row.median_sek} kr`, `about SEK ${row.median_sek}`) : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{text('Generella riktpriser från publicerade svenska verkstadsprislistor – inte Cykelhjälpen-statistik eller bindande offerter. Faktiskt pris beror på cykel, delar och arbetets omfattning. När tillräckligt många riktiga offerter finns här visas i stället statistik från Cykelhjälpen, tydligt märkt med antal.', 'General guide prices from published Swedish workshop price lists — not Cykelhjälpen statistics or binding quotes. Actual price depends on the bike, parts and scope of work. Once enough real quotes exist here, Cykelhjälpen statistics are shown instead, clearly labelled with the sample size.')}</p>
      <VatNote lang={lang} />
    </section>
  )
}

const RelatedPages = ({ currentSlug, city, seoPages, lang }: { currentSlug: string; city: CykelCityName; seoPages: CykelSeoPageType[]; lang: Lang }) => {
  const related = useMemo(() => {
    const priority = ['cykelverkstad', 'cykelreparation', 'punktering', 'cykelservice', 'bromsservice', 'vaxeljustering', 'elcykel-reparation', 'elsparkcykel-reparation', 'vad-kostar-cykelreparation']
    const rank = (slug: string) => { const i = priority.findIndex((stem) => slug.startsWith(`${stem}-`)); return i === -1 ? 999 : i }
    const sameCity = seoPages.filter((page) => page.city === city && page.slug !== currentSlug).sort((a, b) => rank(a.slug) - rank(b.slug) || a.title.localeCompare(b.title, lang === 'en' ? 'en' : 'sv')).slice(0, 6)
    const otherHubs = CYKEL_CITIES.filter((candidate) => candidate.name !== city).map((candidate) => seoPages.find((page) => page.city === candidate.name && page.slug === `cykelverkstad-${candidate.slug}`)).filter((page): page is CykelSeoPageType => Boolean(page))
    return [...sameCity, ...otherHubs]
  }, [currentSlug, city, seoPages, lang])

  return <section className="mt-12" aria-labelledby="relaterade-sidor"><h2 id="relaterade-sidor" className="font-display text-2xl font-bold mb-4">{textFor(lang, `Mer cykelhjälp i ${city}`, `More bike-repair help in ${city}`)}</h2><div className="grid sm:grid-cols-2 gap-3">{related.map((page) => <Link key={page.slug} to={seoPagePath(page, lang)} onClick={() => trackClick('seo_related_page_clicked', page.h1, { from: currentSlug, to: page.slug })} className="sticker bg-card p-4 rounded-xl hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-semibold">{page.h1}</span><span className="block text-sm text-muted-foreground mt-1 line-clamp-2">{page.description}</span></Link>)}</div></section>
}

const CykelSeoPageV5 = () => {
  const { pathname } = useLocation()
  const t = useT()
  const { lang } = useLanguage()
  const text = (sv: string, en: string) => textFor(lang, sv, en)
  const seoPages = useMemo(() => buildCykelSeoPages(t), [t])
  const slug = pathname.replace(/^\//, '').replace(/\/$/, '')
  const page = seoPages.find((candidate) => (lang === 'en' ? candidate.enSlug : candidate.slug) === slug)
  if (!page) return <Navigate to="/" replace />

  const city = page.city
  const cityConfig = getCykelCity(city)
  const citySlug = cityConfig.slug
  const svUrl = `https://cykelhjalpen.se/${page.slug}`
  const enUrl = `https://cykelhjalpen.se/en/${page.enSlug}`
  const canonical = lang === 'en' ? enUrl : svUrl
  const ogImage = page.ogImage ?? `/og/stad-${citySlug}.jpg`
  const isElspark = page.slug.startsWith('elsparkcykel-reparation-')
  const cityImage = getCityImage(city)
  const bannerImage = isElspark ? { large: elsparkBanner1200, small: elsparkBanner640, alt: text('Elsparkcykel på reparationsstativ i en cykelverkstad', 'E-scooter on a repair stand in a bike shop') } : cityImage
  const requestHref = lang === 'en' ? `/submit-request?stad=${citySlug}` : cityQuery(city)
  const cityHubUrl = lang === 'en' ? `https://cykelhjalpen.se/en/bike-repair-${citySlug}` : `https://cykelhjalpen.se${cityLandingPath(city)}`
  const homeUrl = lang === 'en' ? 'https://cykelhjalpen.se/en' : 'https://cykelhjalpen.se/'
  const seoDescription = page.variant === 'price-stats'
    ? text(`Se tydligt märkta riktpriser för vanliga cykelreparationer och skicka ett kostnadsfritt ärende för lokalt pris i ${city}.`, `See clearly labelled guide prices for common bike repairs and send a free request for a local price in ${city}.`)
    : page.description

  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: page.title, headline: page.h1, description: seoDescription, inLanguage: lang === 'en' ? 'en' : 'sv-SE', isPartOf: { '@id': 'https://cykelhjalpen.se/#website' } },
    { '@type': 'Service', '@id': `${canonical}#service`, name: page.h1, serviceType: text('Cykelreparation och cykelservice', 'Bike repair and bike service'), provider: { '@id': 'https://cykelhjalpen.se/#organization' }, areaServed: { '@type': 'City', name: city }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: text('Kostnadsfri förfrågan för cyklister', 'Free request for cyclists') } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: homeUrl }, { '@type': 'ListItem', position: 2, name: text(`Cykelverkstad ${city}`, `Bike repair ${city}`), item: cityHubUrl }, { '@type': 'ListItem', position: 3, name: page.h1, item: canonical }] },
    { '@type': 'FAQPage', mainEntity: page.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) },
  ] }

  const trackCta = (placement: string) => trackClick('seo_request_cta_clicked', text('Få prisförslag gratis', 'Get free quotes'), { page: page.slug, placement, city })

  return <div className="min-h-screen bg-background"><Helmet><title>{page.title}</title><meta name="description" content={seoDescription} /><meta name="robots" content={getRobotsDirectiveForPath(pathname)} /><link rel="canonical" href={canonical} /><link rel="alternate" hrefLang="sv" href={svUrl} /><link rel="alternate" hrefLang="en" href={enUrl} /><link rel="alternate" hrefLang="x-default" href={svUrl} /><meta property="og:type" content="website" /><meta property="og:locale" content={lang === 'en' ? 'en_US' : 'sv_SE'} /><meta property="og:site_name" content="Cykelhjälpen" /><meta property="og:title" content={page.title} /><meta property="og:description" content={seoDescription} /><meta property="og:url" content={canonical} /><meta property="og:image" content={`https://cykelhjalpen.se${ogImage}`} /><meta name="twitter:card" content="summary_large_image" /><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet><CykelNavbar /><main className="container mx-auto px-4 py-12 max-w-3xl"><article>
    <nav aria-label={text('Brödsmulor', 'Breadcrumbs')} className="text-sm text-muted-foreground mb-6"><Link to="/" className="hover:underline">Cykelhjälpen</Link> <span aria-hidden="true">/</span> <span>{page.h1}</span></nav>
    <header className="mb-8"><div className="flex items-center gap-2 mb-3"><div className="sticker bg-brand-sun p-2 rounded-xl"><Bike className="h-5 w-5" /></div><span className="text-sm font-mono text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {city}</span></div><h1 className="font-display text-4xl md:text-5xl mb-4">{page.h1}</h1><p className="text-lg text-muted-foreground leading-relaxed">{page.intro}</p><div className="mt-6 rounded-3xl overflow-hidden sticker bg-card"><img src={bannerImage.large} srcSet={`${bannerImage.small} 640w, ${bannerImage.large} 1200w`} sizes="(min-width: 768px) 768px, 100vw" alt={bannerImage.alt} width={1200} height={725} className="w-full aspect-[2/1] object-cover" loading="eager" /></div></header>
    <div className="sticker rounded-3xl bg-brand-sun/30 p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div><p className="font-display text-xl">{page.variant === 'price-stats' ? text('Få pris för just din cykel', 'Get a price for your bike') : text('Jämför lokala svar', 'Compare local replies')}</p><p className="text-sm">{text('Gratis · Inget konto · Ingen köpplikt', 'Free · No account · No obligation')}</p></div><Button asChild className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-6"><Link to={requestHref} onClick={() => trackCta('top')}>{text('Få prisförslag gratis', 'Get free quotes')}</Link></Button></div>
    <div className="grid sm:grid-cols-3 gap-2 mb-10 text-sm"><div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {text('Kostnadsfritt', 'Free')}</div><div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {text('Granskade verkstäder', 'Reviewed shops')}</div><div className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {text('Du väljer själv', 'You choose')}</div></div>
    {page.sections.map((item) => <section key={item.h2} className="mb-8"><h2 className="font-display text-2xl font-bold mb-2">{item.h2}</h2><p className="text-foreground/90 leading-relaxed">{item.body}</p></section>)}
    {page.variant === 'price-stats' && <PriceIndexSection citySlug={citySlug} lang={lang} />}
    <section className="mt-12"><h2 className="font-display text-2xl font-bold mb-4">{text('Vanliga frågor', 'Frequently asked questions')}</h2><div className="space-y-3">{page.faq.map((item) => <details key={item.q} className="group rounded-2xl bg-card p-5 sticker"><summary className="flex items-center justify-between cursor-pointer font-display text-lg">{item.q}<span className="text-accent group-open:rotate-45 transition-transform text-3xl leading-none">+</span></summary><p className="mt-3 text-muted-foreground leading-relaxed">{item.a}</p></details>)}</div></section>
    <RelatedPages currentSlug={page.slug} city={city} seoPages={seoPages} lang={lang} />
    <div className="mt-12 sticker rounded-3xl bg-[hsl(var(--brand-dark))] p-8 text-center text-background"><p className="font-display text-2xl mb-2">{text('Beskriv problemet och jämför alternativen', 'Describe the problem and compare your options')}</p><p className="text-sm text-background/70 mb-6">{text('Det tar omkring två minuter att skicka ett kostnadsfritt ärende.', 'It takes about two minutes to send a free request.')}</p><Button asChild size="lg" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8"><Link to={requestHref} onClick={() => trackCta('bottom')}>{text('Skicka cykelärende gratis', 'Send a free bike request')}</Link></Button></div>
  </article></main><CykelFooter /></div>
}

export default CykelSeoPageV5
