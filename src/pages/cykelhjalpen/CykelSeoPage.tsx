import { useLocation, Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { CYKEL_SEO_PAGES, type CykelSeoPage as CykelSeoPageType } from '@/lib/cykelSeoPages'
import { Button } from '@/components/ui/button'
import { Bike } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

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
]

const PriceStatsTable = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['cykel-price-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cykel_price_stats')
      if (error) throw error
      return (data ?? []) as PriceRow[]
    },
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return null
  const rows = data && data.length > 0 ? data : FALLBACK_PRICES
  const isFallback = !data || data.length === 0

  return (
    <section className="mt-10 mb-10">
      <h2 className="font-display text-2xl font-bold mb-4">Prisstatistik per reparationstyp</h2>
      <div className="overflow-x-auto sticker bg-card p-4 rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Reparationstyp</th>
              <th className="py-2 pr-4">Prisspann</th>
              <th className="py-2 pr-4">Typiskt pris</th>
              <th className="py-2">Underlag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.repair_category} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{r.repair_category}</td>
                <td className="py-2 pr-4">{r.price_low}–{r.price_high} kr</td>
                <td className="py-2 pr-4">~{r.price_typical} kr</td>
                <td className="py-2 text-muted-foreground">
                  {isFallback ? 'riktpris' : `${r.sample_count} offerter`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        {isFallback
          ? 'Riktpriser — riktiga offertdata visas när tillräckligt många offerter skickats.'
          : 'Priserna bygger på riktiga offerter från godkända cykelverkstäder i Linköping via Cykelhjälpen och uppdateras löpande.'}
      </p>
    </section>
  )
}

const RelatedPages = ({ currentSlug }: { currentSlug: string }) => {
  const related = useMemo(() => {
    const others = CYKEL_SEO_PAGES.filter((p) => p.slug !== currentSlug)
    // Stable per-page selection: shuffle by slug hash so order is consistent per page
    const seed = currentSlug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return [...others].sort((a, b) => ((a.slug.charCodeAt(0) + seed) % 7) - ((b.slug.charCodeAt(0) + seed) % 7)).slice(0, 6)
  }, [currentSlug])

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold mb-4">Fler tjänster och områden</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {related.map((p) => (
          <Link
            key={p.slug}
            to={`/${p.slug}`}
            className="sticker bg-card p-4 rounded-xl hover:-translate-y-0.5 transition-transform"
          >
            <span className="font-semibold">{p.h1}</span>
            <span className="block text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

const CykelSeoPage = () => {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\//, '').replace(/\/$/, '')
  const page = CYKEL_SEO_PAGES.find((p) => p.slug === slug) as CykelSeoPageType | undefined
  if (!page) return <Navigate to="/" replace />

  const ogImage = page.ogImage ?? '/og/default.jpg'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={`https://cykelhjalpen.se/${page.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={`https://cykelhjalpen.se/${page.slug}`} />
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
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="sticker bg-brand-sun p-2"><Bike className="h-5 w-5" /></div>
              <span className="text-sm font-mono text-muted-foreground">Linköping</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{page.h1}</h1>
            <p className="text-lg text-muted-foreground">{page.intro}</p>
          </header>

          <div className="sticker bg-brand-sun/30 p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold text-xl">
                {page.variant === 'price-stats' ? 'Få exakta priser för din cykel' : 'Få offerter inom ett dygn'}
              </p>
              <p className="text-sm">Gratis. Inget konto. Lokala cykelverkstäder.</p>
            </div>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/skicka-arende">Skicka ärende</Link>
            </Button>
          </div>

          {page.sections.map((s) => (
            <section key={s.h2} className="mb-8">
              <h2 className="font-display text-2xl font-bold mb-2">{s.h2}</h2>
              <p className="text-foreground/90 leading-relaxed">{s.body}</p>
            </section>
          ))}

          {page.variant === 'price-stats' && <PriceStatsTable />}

          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold mb-4">Vanliga frågor</h2>
            <div className="space-y-3">
              {page.faq.map((f) => (
                <details key={f.q} className="sticker bg-card p-4">
                  <summary className="font-semibold cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-sm text-foreground/80">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <RelatedPages currentSlug={page.slug} />

          <div className="mt-12 sticker bg-card p-6 text-center">
            <p className="font-display font-bold text-xl mb-2">Redo att få offerter?</p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/skicka-arende">Skicka cykelärende — gratis</Link>
            </Button>
          </div>
        </article>
      </main>
      <CykelFooter />
    </div>
  )
}

export default CykelSeoPage
