import { useEffect } from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'
import { Link, useParams } from 'react-router-dom'
import { findPillarPage } from '@/lib/seoData'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight } from 'lucide-react'
import SchemaMarkup from './SchemaMarkup'
import SEOLeadCTA from './SEOLeadCTA'
import NotFound from '@/pages/NotFound'
import { setSEOMeta, getOgImage } from '@/lib/seoHelpers'

const PillarPage = () => {
  const { category } = useParams<{ category: string }>()
  const page = findPillarPage(category || '')

  useEffect(() => {
    if (page) {
      setSEOMeta({
        title: page.metaTitle,
        description: page.metaDesc,
        canonical: `https://updro.se/${page.categorySlug}`,
        ogImage: getOgImage(page.categorySlug),
      })
    }
    window.scrollTo(0, 0)
  }, [page])

  if (!page) return <NotFound />

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <SchemaMarkup page={page} type="pillar" />

      {/* Breadcrumb */}
      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{page.categoryName}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">{page.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{page.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/publicera">
              <Button size="lg" className="rounded-xl shadow-blue">
                Jämför offerter gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Content sections */}
      <div className="container pb-12">
        <div className="max-w-3xl space-y-10">
          {page.sections.map((section, i) => (
            <section key={i}>
              <h2 className="font-display text-2xl font-bold mb-4">{section.heading}</h2>
              <div className="prose prose-lg text-muted-foreground max-w-none">
                {renderMarkdown(section.content)}
              </div>
            </section>
          ))}
        </div>
      </div>

      <SEOLeadCTA categoryName={page.categoryName} />

      {/* Sub pages grid */}
      {page.subPages.length > 0 && (
        <section className="container py-12">
          <h2 className="font-display text-2xl font-bold mb-6">Utforska mer om {page.categoryName.toLowerCase()}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {page.subPages.map(sub => (
              <Link key={sub.slug} to={`/${page.categorySlug}/${sub.slug}`}
                className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group">
                <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{sub.h1}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sub.metaDesc}</p>
                <span className="text-xs text-primary mt-3 inline-flex items-center gap-1">
                  Läs mer <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {page.faq.length > 0 && (
        <section className="container py-12">
          <h2 className="font-display text-2xl font-bold mb-6">Vanliga frågor om {page.categoryName.toLowerCase()}</h2>
          <div className="max-w-3xl space-y-4">
            {page.faq.map((item, i) => (
              <details key={i} className="bg-card border rounded-xl p-5 group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-3 text-muted-foreground leading-relaxed">{renderMarkdown(item.a)}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related categories */}
      <section className="container py-12 border-t">
        <h2 className="font-display text-xl font-bold mb-4">Relaterade tjänster</h2>
        <div className="flex flex-wrap gap-3">
          {page.relatedCategories.map(rc => (
            <Link key={rc.href} to={rc.href}
              className="bg-muted rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors">
              {rc.label}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default PillarPage
