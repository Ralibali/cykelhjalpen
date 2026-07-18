import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, CheckCircle2, MapPin, ShieldCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { CYKEL_CITIES, cityLandingPath, cityQuery, getCykelCity, type CykelCityName } from '@/lib/cykelCities'
import { getCityImage } from '@/lib/cykelCityImages'
import { trackClick } from '@/hooks/usePageTracking'

const CykelCityLandingPage = ({ city }: { city: CykelCityName }) => {
  const cityData = getCykelCity(city)
  const cityImage = getCityImage(city)
  const canonical = `https://cykelhjalpen.se${cityLandingPath(city)}`

  const trackCta = (placement: string) => {
    trackClick('city_request_cta_clicked', `Få prisförslag i ${city}`, { city, placement })
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') gtag('event', 'select_content', { content_type: 'city_landing_cta', item_id: cityData.slug, placement })
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `Cykelverkstad ${city} – jämför lokala prisförslag`,
        headline: `Cykelverkstad i ${city}`,
        description: `Beskriv ditt cykelproblem och jämför pris och tid från anslutna cykelverkstäder i ${city}.`,
        inLanguage: 'sv-SE',
        isPartOf: { '@id': 'https://cykelhjalpen.se/#website' },
      },
      {
        '@type': 'Service',
        '@id': `${canonical}#service`,
        name: `Jämför cykelverkstäder i ${city}`,
        serviceType: 'Förmedling av cykelreparation och cykelservice',
        areaServed: { '@type': 'City', name: city },
        provider: { '@id': 'https://cykelhjalpen.se/#organization' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: 'Kostnadsfri offertförfrågan för cyklister' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: 'https://cykelhjalpen.se/' },
          { '@type': 'ListItem', position: 2, name: `Cykelverkstad ${city}`, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Vad kostar det att skicka ett cykelärende i ${city}?`,
            acceptedAnswer: { '@type': 'Answer', text: 'Det är kostnadsfritt för dig som cyklist och du har ingen köpplikt.' },
          },
          {
            '@type': 'Question',
            name: `Vilka cykelproblem kan verkstäder i ${city} hjälpa till med?`,
            acceptedAnswer: { '@type': 'Answer', text: 'Bland annat punktering, bromsar, växlar, kedja, service, hjul och elcykelproblem.' },
          },
        ],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cykelverkstad {city} – jämför lokala prisförslag</title>
        <meta name="description" content={`Hitta cykelverkstad i ${city}. Beskriv problemet gratis och jämför pris och tid från anslutna verkstäder utan konto.`} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="sv_SE" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content={`Cykelverkstad ${city} – jämför lokala prisförslag`} />
        <meta property="og:description" content={`Få lokala prisförslag på cykelreparation i ${city}. Gratis och utan konto.`} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`https://cykelhjalpen.se/og/stad-${cityData.slug}.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`Cykelhjälpen i ${city}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Cykelverkstad ${city} – jämför lokala prisförslag`} />
        <meta name="twitter:description" content={`Få lokala prisförslag på cykelreparation i ${city}.`} />
        <meta name="twitter:image" content={`https://cykelhjalpen.se/og/stad-${cityData.slug}.jpg`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <CykelNavbar />
      <main>
        <section className="bg-hero-gradient">
          <div className="container mx-auto px-4 py-14 md:py-20 max-w-6xl">
            <nav aria-label="Brödsmulor" className="text-sm text-muted-foreground mb-8">
              <Link to="/" className="hover:underline">Cykelhjälpen</Link> <span aria-hidden="true">/</span> <span>{city}</span>
            </nav>
            <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-sm font-medium mb-6">
                  <MapPin className="h-4 w-4 text-primary" /> {city}
                </div>
                <h1 className="font-display text-4xl md:text-6xl tracking-tight max-w-2xl">
                  Cykelverkstad i {city} – <span className="italic text-accent">jämför innan du väljer</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Beskriv problemet en gång och jämför pris, möjlig tid och kontaktuppgifter från anslutna cykelverkstäder i {city}. Tjänsten är gratis för dig som cyklist.
                </p>
                <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8 cta-playful shadow-brand">
                  <Link to={cityQuery(city)} onClick={() => trackCta('hero')}>Få prisförslag i {city} <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> Inget konto</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> Ingen köpplikt</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--brand-teal))]" /> Lokala svar</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-[2rem] overflow-hidden sticker bg-card"
              >
                <img
                  src={cityImage.large}
                  srcSet={`${cityImage.small} 640w, ${cityImage.large} 1200w`}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt={cityImage.alt}
                  width={1200}
                  height={725}
                  className="w-full aspect-[3/2] object-cover"
                  loading="eager"
                />
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-16">
          <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-3 gap-5">
            {[
              { icon: Bike, title: 'Beskriv cykeln', text: 'Välj problem, brådska och lägg gärna till bilder.' },
              { icon: Wrench, title: 'Lokala verkstäder svarar', text: `Godkända verkstäder i ${city} kan svara med pris och möjlig tid.` },
              { icon: CheckCircle2, title: 'Du väljer själv', text: 'Jämför alternativen utan konto, kostnad eller köpplikt.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="sticker bg-card rounded-2xl p-6">
                <Icon className="h-7 w-7 text-primary mb-4" />
                <h2 className="font-display text-xl font-bold">{title}</h2>
                <p className="text-muted-foreground mt-2">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 max-w-4xl space-y-10">
          <div>
            <h2 className="font-display text-3xl font-bold">Lokal cykelhjälp i {city}</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">Cykelhjälpen täcker bland annat {cityData.areas}. Ange område eller postnummer i formuläret så att verkstäderna kan bedöma avstånd, inlämning och eventuell hämtning.</p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">För studenter, familjer och pendlare</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{cityData.localIntro} Punktering, bromsar, växlar och kedjeproblem kan snabbt störa vardagen, därför är det värdefullt att kunna jämföra lokala alternativ.</p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">Vanliga cykeljobb</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">Anslutna verkstäder kan bland annat hjälpa till med punktering, däckbyte, bromsservice, växeljustering, kedjebyte, komplett service, hjul och elcyklar. Beskriv symptomen så tydligt du kan och bifoga gärna bilder.</p>
          </div>

          <div className="sticker bg-card rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <ShieldCheck className="h-7 w-7 text-primary mb-3" />
              <h2 className="font-display text-2xl font-bold">Gratis, lokalt och utan konto</h2>
              <p className="text-muted-foreground mt-2">Skicka ärendet på cirka två minuter och välj själv om du vill gå vidare.</p>
            </div>
            <Button asChild><Link to={cityQuery(city)} onClick={() => trackCta('bottom')}>Starta förfrågan</Link></Button>
          </div>

          <section aria-labelledby="andra-stader">
            <h2 id="andra-stader" className="font-display text-2xl font-bold mb-4">Cykelhjälpen i fler städer</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {CYKEL_CITIES.filter((candidate) => candidate.name !== city).map((candidate) => {
                const image = getCityImage(candidate.name)
                return (
                  <Link
                    key={candidate.name}
                    to={cityLandingPath(candidate.name)}
                    className="group sticker rounded-2xl bg-card overflow-hidden hover:-translate-y-1 transition-transform"
                  >
                    <div className="aspect-[2/1] overflow-hidden">
                      <img
                        src={image.small}
                        alt={image.alt}
                        width={640}
                        height={387}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <span className="flex items-center justify-between gap-2 p-4 font-medium">
                      Cykelverkstad {candidate.name}
                      <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        </section>
      </main>
      <CykelFooter />
    </div>
  )
}

export default CykelCityLandingPage
