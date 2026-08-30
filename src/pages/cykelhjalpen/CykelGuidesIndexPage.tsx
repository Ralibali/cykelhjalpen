import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Skeleton } from '@/components/ui/skeleton'
import {
  buildGuidesIndexJsonLd,
  computeReadingTimeMinutes,
  fetchPublishedGuides,
  CYKEL_SITE_ORIGIN,
} from '@/lib/v2/content'

const dateFmt = new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * /guider — index of published V2 guides (v2_content_pages, published only).
 * Reached only behind ContentSurfaceGate (flag v2.seo.content_surface).
 */
const CykelGuidesIndexPage = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ['v2-published-guides'],
    queryFn: () => fetchPublishedGuides(),
  })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Guider och råd om cykelverkstäder | Cykelhjälpen</title>
        <meta
          name="description"
          content="Praktiska guider om cykelservice, reparationer och hur du väljer rätt cykelverkstad – granskade av cykelmekaniker."
        />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <link rel="canonical" href={`${CYKEL_SITE_ORIGIN}/guider`} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content="Guider och råd om cykelverkstäder | Cykelhjälpen" />
        <meta
          property="og:description"
          content="Praktiska guider om cykelservice, reparationer och hur du väljer rätt cykelverkstad – granskade av cykelmekaniker."
        />
        <meta property="og:url" content={`${CYKEL_SITE_ORIGIN}/guider`} />
        <script type="application/ld+json">{JSON.stringify(buildGuidesIndexJsonLd())}</script>
      </Helmet>
      <CykelNavbar />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-12">
        <nav aria-label="Brödsmulor" className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:underline">Cykelhjälpen</Link>
          <span aria-hidden="true"> / </span>
          <span>Guider</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="sticker bg-brand-sun p-2 rounded-xl"><BookOpen className="h-5 w-5" /></div>
            <span className="text-sm font-mono text-muted-foreground">Guider</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl mb-4">Guider och råd</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Praktiska guider om cykelservice, reparationer och hur du väljer rätt verkstad.
            Allt innehåll granskas av cykelmekaniker innan det publiceras.
          </p>
        </header>

        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
          </div>
        )}

        {!isLoading && (guides?.length ?? 0) === 0 && (
          <p className="text-muted-foreground">Inga guider publicerade ännu – snart kommer mer.</p>
        )}

        <div className="space-y-4">
          {guides?.map((guide) => (
            <Link
              key={guide.id}
              to={guide.path}
              className="block sticker rounded-3xl bg-card p-6 transition-colors hover:bg-muted/40"
            >
              <article>
                <h2 className="font-display text-xl md:text-2xl mb-2">{guide.title}</h2>
                {guide.description && (
                  <p className="text-muted-foreground leading-relaxed mb-3">{guide.description}</p>
                )}
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {computeReadingTimeMinutes(guide.body_markdown)} min läsning
                  </span>
                  {guide.published_at && <span>Publicerad {dateFmt.format(new Date(guide.published_at))}</span>}
                  {guide.reviewer_name && <span>Granskad av {guide.reviewer_name}</span>}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Läs guiden <ArrowRight className="h-4 w-4" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>
      <CykelFooter />
    </div>
  )
}

export default CykelGuidesIndexPage
