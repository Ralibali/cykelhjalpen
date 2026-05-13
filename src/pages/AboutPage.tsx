import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Building2, Target, Users, Heart, MapPin, ShieldCheck } from 'lucide-react'
import { setSEOMeta, setJsonLd } from '@/lib/seoHelpers'
import { Link } from 'react-router-dom'

const values = [
  { icon: Target, title: 'Transparens', desc: 'Inga dolda avgifter eller låsningar – du ser alltid vad du betalar för.' },
  { icon: Users, title: 'Kvalitet före kvantitet', desc: 'Vi granskar varje byrå och uppdrag för att säkerställa en hög standard.' },
  { icon: Heart, title: 'Lokal förankring', desc: 'Vi fokuserar på den svenska marknaden och förstår lokala behov.' },
  { icon: Building2, title: 'Partnerskap', desc: 'Vi lyckas bara när våra kunder och byråer lyckas – det driver allt vi gör.' },
]

const AboutPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Om Updro – Sveriges marknadsplats för digitala byråer',
      description:
        'Updro kopplar samman företag med rätt digitala byråer – snabbt, tryggt och kostnadsfritt. Läs om grundaren, vår metod och våra värderingar.',
      canonical: 'https://updro.se/om-oss',
    })
    setJsonLd('aboutpage-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      url: 'https://updro.se/om-oss',
      name: 'Om Updro',
      description:
        'Updro är en svensk marknadsplats där företag jämför offerter från kvalitetssäkrade digitala byråer.',
      mainEntity: {
        '@type': 'Organization',
        '@id': 'https://updro.se/#organization',
        name: 'Updro',
        legalName: 'Aurora Media AB',
        url: 'https://updro.se',
        email: 'info@auroramedia.se',
        founder: { '@type': 'Person', name: 'Christoffer Daranyi' },
        foundingDate: '2026',
        address: { '@type': 'PostalAddress', addressCountry: 'SE', addressLocality: 'Linköping' },
        taxID: '559272-0220',
      },
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero – AI-friendly answer-first paragraph */}
        <section className="bg-muted/40 py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">Om Updro</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Updro är en svensk marknadsplats där företag publicerar digitala uppdrag och får upp till fem offerter
              från kvalitetssäkrade byråer inom 24 timmar. Tjänsten är gratis för uppdragsgivare, drivs av Aurora Media
              AB och har sitt säte i Linköping.
            </p>
          </div>
        </section>

        {/* Founder + story */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto space-y-6 text-foreground/85 leading-relaxed">
            <h2 className="font-display text-2xl font-semibold text-foreground">Vår historia</h2>
            <p>
              Updro startades 2026 av Christoffer Daranyi, som drivit digitala projekt i Sverige sedan 2010 och tidigare
              grundat Aurora Media AB. Insikten kom från egen erfarenhet: att hitta rätt digital byrå är onödigt
              krångligt. Företag lägger timmar på research, möten och offerter – ofta utan att veta om de pratar med
              rätt byrå för just sitt projekt.
            </p>
            <p>
              Vi byggde Updro för att lösa det. Genom att låta uppdragsgivare publicera sitt projekt och ta emot
              offerter från granskade byråer sparar vi tid för båda parter. Byråerna får relevanta leads utan
              kallakvirering, och beställarna får jämförbara offerter utan att googla i dagar.
            </p>

            <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
              <MapPin className="h-4 w-4" />
              Säte i Linköping · Aktiv över hela Sverige
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-muted/40 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-2xl font-semibold text-foreground text-center mb-10">Våra värderingar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map(v => (
                <div key={v.title} className="bg-card rounded-xl border p-6 flex gap-4 items-start">
                  <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{v.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{v.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quality assurance */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h2 className="font-display text-2xl font-semibold text-foreground">Så kvalitetssäkrar vi byråer</h2>
            </div>
            <p className="text-foreground/85 leading-relaxed">
              Vi släpper bara in byråer som klarar fyra grundkrav: aktivt svenskt företag med F-skatt, godkänd
              kreditkontroll, minst tre publicerbara case och en namngiven kontaktperson som svarar på telefon. Varje
              ansökan granskas manuellt av en människa innan byrån blir synlig på plattformen.
            </p>
            <p className="text-foreground/85 leading-relaxed mt-3">
              Den fullständiga processen finns dokumenterad på{' '}
              <Link to="/metod" className="text-primary underline">
                Vår metod
              </Link>
              . Hur vi jobbar med innehåll – källor, AI och rättelser – beskrivs i{' '}
              <Link to="/redaktionell-policy" className="text-primary underline">
                Redaktionell policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-muted/40 py-16 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <h2 className="font-display text-2xl font-semibold text-foreground">Kontakta oss</h2>
            <p className="text-muted-foreground">
              Har du frågor, klagomål eller vill veta mer? Hör av dig till{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary hover:underline font-medium">
                info@auroramedia.se
              </a>
            </p>
            <p className="text-sm text-muted-foreground">Aurora Media AB · Org.nr 559272-0220 · Sverige</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default AboutPage
