import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { COMPARISON_PAGES } from '@/lib/seoComparisons'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, ChevronRight, Trophy } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'
import { setSEOMeta } from '@/lib/seoHelpers'

const ComparisonsIndex = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Jämför byråer – Topp 10 listor | Updro',
      description: 'Jämför de bästa byråerna i Sverige. Topp 10 listor för SEO, webbutveckling, e-handel, apputveckling och mer.',
      canonical: 'https://updro.se/jamfor',
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
          <span className="text-foreground font-medium">Jämför</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Jämför de bästa byråerna</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Vi har utvärderat och jämfört de bästa byråerna i Sverige inom varje tjänstekategori. Hitta rätt partner baserat på recensioner, priser och specialistkompetens.
          </p>
        </div>
      </section>

      <section className="container pb-12">
        <div className="grid sm:grid-cols-2 gap-6">
          {COMPARISON_PAGES.map(page => (
            <Link key={page.slug} to={`/${page.slug}`}
              className="bg-card border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
              <Trophy className="h-6 w-6 text-primary mb-2" />
              <h2 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{page.h1}</h2>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{page.metaDesc}</p>
              <span className="text-sm text-primary mt-3 inline-flex items-center gap-1">
                Läs jämförelsen <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SEOLeadCTA categoryName="digitala tjänster" />
      <Footer />
    </div>
  )
}

export default ComparisonsIndex
