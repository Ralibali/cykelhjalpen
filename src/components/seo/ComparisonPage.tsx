import { useEffect } from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'
import { Link, useLocation } from 'react-router-dom'
import { findComparisonPage, COMPARISON_PAGES } from '@/lib/seoComparisons'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight, Trophy } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'
import NotFound from '@/pages/NotFound'

const ComparisonPage = () => {
  const location = useLocation()
  const slug = location.pathname.replace(/^\//, '').replace(/\/$/, '')
  const page = findComparisonPage(slug)

  useEffect(() => {
    if (page) {
      import('@/lib/seoHelpers').then(({ setSEOMeta, getOgImage }) => {
        setSEOMeta({ title: page.metaTitle, description: page.metaDesc, canonical: `https://updro.se/${page.slug}`, ogImage: getOgImage(page.slug) })
      })
    }
    window.scrollTo(0, 0)
  }, [page])

  if (!page) return <NotFound />

  const schemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://updro.se/' },
        { '@type': 'ListItem', position: 2, name: 'Jämförelser', item: 'https://updro.se/jamfor/' },
        { '@type': 'ListItem', position: 3, name: page.h1, item: `https://updro.se/${page.slug}/` },
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.metaDesc,
      author: { '@type': 'Organization', name: 'Updro', '@id': 'https://updro.se/#organization' },
      publisher: { '@type': 'Organization', name: 'Updro', '@id': 'https://updro.se/#organization' },
      inLanguage: 'sv-SE',
    },
  ]

  if (page.faq.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Brödsmulor">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/jamfor" className="hover:text-foreground">Jämförelser</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{page.h1}</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Jämförelse</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">{page.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{page.intro}</p>
          <div className="mt-6">
            <Link to="/publicera">
              <Button size="lg" className="rounded-xl shadow-blue">
                Jämför offerter gratis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

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

      <SEOLeadCTA categoryName="digitala tjänster" />

      {page.faq.length > 0 && (
        <section className="container py-12">
          <h2 className="font-display text-2xl font-bold mb-6">Vanliga frågor</h2>
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

      <section className="container py-12 border-t">
        <h2 className="font-display text-xl font-bold mb-4">Relaterade sidor</h2>
        <div className="flex flex-wrap gap-3">
          {page.relatedLinks.map(link => (
            <Link key={link.href} to={link.href}
              className="bg-muted rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default ComparisonPage
