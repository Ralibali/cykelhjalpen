import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import UpdroNavbar from '@/components/Navbar'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import { getCurrentHost } from '@/lib/hostConfig'
import UpdroFooter from '@/components/Footer'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { setSEOMeta } from '@/lib/seoHelpers'
import { LEAD_FEE_KR } from '@/lib/pricing'

const TermsPage = () => {
  const isCykel = getCurrentHost() === 'cykelhjalpen'
  useEffect(() => {
    if (isCykel) return
    setSEOMeta({
      title: 'Allmänna villkor | Cykelhjälpen',
      description: 'Allmänna villkor för Cykelhjälpen.se — leadplattform för cykelreparation i Linköping, Norrköping, Uppsala och Lund.',
      canonical: 'https://cykelhjalpen.se/villkor',
    })
  }, [isCykel])
  return (
    <div className="min-h-screen flex flex-col">
      {isCykel && (
        <Helmet>
          <title>Allmänna villkor | Cykelhjälpen</title>
          <meta name="description" content="Allmänna villkor för Cykelhjälpen.se — leadplattform för cykelreparation i Linköping, Norrköping, Uppsala och Lund." />
          <link rel="canonical" href="https://cykelhjalpen.se/villkor" />
          <meta property="og:type" content="article" />
          <meta property="og:title" content="Allmänna villkor | Cykelhjälpen" />
          <meta property="og:description" content="Villkor för Cykelhjälpen.se — lokal leadplattform för cykelreparation." />
          <meta property="og:url" content="https://cykelhjalpen.se/villkor" />
          <meta property="og:image" content="https://cykelhjalpen.se/og/villkor.jpg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Allmänna villkor | Cykelhjälpen" />
          <meta name="twitter:description" content="Villkor för Cykelhjälpen.se." />
          <meta name="twitter:image" content="https://cykelhjalpen.se/og/villkor.jpg" />
        </Helmet>
      )}
      {isCykel ? <CykelNavbar /> : <UpdroNavbar />}
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">Allmänna villkor</h1>
          <p className="text-muted-foreground text-sm mb-8">Senast uppdaterad: 13 juli 2026</p>

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Om tjänsten</h2>
              <p>Cykelhjälpen.se (”Tjänsten”) drivs av <strong>Aurora Media AB</strong>, organisationsnummer 559272-0220, under namnet Cykelhjälpen. Bolagets registrerade postadress är Gustafstorpsvägen 42, 585 74 Ljungsbro.</p>
              <p className="mt-2">Tjänsten är en leadplattform där cyklister i Linköping, Norrköping, Uppsala och Lund kan beskriva ett cykelproblem och få upp till fem prisförslag från anslutna cykelverkstäder.</p>
              <p className="mt-2">Cykelhjälpen är en förmedlingsplattform och är inte part i avtalet mellan cyklist och verkstad. Ansvaret för utfört arbete, garanti och betalning ligger hos respektive part.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. För cyklister</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tjänsten är gratis för cyklister och kräver inget konto.</li>
                <li>Du förbinder dig att lämna korrekta uppgifter om ditt ärende och dina kontaktuppgifter.</li>
                <li>Maximalt fem verkstäder kan lämna ett betalt svar på ett ärende.</li>
                <li>Du väljer själv om du vill anlita någon av de verkstäder som svarar.</li>
                <li>Avtal om reparation, garanti och betalning ingås direkt mellan dig och verkstaden.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. För cykelverkstäder</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Du måste vara minst 18 år och behörig att ingå avtal å verkstadens vägnar.</li>
                <li>Verkstaden måste godkännas manuellt av Cykelhjälpen innan den får tillgång till ärenden.</li>
                <li>Du ansvarar för att uppgifterna i ditt konto är korrekta och uppdaterade.</li>
                <li>Du ansvarar för att lämnade prisförslag och utfört arbete uppfyller tillämplig svensk lagstiftning, bland annat konsumenttjänstlagen när kunden är konsument.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Lead-avgift och betalning för verkstäder</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Det är gratis att registrera och ansöka om godkännande som verkstad.</li>
                <li>Varje skickat prisförslag kostar <strong>{LEAD_FEE_KR} kr exklusive moms (62,50 kr inklusive moms)</strong> och debiteras via Stripe när verkstaden väljer att gå vidare.</li>
                <li>Moms beräknas utifrån tillämpliga skatteregler och de faktureringsuppgifter som lämnas i Stripe.</li>
                <li>Maximalt fem verkstäder kan svara per ärende. Först till kvarn gäller.</li>
                <li>Betalningsunderlag hanteras via Stripe.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Återbetalning och ångerrätt</h2>
              <p>Tjänsten som säljs till verkstäder är avsedd för näringsidkare. Konsumenters lagstadgade ångerrätt gäller därför normalt inte verkstadens köp av ett lead.</p>
              <p className="mt-2">Ett köp anses levererat när verkstadens prisförslag har registrerats som skickat och gjorts tillgängligt för kunden. Återbetalning kan medges om tjänsten inte har kunnat levereras på grund av ett tekniskt fel hos Cykelhjälpen eller om en betalning genomförts efter att ärendet redan blivit fullt. En sådan betalning ska normalt återföras automatiskt.</p>
              <p className="mt-2">Begäran om återbetalning görs till <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a> med uppgift om verkstad, datum och berört ärende.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Ansvarsbegränsning</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cykelhjälpen ansvarar inte för utfört arbete, garanti, tvister eller skador mellan cyklist och verkstad.</li>
                <li>Cykelhjälpen garanterar inte kvaliteten på verkstadens arbete eller att ett lämnat prisförslag leder till ett uppdrag.</li>
                <li>Cykelhjälpens ansvar gentemot en verkstad är, i den utsträckning tvingande lag tillåter, begränsat till det belopp verkstaden betalat till Cykelhjälpen under de senaste tolv månaderna.</li>
                <li>Cykelhjälpen ansvarar inte för indirekta skador, utebliven vinst eller förlust av data, utom när ansvaret följer av tvingande lag.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Förbjudet beteende</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Falska ärenden, falska verkstadsuppgifter eller manipulering av prisförslag.</li>
                <li>Försök att kringgå plattformens betalnings- eller behörighetssystem.</li>
                <li>Spam, trakasserier eller annan olämplig kommunikation.</li>
                <li>Automatiserad åtkomst, scraping eller bottar utan skriftligt tillstånd.</li>
              </ul>
              <p className="mt-1">Överträdelser kan leda till att ärenden tas bort eller att ett konto begränsas eller stängs av.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Personuppgifter</h2>
              <p>Behandling av personuppgifter beskrivs i vår <a href="/integritetspolicy" className="text-primary hover:underline">integritetspolicy</a>.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Tvistlösning och tillämplig lag</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Svensk lag tillämpas på dessa villkor.</li>
                <li>Tvister ska i första hand försöka lösas genom kontakt och förhandling.</li>
                <li>En konsument som har en tvist med en verkstad kan, när förutsättningarna är uppfyllda, vända sig till <strong>Allmänna reklamationsnämnden (ARN)</strong>: <a href="https://www.arn.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.arn.se</a>.</li>
                <li>Tvister mellan Cykelhjälpen och en verkstad avgörs, om de inte kan lösas genom förhandling, av svensk allmän domstol med Linköpings tingsrätt som första instans.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Ändringar av villkoren</h2>
              <p>Vi kan ändra villkoren när tjänsten, priserna eller rättsliga krav förändras. Väsentliga ändringar som påverkar registrerade verkstäder meddelas i rimlig tid via e-post eller notis i tjänsten.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">11. Kontakt</h2>
              <p>Aurora Media AB<br />
              Organisationsnummer: 559272-0220<br />
              Gustafstorpsvägen 42<br />
              585 74 Ljungsbro<br />
              E-post: <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a></p>
            </div>
          </section>
        </article>
      </main>
      {getCurrentHost() === 'cykelhjalpen' ? <CykelFooter /> : <UpdroFooter />}
    </div>
  )
}

export default TermsPage