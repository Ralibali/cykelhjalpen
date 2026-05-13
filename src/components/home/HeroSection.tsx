import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const mockOffers = [
  {
    name: 'Aurora Media AB',
    tag: 'Webbutveckling',
    price: '85 000 – 120 000 kr',
    delivery: '6 veckor',
    stars: 5,
    rotate: -3,
  },
  {
    name: 'Nordic Studio',
    tag: 'Design & UX',
    price: '60 000 – 90 000 kr',
    delivery: '4 veckor',
    stars: 5,
    rotate: 0,
    offset: true,
  },
  {
    name: 'Skog & Co',
    tag: 'SEO',
    price: '15 000 kr / mån',
    delivery: 'Löpande',
    stars: 4,
    rotate: 2,
  },
]

const HeroSection = () => {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-10941540384/hero_lead',
        event_callback: () => {},
      })
    }
    navigate(`/publicera${query ? `?beskrivning=${encodeURIComponent(query)}` : ''}`)
  }

  return (
    <section className="relative overflow-hidden bg-hero-gradient dark:from-background dark:to-background">
      <div className="container relative z-10 py-14 md:py-24">
        <div className="grid md:grid-cols-12 gap-10 md:gap-12 items-center">
          <div className="md:col-span-7 text-left">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground leading-[1.05] [text-wrap:balance]">
              Jämför offerter från digitala byråer – hitta rätt webbyrå på minuter
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Beskriv ditt projekt. Få upp till fem offerter från kvalitetssäkrade digitala byråer inom 24 timmar. Helt gratis, helt utan förpliktelser.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 max-w-xl">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Beskriv ditt projekt – t.ex. 'Ny e-handelssajt i Shopify'"
                className="flex-1 h-14 rounded-xl text-base px-5 border-border bg-card shadow-sm"
              />
              <Button
                type="submit"
                size="lg"
                className="h-14 bg-foreground hover:bg-foreground/90 text-background rounded-xl px-8 text-base font-semibold shadow-md whitespace-nowrap"
              >
                Få offerter gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {[
                '100% gratis',
                'Svar inom 24h',
                'Kvalitetssäkrade byråer',
              ].map((text) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand-mint" strokeWidth={2} />
                  {text}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden md:block md:col-span-5 relative h-[430px]" aria-label="Exempel på offerter">
            {mockOffers.map((offer, i) => (
              <div
                key={offer.name}
                className={`absolute left-0 right-0 mx-auto w-[88%] max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg ${
                  offer.offset ? 'translate-x-6' : ''
                }`}
                style={{
                  top: `${i * 105}px`,
                  zIndex: i + 1,
                  transform: `${offer.offset ? 'translateX(1.5rem) ' : ''}rotate(${offer.rotate}deg)`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-display text-base text-foreground leading-tight">{offer.name}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      {offer.tag}
                    </span>
                  </div>
                  <div className="flex gap-0.5" aria-label={`${offer.stars} av 5 stjärnor`}>
                    {[...Array(offer.stars)].map((_, j) => (
                      <Star key={j} className="h-3 w-3 fill-accent text-accent" />
                    ))}
                  </div>
                </div>
                <div className="flex items-end justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pris</p>
                    <p className="text-sm font-semibold text-foreground">{offer.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leverans</p>
                    <p className="text-sm font-semibold text-foreground">{offer.delivery}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
