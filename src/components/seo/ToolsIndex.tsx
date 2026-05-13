import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TOOLS } from '@/lib/seoTools'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ArrowRight, ChevronRight, Calculator } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'

const ToolsIndex = () => {
  useEffect(() => {
    document.title = 'Gratis verktyg för digitala tjänster | Updro'
    const meta = document.querySelector('meta[name="description"]')
    const desc = 'Gratis verktyg och kalkylatorer. Beräkna vad din hemsida kostar, analysera SEO och planera din marknadsföringsbudget.'
    if (meta) meta.setAttribute('content', desc)
    else {
      const m = document.createElement('meta')
      m.name = 'description'
      m.content = desc
      document.head.appendChild(m)
    }
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Verktyg</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">Gratis verktyg</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Kalkylatorer och analysverktyg som hjälper dig att fatta bättre beslut om digitala tjänster.
          </p>
        </div>
      </section>

      <section className="container pb-12">
        <div className="grid sm:grid-cols-2 gap-6">
          {TOOLS.map(tool => (
            <Link key={tool.slug} to={`/verktyg/${tool.slug}`}
              className="bg-card border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all group">
              <Calculator className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{tool.h1}</h2>
              <p className="text-sm text-muted-foreground mt-2">{tool.metaDesc}</p>
              <span className="text-sm text-primary mt-3 inline-flex items-center gap-1">
                Använd verktyget <ArrowRight className="h-3 w-3" />
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

export default ToolsIndex
