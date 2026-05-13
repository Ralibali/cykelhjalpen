import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, Clock, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { setSEOMeta } from '@/lib/seoHelpers'
import AuthorBio from '@/components/shared/AuthorBio'
import ShareButtons from '@/components/shared/ShareButtons'

/** Simple markdown-ish renderer for guide content (handles ##, **, -, \n) */
const renderContent = (content: string) => {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-2 my-4">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      flushList()
      continue
    }

    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={i} className="font-display text-xl md:text-2xl font-bold mt-10 mb-3 text-foreground">
          {line.replace('## ', '')}
        </h2>
      )
    } else if (line.startsWith('- ')) {
      listItems.push(line.replace(/^- /, ''))
    } else {
      flushList()
      elements.push(
        <p key={i} className="text-muted-foreground leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: boldify(line) }} />
      )
    }
  }
  flushList()
  return elements
}

const boldify = (text: string) =>
  text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')

const GuidePage = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: guide, isLoading } = useQuery({
    queryKey: ['guide', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!slug,
  })

  const { data: relatedGuides } = useQuery({
    queryKey: ['guides-related', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guides')
        .select('slug, title, category')
        .eq('is_published', true)
        .neq('slug', slug!)
        .limit(4)
      if (error) throw error
      return data
    },
    enabled: !!slug,
  })

  useEffect(() => {
    if (guide) {
      setSEOMeta({
        title: `${guide.title} | Updro`,
        description: guide.description,
        canonical: `https://updro.se/guider/${guide.slug}`,
        ogType: 'article',
      })
    }
  }, [guide])

  useEffect(() => {
    if (!isLoading && !guide) {
      navigate('/guider', { replace: true })
    }
  }, [isLoading, guide, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-3xl py-16">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-2/3 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!guide) return null

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.published_at,
    dateModified: guide.updated_at,
    author: { '@type': 'Organization', name: 'Updro' },
    publisher: {
      '@type': 'Organization',
      name: 'Updro',
      logo: { '@type': 'ImageObject', url: 'https://updro.se/logo.png' },
    },
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <article className="container max-w-3xl py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
            <Link to="/" className="hover:text-foreground transition-colors">Startsidan</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/guider" className="hover:text-foreground transition-colors">Guider</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{guide.title.split('?')[0]}</span>
          </nav>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {guide.category && (
              <span className="text-xs font-semibold text-primary/70 mb-2 block">{guide.category}</span>
            )}
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">{guide.title}</h1>
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {guide.reading_time_minutes} min läsning
              </span>
              {guide.updated_at && (
                <span>Uppdaterad {new Date(guide.updated_at).toLocaleDateString('sv-SE')}</span>
              )}
            </div>
          </motion.div>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {renderContent(guide.content)}
          </motion.div>

          {/* Author + share */}
          <div className="mt-10 space-y-4">
            <AuthorBio />
            <ShareButtons url={`https://updro.se/guider/${guide.slug}`} title={guide.title} />
          </div>

          {/* CTA */}
          <div className="mt-14 rounded-2xl border bg-muted/30 p-8 text-center">
            <h3 className="font-display text-xl font-bold mb-2">Vill du ha konkreta offerter?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Publicera ditt uppdrag gratis och få upp till fem offerter från verifierade byråer.
            </p>
            <Link to="/publicera">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 py-5 text-base font-semibold">
                Publicera uppdrag – gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Related guides */}
          {relatedGuides && relatedGuides.length > 0 && (
            <div className="mt-14">
              <h3 className="font-display text-lg font-bold mb-5">Fler guider</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {relatedGuides.map((g) => (
                  <Link
                    key={g.slug}
                    to={`/guider/${g.slug}`}
                    className="group rounded-xl border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    {g.category && <span className="text-xs text-primary/70 font-semibold">{g.category}</span>}
                    <h4 className="font-display font-bold text-sm mt-1 group-hover:text-primary transition-colors">
                      {g.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <Link to="/guider" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Alla guider
            </Link>
          </div>
        </article>
      </main>
      <Footer />

      {/* Article JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {/* Breadcrumb JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Startsidan', item: 'https://updro.se/' },
            { '@type': 'ListItem', position: 2, name: 'Guider', item: 'https://updro.se/guider' },
            { '@type': 'ListItem', position: 3, name: guide.title },
          ],
        }),
      }} />
    </div>
  )
}

export default GuidePage
