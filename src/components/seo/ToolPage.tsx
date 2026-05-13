import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findTool, TOOLS } from '@/lib/seoTools'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { ArrowRight, ChevronRight, Calculator } from 'lucide-react'
import SEOLeadCTA from './SEOLeadCTA'
import NotFound from '@/pages/NotFound'

const ToolPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const page = findTool(slug || '')

  useEffect(() => {
    if (page) {
      import('@/lib/seoHelpers').then(({ setSEOMeta }) => {
        setSEOMeta({ title: page.metaTitle, description: page.metaDesc, canonical: `https://updro.se/verktyg/${page.slug}` })
      })
    }
    window.scrollTo(0, 0)
  }, [page])

  if (!page) return <NotFound />

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/verktyg" className="hover:text-foreground">Verktyg</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{page.h1}</span>
        </nav>
      </div>

      <section className="container py-12 md:py-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-primary mb-3">
            <Calculator className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Gratis verktyg</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{page.h1}</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{page.intro}</p>
        </div>
      </section>

      {/* Tool placeholder – interactive tools to be built */}
      <section className="container pb-12">
        <div className="max-w-2xl mx-auto bg-card border-2 border-dashed rounded-2xl p-12 text-center">
          <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Verktyget laddas snart</h2>
          <p className="text-muted-foreground mb-6">{page.description}</p>
          <p className="text-sm text-muted-foreground mb-6">Under tiden kan du jämföra riktiga offerter kostnadsfritt via Updro.</p>
          <Link to="/publicera">
            <Button size="lg" className="rounded-xl shadow-blue">
              Jämför offerter gratis <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <SEOLeadCTA categoryName="digitala tjänster" />

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

export default ToolPage
