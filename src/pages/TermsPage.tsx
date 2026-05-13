import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { setSEOMeta } from '@/lib/seoHelpers'

const TermsPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Allmänna villkor | Updro',
      description: 'Läs Updros allmänna villkor för användning av tjänsten. Gäller för både beställare och byråer.',
      canonical: 'https://updro.se/villkor',
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
              <p>Updro.se ("Tjänsten") drivs av Aurora Media AB, org.nr. 559272-0220, och är en marknadsplats som förmedlar kontakt mellan beställare av digitala tjänster och byråer/konsulter ("Leverantörer").</p>
              <p className="mt-2">Updro är en förmedlingsplattform och inte part i avtal som ingås mellan beställare och leverantörer. Ansvaret för leverans, kvalitet och betalning ligger hos respektive part.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Registrering och konto</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Du måste vara minst 18 år och behörig att ingå avtal.</li>
                <li>Juridiska personer måste registreras av en behörig företrädare.</li>
                <li>Du ansvarar för att uppgifterna i ditt konto är korrekta och uppdaterade.</li>
                <li>Du ansvarar för all aktivitet som sker under ditt konto.</li>
                <li>Det är inte tillåtet att skapa fler än ett konto per person/organisation.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Beställare</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Det är gratis att publicera uppdrag och ta emot offerter.</li>
                <li>Du förbinder dig att lämna korrekta och tillräckliga uppgifter om ditt uppdrag.</li>
                <li>Du ansvarar för att utvärdera och välja leverantör.</li>
                <li>Avtal om leverans ingås direkt mellan dig och leverantören.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Leverantörer (byråer/konsulter)</h2>
              <h3 className="font-semibold text-foreground mt-3 mb-1">4.1 Provperiod</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nya leverantörer erbjuds en kostnadsfri provperiod med fem lead-krediter under sju dagar.</li>
                <li>Provperioden avslutas automatiskt efter sju dagar eller när alla fem leads har använts.</li>
                <li>Inget kreditkort krävs under provperioden.</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-3 mb-1">4.2 Priser och betalning</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Pay as you go:</strong> 119 kr per lead (öppningserbjudande, exkl. moms)</li>
                <li><strong>Standard:</strong> 699 kr/månad, tio leads inkluderat (exkl. moms)</li>
                <li><strong>Premium:</strong> 1 490 kr/månad, obegränsat antal leads (exkl. moms)</li>
                <li>Alla priser anges i svenska kronor, exklusive moms om inte annat anges.</li>
                <li>Betalning sker via Stripe. Du ansvarar för att giltiga betalningsuppgifter finns.</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-3 mb-1">4.3 Fakturering</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Abonnemang faktureras månadsvis i förskott.</li>
                <li>Enskilda leads faktureras vid köp.</li>
                <li>Fakturor finns tillgängliga i ditt konto under Fakturering.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Ångerrätt</h2>
              <p>Enligt <strong>Distansavtalslagen (2005:59)</strong> har konsumenter 14 dagars ångerrätt från det att avtalet ingicks.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Ångerrätten gäller för prenumerationer (Standard/Premium-planer).</li>
                <li>Ångerrätten gäller <strong>inte</strong> för enskilda lead-köp (Pay as you go) som redan har levererats/använts, eftersom tjänsten har påbörjats med konsumentens uttryckliga samtycke (Art. 16c Konsumenträttsdirektivet).</li>
                <li>För att utöva ångerrätten, kontakta oss på <a href="mailto:support@updro.se" className="text-primary hover:underline">support@updro.se</a> inom 14 dagar.</li>
                <li>Återbetalning sker inom 14 dagar efter mottaget ångermeddelande, till samma betalningsmetod.</li>
              </ul>

              <div className="bg-muted/50 rounded-xl p-4 mt-3 border">
                <h4 className="font-semibold text-foreground text-xs mb-2">📋 Ångerblankett</h4>
                <p className="text-xs">Du kan använda Konsumentverkets standardblankett för att utöva ångerrätten. Skicka den till <a href="mailto:support@updro.se" className="text-primary hover:underline">support@updro.se</a> eller per post till Aurora Media AB, [Adress].</p>
                <p className="text-xs mt-1">Mall: "Jag meddelar härmed att jag frånträder mitt avtal om följande tjänst: [ange tjänst]. Beställt den: [datum]. Konsumentens namn och adress: [dina uppgifter]. Datum och underskrift."</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Uppsägning av abonnemang</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Du kan säga upp ditt abonnemang när som helst via Fakturering i ditt konto.</li>
                <li>Uppsägningen träder i kraft vid utgången av innevarande betalperiod.</li>
                <li>Inga bindningstider gäller.</li>
                <li>Outnyttjade lead-krediter återbetalas inte vid uppsägning.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Betalningsskydd (valfritt)</h2>
              <p>Updro erbjuder valfritt betalningsskydd (escrow) där beställaren kan välja att sätta in projektbeloppet hos Updro.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Beloppet hålls av Updro tills beställaren godkänner leveransen.</li>
                <li>Updros serviceavgift är 4% av projektbeloppet.</li>
                <li>Vid godkänd leverans utbetalas beloppet minus serviceavgift till leverantören.</li>
                <li>Vid tvist medierar Updro mellan parterna. Updros beslut är vägledande men inte rättsligt bindande.</li>
                <li>Betalningsskyddet är helt valfritt — beställare kan välja att betala direkt till leverantören.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Ansvarsbegränsning</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Updro ansvarar inte för avtal, leveranser eller tvister mellan beställare och leverantörer.</li>
                <li>Updro garanterar inte kvaliteten på leverantörers arbete eller beställares betalningsförmåga.</li>
                <li>Updros totala ansvar gentemot dig är begränsat till det belopp du betalat till Updro de senaste 12 månaderna.</li>
                <li>Updro ansvarar inte för indirekta skador, utebliven vinst eller förlust av data.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Upphovsrätt och innehåll</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Du behåller alla rättigheter till det innehåll du laddar upp.</li>
                <li>Du ger Updro en icke-exklusiv, avgiftsfri licens att visa ditt innehåll på plattformen.</li>
                <li>Du ansvarar för att du har rätt att publicera det innehåll du laddar upp.</li>
                <li>Updro förbehåller sig rätten att ta bort innehåll som bryter mot dessa villkor.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Förbjudet beteende</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Falska uppgifter, manipulering av omdömen eller missbruk av tjänsten.</li>
                <li>Försök att kringgå plattformens betalningssystem.</li>
                <li>Spam, trakasserier eller annan olämplig kommunikation.</li>
                <li>Automatiserad åtkomst (scraping, bots) utan skriftligt tillstånd.</li>
              </ul>
              <p className="mt-1">Överträdelser kan leda till avstängning av kontot utan föregående varning.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">11. Tvistlösning och tillämplig lag</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Svensk lag tillämpas på dessa villkor.</li>
                <li>Tvister ska i första hand lösas genom förhandling.</li>
                <li>Konsumenter kan vända sig till <strong>Allmänna reklamationsnämnden (ARN)</strong>: <a href="https://www.arn.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.arn.se</a></li>
                <li>EU:s plattform för tvistlösning online: <a href="https://ec.europa.eu/odr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">ec.europa.eu/odr</a></li>
                <li>Om tvisten inte kan lösas genom förhandling eller ARN, avgörs den av svensk allmän domstol.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">12. Ändringar av villkoren</h2>
              <p>Vi förbehåller oss rätten att ändra dessa villkor. Väsentliga ändringar meddelas minst 30 dagar i förväg via e-post eller notis i tjänsten. Fortsatt användning av tjänsten efter ändringsperioden innebär att du accepterar de uppdaterade villkoren.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">13. Kontakt</h2>
              <p>Aurora Media AB<br />
              E-post: <a href="mailto:support@updro.se" className="text-primary hover:underline">support@updro.se</a><br />
              Organisationsnummer: 559272-0220</p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export default TermsPage
