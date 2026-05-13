import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ARTICLES, ARTICLE_TYPE_LABEL, type ArticlePage, type ArticleType } from '@/lib/seoArticles'
import { supabase } from '@/integrations/supabase/client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, ChevronRight, Calendar, Search, Clock } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'
import { setSEOMeta, setJsonLd, getOgImage } from '@/lib/seoHelpers'
import { Input } from '@/components/ui/input'

const PER_PAGE = 12

const typeBadgeStyle: Record<ArticleType, string> = {
  guide: 'bg-primary/10 text-primary',
  news: 'bg-accent/15 text-accent-foreground',
  comparison: 'bg-secondary text-secondary-foreground',
  'case-study': 'bg-muted text-foreground',
}

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }) : ''

const ArticlesIndex = () => {
  const [articles, setArticles] = useState<ArticlePage[]>(ARTICLES)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeType, setActiveType] = useState<'all' | ArticleType>('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setSEOMeta({
      title: 'Artiklar & guider om digitala tjänster | Updro',
      description:
        'Guider, prisöversikter, jämförelser och nyheter om webbutveckling, SEO, e-handel, apputveckling och digital marknadsföring.',
      canonical: 'https://updro.se/artiklar',
      ogImage: getOgImage('artiklar'),
    })
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('articles')
      .select('slug, meta_title, meta_desc, h1, category, published_date, updated_date, intro, article_type, read_time_minutes')
      .eq('status', 'published')
      .order('published_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return
        const dbArticles: ArticlePage[] = data.map((a: any) => ({
          slug: a.slug,
          metaTitle: a.meta_title,
          metaDesc: a.meta_desc,
          h1: a.h1,
          category: a.category,
          publishedDate: a.published_date,
          updatedDate: a.updated_date || a.published_date,
          type: (a.article_type as ArticleType) || 'guide',
          readTimeMinutes: a.read_time_minutes || 5,
          intro: a.intro || '',
          sections: [],
          faq: [],
          relatedLinks: [],
        }))
        const seen = new Set(dbArticles.map(a => a.slug))
        const merged = [...dbArticles, ...ARTICLES.filter(a => !seen.has(a.slug))]
        merged.sort((a, b) => (b.publishedDate || '').localeCompare(a.publishedDate || ''))
        setArticles(merged)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => Array.from(new Set(articles.map(a => a.category))), [articles])

  const filtered = useMemo(() => {
    let list = articles.slice()
    if (activeCategory !== 'all') list = list.filter(a => a.category === activeCategory)
    if (activeType !== 'all') list = list.filter(a => (a.type || 'guide') === activeType)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(a => a.h1.toLowerCase().includes(q) || a.metaDesc.toLowerCase().includes(q))
    }
    list.sort((a, b) =>
      sort === 'newest'
        ? (b.publishedDate || '').localeCompare(a.publishedDate || '')
        : (a.publishedDate || '').localeCompare(b.publishedDate || ''),
    )
    return list
  }, [articles, activeCategory, activeType, sort, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const visible = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const featured = sort === 'newest' && safePage === 1 && !query && activeCategory === 'all' && activeType === 'all'
    ? visible[0]
    : null
  const restCards = featured ? visible.slice(1) : visible

  // JSON-LD: CollectionPage + ItemList
  useEffect(() => {
    setJsonLd('articles-collection-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Artiklar & guider – Updro',
      url: 'https://updro.se/artiklar',
      description: 'Guider, jämförelser och nyheter om digitala tjänster i Sverige.',
      isPartOf: { '@id': 'https://updro.se/#website' },
    })
    setJsonLd('articles-itemlist-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: filtered.slice(0, 50).map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://updro.se/artiklar/${a.slug}`,
        name: a.h1,
      })),
    })
  }, [filtered])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [activeCategory, activeType, sort, query])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Hem
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Artiklar</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Artiklar & guider</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Vi publicerar löpande prisguider, jämförelser och nyheter om den svenska byråmarknaden. Alla artiklar är
            granskade av en människa innan publicering.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="container pb-8">
        <div className="bg-card border rounded-2xl p-4 md:p-5 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Sök bland artiklar – ex 'SEO pris' eller 'Shopify'"
              className="pl-9 h-11"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setActiveCategory('all')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'
              }`}
            >
              Alla kategorier
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  activeCategory === c ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {(['all', 'guide', 'news', 'comparison', 'case-study'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                  }`}
                >
                  {t === 'all' ? 'Alla typer' : ARTICLE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Sortera:</span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as 'newest' | 'oldest')}
                className="bg-background border rounded-md px-2 py-1.5 text-xs"
              >
                <option value="newest">Nyast först</option>
                <option value="oldest">Äldst först</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} artiklar</div>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="container pb-10">
          <Link
            to={`/artiklar/${featured.slug}`}
            className="block bg-card border rounded-3xl p-8 md:p-12 hover:border-primary/40 hover:shadow-lg transition-all group"
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadgeStyle[featured.type || 'guide']}`}>
                {ARTICLE_TYPE_LABEL[featured.type || 'guide']}
              </span>
              <span className="text-xs text-muted-foreground">{featured.category}</span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(featured.publishedDate)}
              </span>
              {featured.readTimeMinutes && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {featured.readTimeMinutes} min
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight group-hover:text-primary transition-colors max-w-3xl">
              {featured.h1}
            </h2>
            {featured.metaDesc && (
              <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">{featured.metaDesc}</p>
            )}
            <span className="mt-6 inline-flex items-center gap-1 text-primary text-sm font-medium">
              Läs hela artikeln <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>
      )}

      {/* Cards grid */}
      <section className="container pb-12">
        {restCards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Inga artiklar matchar dina filter.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restCards.map(a => (
              <Link
                key={a.slug}
                to={`/artiklar/${a.slug}`}
                className="bg-card border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all group flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeBadgeStyle[a.type || 'guide']}`}
                  >
                    {ARTICLE_TYPE_LABEL[a.type || 'guide']}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.category}</span>
                </div>
                <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                  {a.h1}
                </h3>
                {a.metaDesc && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.metaDesc}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-4 pt-4 border-t">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {formatDate(a.publishedDate)}
                  </span>
                  {a.readTimeMinutes && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {a.readTimeMinutes} min
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-primary">
                    Läs <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="text-xs px-3 py-2 rounded-md border disabled:opacity-40 hover:bg-muted"
            >
              Föregående
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`text-xs w-8 h-8 rounded-md border transition-colors ${
                  n === safePage ? 'bg-foreground text-background border-foreground' : 'hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="text-xs px-3 py-2 rounded-md border disabled:opacity-40 hover:bg-muted"
            >
              Nästa
            </button>
          </div>
        )}
      </section>

      <SEOLeadCTA categoryName="digitala tjänster" />
      <Footer />
    </div>
  )
}

export default ArticlesIndex
