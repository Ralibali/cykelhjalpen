import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Wrench, TrendingUp, Users, Bell, CheckCircle2, ArrowRight } from 'lucide-react'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Button } from '@/components/ui/button'

const benefits = [
  { icon: Users, title: 'Nya kunder varje vecka', text: 'Cyklister i Linköping skickar in ärenden direkt till din verkstad utan att du behöver lyfta ett finger.' },
  { icon: Bell, title: 'Notiser i realtid', text: 'Du får ett mejl direkt när ett nytt ärende landar i ditt område. Svara snabbt och vinn jobbet.' },
  { icon: TrendingUp, title: 'Fyll luckorna i kalendern', text: 'Perfekt för lågsäsong eller dagar då bokningen är tunn. Du bestämmer själv vilka jobb du tar.' },
  { icon: Wrench, title: 'Anpassat för verkstäder', text: 'Hantera ärenden, ge offerter och kommunicera med kunden från en enkel dashboard.' },
]

const steps = [
  'Registrera din verkstad gratis på under fem minuter.',
  'Få ärenden från cyklister i Linköping direkt i din inkorg.',
  'Skicka offert (femtio kronor exkl. moms per skickad offert, max fem verkstäder per ärende). Vinner du jobbet får du betalt direkt av kunden.',
]

const ForVerkstaderPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>För cykelverkstäder i Linköping | Cykelhjälpen</title>
        <meta name="description" content="Anslut din cykelverkstad till Cykelhjälpen och få nya kunder i Linköping. Gratis att registrera. Du betalar femtio kronor exkl. moms per skickad offert — max fem verkstäder per ärende." />
        <link rel="canonical" href="https://cykelhjalpen.se/for-cykelverkstader" />
      </Helmet>

      <CykelNavbar />

      <main>
        <section className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/15 text-accent text-sm font-semibold mb-6">
              För cykelverkstäder
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Få fler cykelkunder i Linköping — utan extra marknadsföring
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Cykelhjälpen kopplar samman cyklister med verkstäder i Linköping. Vi skickar ärendena, du gör det du är bäst på.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="cta-playful">
                <Link to="/registrera/verkstad">
                  Registrera din verkstad <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">Läs mer om Cykelhjälpen</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">Därför ansluter verkstäder sig</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="sticker rounded-2xl bg-card p-6">
                <b.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{b.title}</h3>
                <p className="text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">Så fungerar det</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {steps.map((s, i) => (
              <div key={i} className="sticker rounded-2xl bg-card p-5 flex items-start gap-4">
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-lg pt-1.5">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="sticker rounded-[2rem] bg-card p-8 md:p-14 max-w-3xl mx-auto text-center">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Redo att ta emot fler ärenden?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Det är gratis att registrera sig. Du bestämmer själv vilka ärenden du tar och vad de kostar.
            </p>
            <Button asChild size="lg" className="cta-playful">
              <Link to="/registrera/verkstad">
                Kom igång nu <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <CykelFooter />
    </div>
  )
}

export default ForVerkstaderPage
