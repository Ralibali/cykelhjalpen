import { useEffect, useState } from 'react'
import { renderMarkdown } from '@/lib/renderMarkdown'
import { Link, useParams } from 'react-router-dom'
import { findArticle, ARTICLES, ARTICLE_TYPE_LABEL, type ArticlePage as ArticleType } from '@/lib/seoArticles'
import { supabase } from '@/integrations/supabase/client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, ChevronRight, Calendar } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'
import NotFound from '@/pages/NotFound'
import AuthorBio from '@/components/shared/AuthorBio'
import ShareButtons from '@/components/shared/ShareButtons'

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<ArticleType | null | undefined>(undefined) // undefined = loading
  const [allArticles, setAllArticles] = useState<ArticleType[]>(ARTICLES)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // Try DB first
      try {
        const { data } = await supabase
          .from('articles')
          .select('*')
          .eq('slug', slug || '')
          .eq('status', 'published')
          .maybeSingle()
        if (cancelled) return
        if (data) {
          setPage({
            slug: data.slug,
            metaTitle: data.meta_title,
            metaDesc: data.meta_desc,
            h1: data.h1,
            category: data.category,
            publishedDate: data.published_date,
            intro: data.intro,
            sections: (data.sections as any) || [],
            faq: (data.faq as any) || [],
            relatedLinks: (data.related_links as any) || [],
          })
          return
        }
      } catch (e) {
        console.warn('articles DB fetch failed, falling back to static', e)
      }
      // Fallback to static
      const fromStatic = findArticle(slug || '')
      if (!cancelled) setPage(fromStatic ?? null)
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  // Load related articles list (DB + static merged)
  useEffect(() => {
    let cancelled = false
    supabase
      .from('articles')
      .select('slug, h1, category, published_date')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return
        const dbArticles: ArticleType[] = data.map((a: any) => ({
          slug: a.slug, metaTitle: '', metaDesc: '', h1: a.h1, category: a.category,
          publishedDate: a.published_date, intro: '', sections: [], faq: [], relatedLinks: [],
        }))
        const seen = new Set(dbArticles.map(a => a.slug))
        const merged = [...dbArticles, ...ARTICLES.filter(a => !seen.has(a.slug))]
        setAllArticles(merged)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (page) {
      import('@/lib/seoHelpers').then(({ setSEOMeta, getOgImage }) => {
        setSEOMeta({ title: page.metaTitle, description: page.metaDesc, canonical: `https://updro.se/artiklar/${page.slug}`, ogType: 'article', ogImage: getOgImage('artiklar') })
      })
    }
    window.scrollTo(0, 0)
  }, [page])

  if (page === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }
  if (!page) return <NotFound />

  const updatedDate = page.updatedDate || page.publishedDate
  const nextReviewDate = (() => {
    const d = new Date(updatedDate)
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  })()

  const schemas: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.metaDesc,
      datePublished: page.publishedDate,
      dateModified: updatedDate,
      author: { '@type': 'Person', name: 'Updro-redaktionen', url: 'https://updro.se/om-oss' },
      publisher: {
        '@type': 'Organization',
        name: 'Updro',
        url: 'https://updro.se',
        logo: { '@type': 'ImageObject', url: 'https://updro.se/logo-updro.png' },
      },
      mainEntityOfPage: `https://updro.se/artiklar/${page.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://updro.se/' },
        { '@type': 'ListItem', position: 2, name: 'Artiklar', item: 'https://updro.se/artiklar/' },
        { '@type': 'ListItem', position: 3, name: page.h1, item: `https://updro.se/artiklar/${page.slug}/` },
      ]
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
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/artiklar" className="hover:text-foreground">Artiklar</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{page.h1}</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">{ARTICLE_TYPE_LABEL[page.type || 'guide']}</span>
            <span className="bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1 rounded-full">{page.category}</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(page.publishedDate).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{page.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{page.intro}</p>
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
        <div className="max-w-3xl mt-10 space-y-5">
          {/* Update / review meta */}
          <div className="bg-muted/40 border rounded-2xl p-5 text-sm text-muted-foreground space-y-1.5">
            <p>
              <span className="text-foreground font-medium">Senast uppdaterad:</span>{' '}
              {new Date(updatedDate).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p>
              <span className="text-foreground font-medium">Nästa granskning:</span>{' '}
              {new Date(nextReviewDate).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs pt-2 border-t border-border/60 mt-2">
              Denna artikel är skriven baserat på marknadsdata, offerter via Updro och egen erfarenhet av den svenska
              byråmarknaden. Hittar du ett fel?{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">
                Mejla oss
              </a>{' '}
              – vi rättar det och uppdaterar datumet.
            </p>
          </div>
          <AuthorBio />
          <div>
            <ShareButtons url={`https://updro.se/artiklar/${page.slug}`} title={page.h1} />
          </div>
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

      {page.relatedLinks.length > 0 && (
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
      )}

      <section className="container py-12 border-t">
        <h2 className="font-display text-xl font-bold mb-4">Fler artiklar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allArticles.filter(a => a.slug !== page.slug).slice(0, 6).map(a => (
            <Link key={a.slug} to={`/artiklar/${a.slug}`}
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-shadow group">
              <span className="text-xs text-primary font-semibold">{a.category}</span>
              <h3 className="font-display font-semibold mt-1 group-hover:text-primary transition-colors line-clamp-2">{a.h1}</h3>
              <span className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">
                Läs mer <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default ArticlePage
