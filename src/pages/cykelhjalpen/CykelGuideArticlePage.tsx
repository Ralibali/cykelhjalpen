import { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CalendarDays, Clock, ListTree, MapPin, ShieldCheck, User } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import GuideBody from '@/components/cykelhjalpen/content/GuideBody'
import NotFound from '@/pages/NotFound'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CYKEL_SEO_PAGES } from '@/lib/cykelSeoPages'
import { CYKEL_CITIES, cityLandingPath, requestPath } from '@/lib/cykelCities'
import {
  buildArticleJsonLd,
  buildContentSeoMeta,
  computeReadingTimeMinutes,
  extractToc,
  fetchPublishedContentPage,
  fetchPublishedGuides,
  primaryCitySlug,
  selectRelatedGuides,
  servicePagePath,
  V2_GUIDE_PATH_PREFIX,
  type V2ContentPageRow,
} from '@/lib/v2/content'

const dateFmt = new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : null)

/** Descriptive anchor (the page's H1) for a service×city link, per DIM11 anchor guidance. */
const serviceAnchor = (stem: string, citySlug: string) => {
  const page = CYKEL_SEO_PAGES.find((p) => p.slug === `${stem}-${citySlug}`)
  return page?.h1 ?? `${stem.replace(/-/g, ' ')} ${citySlug}`
}

const BylineRow = ({ page, readingTime }: { page: V2ContentPageRow; readingTime: number }) => (
  <div className="sticker rounded-3xl bg-card p-5 mb-10 space-y-3 text-sm">
    {page.author_name && (
      <p className="flex items-start gap-2">
        <User className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <span>
          <span className="font-medium">Skriven av {page.author_name}</span>
          {page.author_title && <span className="text-muted-foreground"> — {page.author_title}</span>}
        </span>
      </p>
    )}
    {page.reviewer_name && (
      <p className="flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <span>
          <span className="font-medium">Granskad av {page.reviewer_name}</span>
          {page.reviewer_title && <span className="text-muted-foreground"> — {page.reviewer_title}</span>}
          {fmtDate(page.reviewed_at) && (
            <span className="text-muted-foreground"> ({fmtDate(page.reviewed_at)})</span>
          )}
        </span>
      </p>
    )}
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {readingTime} min läsning</span>
      {fmtDate(page.published_at) && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> Publicerad {fmtDate(page.published_at)}
        </span>
      )}
      {page.updated_at && page.published_at && page.updated_at.slice(0, 10) !== page.published_at.slice(0, 10) && (
        <span>Uppdaterad {fmtDate(page.updated_at)}</span>
      )}
    </p>
  </div>
)

/**
 * /guider/:slug — published V2 guide article. Runtime-rendered (no build-time
 * DB prerender; contract pattern: runtime Helmet + published-only gating).
 */
const CykelGuideArticlePage = () => {
  const { slug } = useParams<{ slug: string }>()
  const path = `${V2_GUIDE_PATH_PREFIX}${slug ?? ''}`

  const { data: page, isLoading } = useQuery({
    queryKey: ['v2-guide', path],
    queryFn: () => fetchPublishedContentPage(path),
    enabled: Boolean(slug),
  })
  const { data: allGuides } = useQuery({
    queryKey: ['v2-published-guides'],
    queryFn: () => fetchPublishedGuides(),
    enabled: Boolean(page),
  })

  const readingTime = useMemo(() => computeReadingTimeMinutes(page?.body_markdown), [page])
  const toc = useMemo(() => extractToc(page?.body_markdown), [page])
  const related = useMemo(
    () => (page && allGuides ? selectRelatedGuides(page, allGuides) : []),
    [page, allGuides],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <CykelNavbar />
        <main className="flex-1 container mx-auto max-w-3xl px-4 py-12 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </main>
        <CykelFooter />
      </div>
    )
  }

  if (!page) return <NotFound />

  const meta = buildContentSeoMeta(page)
  const citySlug = primaryCitySlug(page)
  const ctaHref = requestPath({ city: citySlug })
  const cities = (page.city_slugs ?? [])
    .map((s) => CYKEL_CITIES.find((c) => c.slug === s))
    .filter(Boolean) as typeof CYKEL_CITIES[number][]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="robots" content={meta.robots} />
        <link rel="canonical" href={meta.canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={meta.canonical} />
        {page.published_at && <meta property="article:published_time" content={page.published_at} />}
        <meta property="article:modified_time" content={page.updated_at} />
        <script type="application/ld+json">{JSON.stringify(buildArticleJsonLd(page, readingTime))}</script>
      </Helmet>
      <CykelNavbar />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-12">
        <article>
          <nav aria-label="Brödsmulor" className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:underline">Cykelhjälpen</Link>
            <span aria-hidden="true"> / </span>
            <Link to="/guider" className="hover:underline">Guider</Link>
            <span aria-hidden="true"> / </span>
            <span>{page.title}</span>
          </nav>

          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="sticker bg-brand-sun p-2 rounded-xl"><BookOpen className="h-5 w-5" /></div>
              {cities.map((city) => (
                <span key={city.slug} className="text-sm font-mono text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {city.name}
                </span>
              ))}
            </div>
            <h1 className="font-display text-4xl md:text-5xl mb-4">{page.title}</h1>
            {page.description && (
              <p className="text-lg text-muted-foreground leading-relaxed">{page.description}</p>
            )}
          </header>

          <BylineRow page={page} readingTime={readingTime} />

          {toc.length >= 3 && (
            <nav aria-label="Innehållsförteckning" className="sticker rounded-3xl bg-muted/40 p-5 mb-10">
              <p className="flex items-center gap-2 font-display font-semibold mb-3">
                <ListTree className="h-4 w-4" /> I den här guiden
              </p>
              <ol className="space-y-1.5 text-sm">
                {toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
                    <a href={`#${item.id}`} className="text-muted-foreground hover:text-primary">{item.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {page.body_markdown && <GuideBody markdown={page.body_markdown} />}

          {/* Marketplace CTA — city-prefilled request flow */}
          <div className="mt-12 sticker rounded-3xl bg-[hsl(var(--brand-dark))] p-8 text-center text-background">
            <p className="font-display text-2xl mb-2">Beskriv problemet och jämför lokala verkstäder</p>
            <p className="text-sm text-background/70 mb-6">
              Kostnadsfritt · Inget konto · Ingen köpplikt — det tar omkring två minuter.
            </p>
            <Button asChild size="lg" className="cta-playful bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8">
              <Link to={ctaHref}>Få prisförslag gratis</Link>
            </Button>
          </div>

          {(cities.length > 0 || page.service_categories.length > 0) && (
            <section className="mt-12" aria-label="Hitta verkstad">
              <h2 className="font-display text-2xl font-bold mb-4">Hitta verkstad nära dig</h2>
              <ul className="flex flex-wrap gap-2 text-sm">
                {cities.map((city) => (
                  <li key={city.slug}>
                    <Link
                      to={cityLandingPath(city.name)}
                      className="inline-block rounded-full border bg-card px-4 py-2 hover:border-primary hover:text-primary transition-colors"
                    >
                      Cykelverkstad i {city.name}
                    </Link>
                  </li>
                ))}
                {citySlug &&
                  page.service_categories.map((stem) => (
                    <li key={stem}>
                      <Link
                        to={servicePagePath(stem, citySlug)}
                        className="inline-block rounded-full border bg-card px-4 py-2 hover:border-primary hover:text-primary transition-colors"
                      >
                        {serviceAnchor(stem, citySlug)}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-12" aria-label="Relaterade guider">
              <h2 className="font-display text-2xl font-bold mb-4">Relaterade guider</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {related.map((rel) => (
                  <Link
                    key={rel.path}
                    to={rel.path}
                    className="sticker rounded-3xl bg-card p-5 transition-colors hover:bg-muted/40"
                  >
                    <p className="font-display text-lg mb-1">{rel.title}</p>
                    {rel.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{rel.description}</p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Läs vidare <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
      <CykelFooter />
    </div>
  )
}

export default CykelGuideArticlePage
