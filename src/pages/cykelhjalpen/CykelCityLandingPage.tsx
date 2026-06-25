import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Bike, CheckCircle2, MapPin, ShieldCheck, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { cityQuery, getCykelCity, type CykelCityName } from '@/lib/cykelCities'

const CITY_CONTENT: Record<CykelCityName, { areas: string; student: string }> = {
  Linköping: {
    areas: 'Innerstaden, Ryd, Vallastaden, Lambohov och Ekholmen',
    student: 'Campus Valla och de stora cykelstråken gör cykeln viktig för både studenter och pendlare.',
  },
  Norrköping: {
    areas: 'Centrum, Hageby, Kneippen, Vilbergen och Ingelsta',
    student: 'Campus Norrköping, Resecentrum och de täta stadsdelarna gör cykeln till ett naturligt transportmedel.',
  },
  Uppsala: {
    areas: 'Flogsta, Luthagen, Sala backe, Kåbo och Årsta',
    student: 'Uppsala är en av Sveriges största cykel- och studentstäder, där många är beroende av en fungerande vardagscykel.',
  },
  Lund: {
    areas: 'Delphi, Vildanden, Klostergården, Norra Fäladen och Centrum',
    student: 'Lunds kompakta centrum och stora studentliv gör cykeln central för resor mellan bostad, universitet och station.',
  },
}

const CykelCityLandingPage = ({ city }: { city: CykelCityName }) => {
  const cityData = getCykelCity(city)
  const content = CITY_CONTENT[city]
  const canonical = `https://cykelhjalpen.se/cykelverkstad-${cityData.slug}`

  useEffect(() => {
    document.querySelector('meta[name="prerender-status-code"]')?.remove()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Cykelverkstad {city} – jämför lokala prisförslag</title>
        <meta name="description" content={`Hitta cykelverkstad i ${city}. Beskriv problemet gratis och jämför pris och tid från lokala verkstäder utan konto.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`Cykelverkstad ${city} – jämför lokala prisförslag`} />
        <meta property="og:description" content={`Få lokala prisförslag på cykelreparation i ${city}. Gratis och utan konto.`} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://cykelhjalpen.se/og/hem.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `Cykelreparation i ${city}`,
          areaServed: { '@type': 'City', name: city },
          provider: { '@type': 'Organization', name: 'Cykelhjälpen', url: 'https://cykelhjalpen.se' },
        })}</script>
      </Helmet>

      <CykelNavbar />
      <main>
        <section className="container mx-auto px-4 py-14 md:py-24 max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium mb-6">
            <MapPin className="h-4 w-4 text-primary" /> {city}
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight max-w-4xl">
            Cykelverkstad i {city} – jämför innan du väljer
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed">
            Beskriv problemet en gång och få pris, tid och kontaktuppgifter från godkända cykelverkstäder i {city}. Tjänsten är gratis för dig som cyklist.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-full h-14 px-8">
            <Link to={cityQuery(city)}>Få prisförslag i {city} <ArrowRight className="h-4 w-4 ml-2" /></Link>
          </Button>
        </section>

        <section className="bg-muted/40 py-16">
          <div className="container mx-auto px-4 max-w-5xl grid md:grid-cols-3 gap-5">
            {[
              { icon: Bike, title: 'Beskriv cykeln', text: 'Välj problem, brådska och lägg gärna till bilder.' },
              { icon: Wrench, title: 'Lokala verkstäder svarar', text: `Ärendet matchas med godkända verkstäder i ${city}.` },
              { icon: CheckCircle2, title: 'Du väljer själv', text: 'Jämför pris och tid utan köpplikt eller konto.' },
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
            <p className="text-muted-foreground mt-3 leading-relaxed">Vi hjälper cyklister i bland annat {content.areas}. Ärendet granskas innan det skickas vidare och matchningen utgår från den stad du väljer.</p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">För studenter och pendlare</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{content.student} Punktering, bromsar, växlar och kedjeproblem kan snabbt störa vardagen, därför är det värdefullt att kunna jämföra lokala alternativ.</p>
          </div>
          <div className="sticker bg-card rounded-2xl p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <ShieldCheck className="h-7 w-7 text-primary mb-3" />
              <h2 className="font-display text-2xl font-bold">Gratis, lokalt och utan konto</h2>
              <p className="text-muted-foreground mt-2">Skicka ärendet på cirka två minuter.</p>
            </div>
            <Button asChild><Link to={cityQuery(city)}>Starta förfrågan</Link></Button>
          </div>
        </section>
      </main>
      <CykelFooter />
    </div>
  )
}

export default CykelCityLandingPage
