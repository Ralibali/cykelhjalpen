import { useEffect } from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'
import { Link, useParams } from 'react-router-dom'
import { findPillarPage, findSubPage } from '@/lib/seoData'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight } from 'lucide-react'
import SchemaMarkup from './SchemaMarkup'
import SEOLeadCTA from './SEOLeadCTA'
import NotFound from '@/pages/NotFound'
import { setSEOMeta, getOgImage } from '@/lib/seoHelpers'
import { findCityServicePage } from '@/lib/seoCities'

const SubPage = () => {
  const { category, sub } = useParams<{ category: string; sub: string }>()
  const pillar = findPillarPage(category || '')
  const page = findSubPage(category || '', sub || '')
  // Also check city×service pages
  const cityPage = !page ? findCityServicePage(category || '', sub || '') : null

  useEffect(() => {
    if (page && pillar) {
      setSEOMeta({
        title: page.title,
        description: page.metaDesc,
        canonical: `https://updro.se/${pillar.categorySlug}/${page.slug}`,
        ogImage: getOgImage(pillar.categorySlug),
      })
    } else if (cityPage) {
      setSEOMeta({
        title: cityPage.metaTitle,
        description: cityPage.metaDesc,
        canonical: `https://updro.se/${cityPage.serviceSlug}/${cityPage.citySlug}`,
        ogImage: getOgImage(cityPage.serviceSlug),
      })
    }
    window.scrollTo(0, 0)
  }, [page, cityPage, pillar])

  // Render city service page if found
  if (cityPage && pillar) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="container pt-6">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Hem</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/${pillar.categorySlug}`} className="hover:text-foreground">{pillar.categoryName}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{cityPage.h1}</span>
          </nav>
        </div>
        <section className="container py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{cityPage.h1}</h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{cityPage.intro}</p>
            <div className="mt-6">
              <Link to="/publicera"><Button size="lg" className="rounded-xl shadow-blue">Jämför offerter gratis <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </div>
        </section>
        <div className="container pb-12">
          <div className="max-w-3xl space-y-10">
            {cityPage.sections.map((section, i) => (
              <section key={i}>
                <h2 className="font-display text-2xl font-bold mb-4">{section.heading}</h2>
                <div className="prose prose-lg text-muted-foreground max-w-none">
                  {renderMarkdown(section.content)}
                </div>
              </section>
            ))}
          </div>
        </div>
        <SEOLeadCTA categoryName={pillar.categoryName} />
        {cityPage.faq.length > 0 && (
          <section className="container py-12">
            <h2 className="font-display text-2xl font-bold mb-6">Vanliga frågor</h2>
            <div className="max-w-3xl space-y-4">
              {cityPage.faq.map((item, i) => (
                <details key={i} className="bg-card border rounded-xl p-5 group">
                  <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">{item.q}<ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" /></summary>
                  <div className="mt-3 text-muted-foreground leading-relaxed">{renderMarkdown(item.a)}</div>
                </details>
              ))}
            </div>
          </section>
        )}
        <section className="container py-12 border-t">
          <h2 className="font-display text-xl font-bold mb-4">Relaterade sidor</h2>
          <div className="flex flex-wrap gap-3">
            {cityPage.relatedLinks.map(link => (
              <Link key={link.href} to={link.href} className="bg-muted rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors">{link.label}</Link>
            ))}
            <Link to={`/${pillar.categorySlug}`} className="bg-muted rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors">← Tillbaka till {pillar.categoryName}</Link>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  if (!pillar || !page) return <NotFound />

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <SchemaMarkup page={page} type="sub" parentCategory={pillar.categoryName} parentSlug={pillar.categorySlug} />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/${pillar.categorySlug}`} className="hover:text-foreground">{pillar.categoryName}</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{page.h1}</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{page.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{page.intro}</p>
          <div className="mt-6">
            <Link to="/publicera"><Button size="lg" className="rounded-xl shadow-blue">Jämför offerter gratis <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
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

      <SEOLeadCTA categoryName={pillar.categoryName} />

      {page.faq.length > 0 && (
        <section className="container py-12">
          <h2 className="font-display text-2xl font-bold mb-6">Vanliga frågor</h2>
          <div className="max-w-3xl space-y-4">
            {page.faq.map((item, i) => (
              <details key={i} className="bg-card border rounded-xl p-5 group">
                <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">{item.q}<ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" /></summary>
                <div className="mt-3 text-muted-foreground leading-relaxed">{renderMarkdown(item.a)}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {page.relatedLinks.length > 0 && (
        <section className="container py-12 border-t">
          <h2 className="font-display text-xl font-bold mb-4">Relaterade sidor</h2>
          <div className="flex flex-wrap gap-3">
            {page.relatedLinks.map(link => (
              <Link key={link.href} to={link.href} className="bg-muted rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors">{link.label}</Link>
            ))}
            <Link to={`/${pillar.categorySlug}`} className="bg-muted rounded-xl px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors">← Tillbaka till {pillar.categoryName}</Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}

export default SubPage
