import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { ChevronLeft, ChevronRight, Quote, Pause, Play, Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: 'Punkterade på väg till jobbet vid Stora Torget. Skickade in på morgonen, hade tre offerter innan lunch och cykeln tillbaka samma kväll.',
    name: 'Anna L.',
    area: 'Innerstaden, Linköping',
    bike: 'Pendlarcykel',
    rating: 5,
  },
  {
    quote: 'Min gamla Crescent från 80-talet behövde nya växlar. Verkstaden i Ryd förstod sig på den direkt — och priset var hälften mot vad jag förväntade mig.',
    name: 'Johan E.',
    area: 'Ryd',
    bike: 'Crescent vintage',
    rating: 5,
  },
  {
    quote: 'Bytte hela drivlinan på elcykeln. Smidigt att jämföra tre verkstäder utan att behöva ringa runt själv. Sparade både tid och pengar.',
    name: 'Mira S.',
    area: 'Vasastaden',
    bike: 'Elcykel',
    rating: 5,
  },
  {
    quote: 'Sonens BMX behövde nya bromsar inför sommarlovet. Fick svar på under en timme och en lokal verkstad i Berga som fixade allt på en eftermiddag.',
    name: 'Henrik P.',
    area: 'Berga',
    bike: 'BMX',
    rating: 5,
  },
  {
    quote: 'Älskar att slippa Facebook-grupper och osäkra prisuppgifter. Här ser man verkstadens betyg och får riktiga offerter — som det borde vara.',
    name: 'Linnea K.',
    area: 'Lambohov',
    bike: 'Hybridcykel',
    rating: 5,
  },
  {
    quote: 'Cyklade in en racer från cykelvägen längs Stångån — chassit knäppte. Fick hjälp av en verkstad i Tannefors som visste exakt vad som var fel.',
    name: 'Daniel R.',
    area: 'Tannefors',
    bike: 'Racercykel',
    rating: 5,
  },
]

export default function TestimonialsCarousel() {
  const autoplay = Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplay])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(true)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi])

  const togglePlay = useCallback(() => {
    if (!emblaApi) return
    const ap = emblaApi.plugins().autoplay
    if (!ap) return
    if (isPlaying) ap.stop()
    else ap.play()
    setIsPlaying(!isPlaying)
  }, [emblaApi, isPlaying])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    setScrollSnaps(emblaApi.scrollSnapList())
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi])

  return (
    <section className="py-24 bg-[hsl(var(--brand-cream))]/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="font-mono-display text-xs uppercase tracking-[0.2em] text-[hsl(var(--accent))] mb-3">
            // röster från linköping
          </div>
          <h2 className="font-display text-4xl md:text-5xl">
            Cyklister som <span className="italic">redan fixat</span> det.
          </h2>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-3"
                >
                  <article className="sticker bg-card rounded-3xl p-7 h-full flex flex-col">
                    <Quote className="w-8 h-8 text-[hsl(var(--accent))] mb-4" aria-hidden />
                    <p className="font-display text-lg leading-relaxed text-foreground mb-6 flex-1">
                      "{t.quote}"
                    </p>
                    <div className="flex gap-1 mb-3" aria-label={`${t.rating} av 5`}>
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-[hsl(var(--brand-sun))] text-[hsl(var(--brand-sun))]" />
                      ))}
                    </div>
                    <div className="border-t-2 border-dashed border-[hsl(var(--brand-dark))]/15 pt-3">
                      <div className="font-display font-semibold">{t.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {t.area} · {t.bike}
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={scrollPrev}
              aria-label="Föregående citat"
              className="sticker bg-card rounded-full w-11 h-11 flex items-center justify-center hover:bg-[hsl(var(--accent))] hover:text-background"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-2">
              {scrollSnaps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  aria-label={`Gå till citat ${i + 1}`}
                  aria-current={selectedIndex === i}
                  className={`h-2 rounded-full transition-all ${
                    selectedIndex === i
                      ? 'w-8 bg-[hsl(var(--accent))]'
                      : 'w-2 bg-[hsl(var(--brand-dark))]/25 hover:bg-[hsl(var(--brand-dark))]/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausa karusell' : 'Spela karusell'}
              className="sticker bg-card rounded-full w-11 h-11 flex items-center justify-center hover:bg-[hsl(var(--accent))] hover:text-background"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={scrollNext}
              aria-label="Nästa citat"
              className="sticker bg-card rounded-full w-11 h-11 flex items-center justify-center hover:bg-[hsl(var(--accent))] hover:text-background"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
