import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getKnowledgeArticle, SEO_KNOWLEDGE_ARTICLES } from '@/lib/seoAgencyData'
import { setSEOMeta } from '@/lib/seoHelpers'
import { renderMarkdown } from '@/lib/renderMarkdown'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import NotFound from '@/pages/NotFound'
import { Button } from '@/components/ui/button'
import { ChevronRight, ArrowRight, Calendar } from 'lucide-react'

const KnowledgeArticlePage = () => {
  const { artikel } = useParams<{ artikel: string }>()
  const article = getKnowledgeArticle(artikel || '')

  useEffect(() => {
    if (article) {
      setSEOMeta({
        title: article.metaTitle,
        description: article.metaDesc,
        canonical: `https://updro.se/kunskapsbank/${article.slug}`,
      })
    }
    window.scrollTo(0, 0)
  }, [article])

  if (!article) return <NotFound />

  const schemas = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://updro.se/' },
      { '@type': 'ListItem', position: 2, name: 'Kunskapsbank', item: 'https://updro.se/kunskapsbank' },
      { '@type': 'ListItem', position: 3, name: article.title, item: `https://updro.se/kunskapsbank/${article.slug}` },
    ]},
    { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.metaDesc,
      datePublished: article.publishedAt, publisher: { '@type': 'Organization', name: 'Updro', url: 'https://updro.se' },
      mainEntityOfPage: `https://updro.se/kunskapsbank/${article.slug}`,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {schemas.map((s, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />)}
      <link rel="canonical" href={`https://updro.se/kunskapsbank/${article.slug}`} />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/kunskapsbank" className="hover:text-foreground">Kunskapsbank</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{article.title}</span>
        </nav>
      </div>

      <article className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{article.title}</h1>
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          </div>

          <div className="prose prose-gray dark:prose-invert mt-8 max-w-none">
            {renderMarkdown(article.content)}
          </div>

          <div className="mt-12 bg-primary/5 border border-primary/10 rounded-2xl p-8 text-center">
            <h2 className="font-display text-xl font-bold mb-2">Hitta rätt byrå via Updro</h2>
            <p className="text-muted-foreground mb-6">Publicera ditt uppdrag och jämför offerter från kvalificerade byråer – helt gratis.</p>
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/publicera">
                Publicera uppdrag <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </article>

      {/* More articles */}
      <section className="container pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-xl font-semibold mb-6">Fler artiklar</h2>
          <div className="space-y-3">
            {SEO_KNOWLEDGE_ARTICLES.filter(a => a.slug !== article.slug).map(a => (
              <Link key={a.slug} to={`/kunskapsbank/${a.slug}`}
                className="block bg-card rounded-xl border p-4 hover:shadow-md transition-shadow">
                <h3 className="font-display font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{a.metaDesc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default KnowledgeArticlePage
