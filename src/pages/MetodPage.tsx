import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { setSEOMeta } from '@/lib/seoHelpers'
import { ShieldCheck, FileSearch, UserCheck, Ban } from 'lucide-react'

const checks = [
  {
    icon: FileSearch,
    title: 'Portfolio och referenser',
    body: 'Vi går igenom byråns publika case och pratar med minst en namngiven kund innan godkännande. Tunna portfolios eller refuserade referenser stoppar ansökan.',
  },
  {
    icon: ShieldCheck,
    title: 'Verifiering av organisationsnummer',
    body: 'Vi kontrollerar org.nr mot Bolagsverkets register. F-skatt och momsregistrering kontrolleras via Skatteverket. Aktiv styrelse är ett krav.',
  },
  {
    icon: UserCheck,
    title: 'Mänsklig granskning',
    body: 'Varje byråprofil granskas manuellt av en person innan den blir synlig. Vi godkänner inte byråer baserat enbart på automatiska signaler.',
  },
  {
    icon: Ban,
    title: 'Vad vi inte gör',
    body: 'Vi sätter inte påhittade betyg, säljer inte kontaktuppgifter utan samtycke och tar inte betalt för "topplaceringar". Sortering är saklig.',
  },
]

const MetodPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Vår metod – så kvalitetssäkrar Updro byråer',
      description:
        'Så granskar Updro digitala byråer innan de släpps in på plattformen. Verifiering av org.nr, portfolio, referenser och mänsklig granskning.',
      canonical: 'https://updro.se/metod',
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-16 max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Vår metod</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Updro är en marknadsplats där köpare litar på att byråerna är riktiga företag. Här är hur vi granskar dem
            innan de släpps in på plattformen.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            {checks.map(c => (
              <div key={c.title} className="bg-card rounded-2xl border p-6">
                <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mt-4">{c.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>

          <section className="mt-12 bg-muted/40 rounded-2xl p-6 md:p-8">
            <h2 className="font-display text-2xl font-semibold text-foreground">Vad gör en byrå "kvalitetssäkrad"?</h2>
            <p className="mt-3 text-foreground/85 leading-relaxed">
              I praktiken: aktivt företag i Sverige, F-skatt, godkänd kreditkontroll, minst tre case, en namngiven
              kontaktperson och en kund som vill stå som referens. Det är inte ett kvalitetslöfte om enskilda projekt –
              det är en filtrerande första nivå så att du som köpare slipper sortera ut bolag som inte borde driva
              verksamhet alls.
            </p>
            <p className="mt-3 text-foreground/85 leading-relaxed">
              Slutbedömningen av om en byrå passar ditt projekt gör du själv när du jämför offerter. Vi rekommenderar
              alltid att prata med minst två innan du väljer.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold text-foreground">Klagomål och avskrivning</h2>
            <p className="mt-3 text-foreground/85 leading-relaxed">
              Får vi återkommande klagomål om en byrå – sena leveranser, oklara fakturor, avsaknad av support – startar
              vi en granskning. I allvarliga fall stänger vi byrån från plattformen. Klagomål skickas till{' '}
              <a href="mailto:info@auroramedia.se" className="text-primary underline">
                info@auroramedia.se
              </a>
              .
            </p>
          </section>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default MetodPage
