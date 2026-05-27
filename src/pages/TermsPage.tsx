import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { setSEOMeta } from '@/lib/seoHelpers'
import { LEAD_FEE_KR } from '@/lib/pricing'


const TermsPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Allmänna villkor | Cykelhjälpen',
      description: 'Allmänna villkor för Cykelhjälpen.se — lokal leadplattform för cykelreparation i Linköping.',
      canonical: 'https://cykelhjalpen.se/villkor',
    })
  }, [])
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">Allmänna villkor</h1>
          <p className="text-muted-foreground text-sm mb-8">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}</p>

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Om tjänsten</h2>
              <p>Cykelhjälpen.se ("Tjänsten") drivs av Cykelhjälpen, med säte i Linköping. Tjänsten är en lokal leadplattform där cyklister i Linköping kan beskriva ett cykelproblem och få upp till fem prisförslag från anslutna cykelverkstäder.</p>
              <p className="mt-2">Cykelhjälpen är en förmedlingsplattform och är inte part i avtalet mellan cyklist och verkstad. Ansvaret för utfört arbete, garanti och betalning ligger hos respektive part.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. För cyklister</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Tjänsten är helt gratis för cyklister och kräver inget konto.</li>
                <li>Du förbinder dig att lämna korrekta uppgifter om ditt ärende och dina kontaktuppgifter.</li>
                <li>Dina kontaktuppgifter delas med en verkstad först efter att verkstaden har betalat lead-avgiften (se §4). Maximalt fem verkstäder per ärende får dina kontaktuppgifter.</li>
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
                <li>Du ansvarar för att lämnade offerter och utfört arbete uppfyller svensk konsumentlagstiftning, inklusive Konsumenttjänstlagen och Köplagen där den är tillämplig.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Lead-avgift och betalning (verkstäder)</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Det är gratis att registrera och godkänna en verkstad.</li>
                <li>Varje skickad offert kostar <strong>{LEAD_FEE_KR} kr exklusive moms (62,50 kr inkl. moms)</strong> och debiteras via Stripe vid avsändandet.</li>
                <li>Moms beräknas automatiskt baserat på verkstadens fakturaadress.</li>
                <li>Maximalt fem verkstäder kan svara per ärende — först-till-kvarn-principen gäller.</li>
                <li>När verkstaden har betalat lead-avgiften frigörs cyklistens kontaktuppgifter i verkstadens dashboard.</li>
                <li>Fakturor och kvitton finns tillgängliga i verkstadens dashboard.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Ångerrätt</h2>
              <p>Enligt <strong>Distansavtalslagen (2005:59)</strong> har konsumenter 14 dagars ångerrätt från det att avtalet ingicks. Cykelhjälpen riktar sig till verkstäder som näringsidkare (B2B) — ångerrätten gäller därför normalt inte verkstadsavtalet.</p>
              <p className="mt-2">För den enskilda offert som verkstaden betalat lead-avgift för: tjänsten anses påbörjad och levererad i samma stund som offerten skickas och cyklistens kontaktuppgifter frigörs. Återbetalning av lead-avgift sker endast om cyklistens kontaktuppgifter saknas eller är felaktiga och Cykelhjälpen inte kan tillhandahålla rättade uppgifter inom sju dagar.</p>
              <p className="mt-2">Ångerrätt eller återbetalning utövas genom att kontakta <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a>. Adress för skriftlig kontakt: Cykelhjälpen, c/o info@auroramedia.se, Linköping.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Ansvarsbegränsning</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cykelhjälpen ansvarar inte för utfört arbete, garanti, tvister eller skador mellan cyklist och verkstad.</li>
                <li>Cykelhjälpen garanterar inte kvaliteten på verkstadens arbete eller cyklistens betalningsförmåga.</li>
                <li>Cykelhjälpens totala ansvar gentemot en verkstad är begränsat till det belopp verkstaden betalat till Cykelhjälpen de senaste tolv månaderna.</li>
                <li>Cykelhjälpen ansvarar inte för indirekta skador, utebliven vinst eller förlust av data.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Förbjudet beteende</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Falska ärenden, falska verkstadsuppgifter eller manipulering av offerter.</li>
                <li>Försök att kringgå plattformens betalningssystem (t.ex. genom att kontakta cyklisten utanför plattformen innan lead-avgiften är betald).</li>
                <li>Spam, trakasserier eller annan olämplig kommunikation.</li>
                <li>Automatiserad åtkomst (scraping, bots) utan skriftligt tillstånd.</li>
              </ul>
              <p className="mt-1">Överträdelser kan leda till avstängning av kontot utan föregående varning.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Personuppgifter</h2>
              <p>Behandling av personuppgifter beskrivs i vår <a href="/integritetspolicy" className="text-primary hover:underline">integritetspolicy</a>.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Tvistlösning och tillämplig lag</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Svensk lag tillämpas på dessa villkor.</li>
                <li>Tvister ska i första hand lösas genom förhandling.</li>
                <li>Konsumenter kan vända sig till <strong>Allmänna reklamationsnämnden (ARN)</strong>: <a href="https://www.arn.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.arn.se</a></li>
                <li>EU:s plattform för tvistlösning online: <a href="https://ec.europa.eu/odr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/odr</a></li>
                <li>Om tvisten inte kan lösas genom förhandling avgörs den av svensk allmän domstol med Linköpings tingsrätt som första instans.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Ändringar av villkoren</h2>
              <p>Vi förbehåller oss rätten att ändra dessa villkor. Väsentliga ändringar meddelas verkstäder minst 30 dagar i förväg via e-post eller notis i tjänsten. Fortsatt användning av tjänsten efter ändringsperioden innebär att verkstaden accepterar de uppdaterade villkoren.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">11. Kontakt</h2>
              <p>Cykelhjälpen<br />
              Säte: Linköping<br />
              E-post: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a></p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export default TermsPage
