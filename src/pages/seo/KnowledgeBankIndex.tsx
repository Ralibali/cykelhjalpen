import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SEO_KNOWLEDGE_ARTICLES } from '@/lib/seoAgencyData'
import { setSEOMeta } from '@/lib/seoHelpers'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ChevronRight, Calendar, ArrowRight } from 'lucide-react'

const KnowledgeBankIndex = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Kunskapsbank – Guider & artiklar | Updro',
      description: 'Läs våra guider och artiklar om hemsidor, marknadsföring, design och digitala tjänster.',
      canonical: 'https://updro.se/kunskapsbank',
    })
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Kunskapsbank</span>
        </nav>
      </div>

      <section className="container py-12">
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Kunskapsbank</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Guider, tips och artiklar om hemsidor, marknadsföring, design och digitala tjänster.
        </p>
      </section>

      <section className="container pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SEO_KNOWLEDGE_ARTICLES.map(a => (
            <Link key={a.slug} to={`/kunskapsbank/${a.slug}`}
              className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow group">
              <h2 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">{a.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.metaDesc}</p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(a.publishedAt).toLocaleDateString('sv-SE')}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default KnowledgeBankIndex
