import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Star, Clock } from 'lucide-react'

const SEOLeadCTA = ({ categoryName }: { categoryName: string }) => (
  <section className="bg-primary/5 border-y">
    <div className="container py-12 md:py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold">
          Jämför offerter för {categoryName.toLowerCase()} – kostnadsfritt
        </h2>
        <p className="mt-3 text-muted-foreground text-lg">
          Beskriv ditt projekt och få offerter från kvalitetssäkrade byråer inom 24 timmar. Helt gratis och utan förpliktelser.
        </p>
        <Link to="/publicera">
          <Button size="lg" className="mt-6 rounded-xl shadow-blue text-base px-8">
            Kom igång – 100% gratis <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Kvalitetssäkrade byråer</span>
          <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-brand-amber" /> Verifierade omdömen</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-accent" /> Svar inom 24h</span>
        </div>
      </div>
    </div>
  </section>
)

export default SEOLeadCTA
