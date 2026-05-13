import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Link } from 'react-router-dom'
import { setSEOMeta, getAllSitemapEntries, type SitemapEntry } from '@/lib/seoHelpers'
import { ChevronRight } from 'lucide-react'

const SitemapPage = () => {
  const [entries, setEntries] = useState<SitemapEntry[]>([])

  useEffect(() => {
    setSEOMeta({ title: 'Sitemap – Alla sidor | Updro', description: 'Komplett sitemap för Updro.se med alla tjänster, städer, artiklar, verktyg och jämförelser.', noindex: true })
    setEntries(getAllSitemapEntries())
  }, [])

  const grouped: Record<string, SitemapEntry[]> = {}
  entries.forEach(e => {
    const parts = e.loc.split('/').filter(Boolean)
    const group = parts[0] || 'Startsida'
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(e)
  })

  const groupLabels: Record<string, string> = {
    'Startsida': 'Startsida',
    'publicera': 'Publicera uppdrag',
    'byraer': 'Byråer',
    'priser': 'Priser',
    'om-oss': 'Om oss',
    'artiklar': 'Artiklar',
    'verktyg': 'Verktyg',
    'stader': 'Städer',
    'jamfor': 'Jämförelser',
    'guider': 'Guider',
    'integritetspolicy': 'Juridiskt',
    'villkor': 'Juridiskt',
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="container py-12 flex-1">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Hem</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Sitemap</span>
        </nav>

        <h1 className="font-display text-3xl font-bold mb-2">Sitemap</h1>
        <p className="text-muted-foreground mb-8">
          Alla sidor på Updro.se – {entries.length} sidor totalt.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href="/sitemap-index.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Visa sitemap-index.xml
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Visa sitemap.xml
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="bg-card border rounded-xl p-5">
              <h2 className="font-display font-semibold text-sm mb-3 text-foreground">
                {groupLabels[group] || group.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h2>
              <ul className="space-y-1.5">
                {items.slice(0, 15).map(item => (
                  <li key={item.loc}>
                    <Link to={item.loc} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item.loc === '/' ? 'Startsidan' : item.loc}
                    </Link>
                  </li>
                ))}
                {items.length > 15 && (
                  <li className="text-xs text-muted-foreground">+ {items.length - 15} fler sidor</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default SitemapPage
