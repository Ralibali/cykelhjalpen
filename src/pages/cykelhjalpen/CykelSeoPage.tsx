import { useParams, Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { CYKEL_SEO_PAGES } from '@/lib/cykelSeoPages'
import { Button } from '@/components/ui/button'
import { Bike } from 'lucide-react'

const CykelSeoPage = () => {
  const { slug } = useParams()
  const page = CYKEL_SEO_PAGES.find((p) => p.slug === slug)
  if (!page) return <Navigate to="/" replace />

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
        <link rel="canonical" href={`/${page.slug}`} />
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
              <p className="font-display font-bold text-xl">Få offerter inom ett dygn</p>
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
