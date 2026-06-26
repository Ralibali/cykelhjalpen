import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Wrench, TrendingUp, Users, Bell, CheckCircle2, ArrowRight, MapPin } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Button } from '@/components/ui/button'
import { CYKEL_CITIES } from '@/lib/cykelCities'
import { LEAD_FEE_KR } from '@/lib/pricing'

const benefits = [
  { icon: Users, title: 'Lokala kunder', text: 'Ta emot relevanta förfrågningar från cyklister i den stad där ni arbetar.' },
  { icon: Bell, title: 'Notiser direkt', text: 'Få mejl och valfria SMS när ett godkänt ärende matchar er stad.' },
  { icon: TrendingUp, title: 'Fyll luckor i kalendern', text: 'Välj själv vilka jobb som passar er kapacitet, kompetens och säsong.' },
  { icon: Wrench, title: 'En enkel verkstadsvy', text: 'Hantera ärenden, offerter, betalningar och kontaktuppgifter på ett ställe.' },
]

const steps = [
  'Registrera verkstaden gratis och välj vilken stad ni arbetar i.',
  'Efter manuell granskning får ni lokala ärenden via mejl och valfria SMS.',
  `Skriv pris och tid. ${LEAD_FEE_KR} kr exkl. moms debiteras via Stripe först när offerten skickas.`,
  'Kundens kontaktuppgifter frigörs när offerten är betald och skickad.',
]

const ForVerkstaderPage = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Få fler kunder till din cykelverkstad | Cykelhjälpen</title>
      <meta name="description" content="Anslut din cykelverkstad i Linköping, Norrköping, Uppsala eller Lund. Gratis registrering och betalning endast per skickad offert." />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href="https://cykelhjalpen.se/for-cykelverkstader" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="För cykelverkstäder | Cykelhjälpen" />
      <meta property="og:description" content="Få lokala cykelförfrågningar utan månadsavgift." />
      <meta property="og:url" content="https://cykelhjalpen.se/for-cykelverkstader" />
      <meta property="og:image" content="https://cykelhjalpen.se/og/for-cykelverkstader.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>

    <CykelNavbar />
    <main>
      <section className="container mx-auto px-4 pt-14 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-[1fr_.75fr] gap-10 items-center max-w-6xl mx-auto">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-6">
              <Wrench className="h-4 w-4" /> För cykelverkstäder
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Få fler lokala cykelkunder – utan månadsavgift
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
              Cykelhjälpen skickar relevanta, granskade ärenden från cyklister i er stad. Ni väljer själva om och när ni vill lämna offert.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="cta-playful"><Link to="/registrera/verkstad">Registrera verkstaden <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/#sa-fungerar-det">Se kundflödet</Link></Button>
            </div>
          </div>

          <div className="sticker bg-card rounded-3xl p-7">
            <p className="text-sm font-semibold mb-4">Tillgängliga städer</p>
            <div className="grid grid-cols-2 gap-3">
              {CYKEL_CITIES.map((city) => (
                <div key={city.name} className="rounded-xl bg-muted/60 p-3 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" /> {city.name}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-5">Verkstaden väljer stad och får lokala ärenden från det området.</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10 text-center">Därför ansluter verkstäder sig</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="sticker rounded-2xl bg-card p-6">
              <benefit.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10 text-center">Så fungerar det</h2>
        <div className="max-w-2xl mx-auto space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="sticker rounded-2xl bg-card p-5 flex items-start gap-4">
              <span className="shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">{index + 1}</span>
              <p className="text-base md:text-lg pt-1.5">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="sticker rounded-[2rem] bg-card p-8 md:p-14 max-w-3xl mx-auto text-center">
          <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Redo att ta emot fler lokala ärenden?</h2>
          <p className="text-lg text-muted-foreground mb-8">Registreringen är gratis och ni bestämmer helt själva vilka jobb ni vill svara på.</p>
          <Button asChild size="lg" className="cta-playful"><Link to="/registrera/verkstad">Kom igång nu <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </main>
    <CykelFooter />
  </div>
)

export default ForVerkstaderPage
