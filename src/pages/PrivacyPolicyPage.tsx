import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { setSEOMeta } from '@/lib/seoHelpers'

const PrivacyPolicyPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Integritetspolicy | Updro',
      description: 'Läs Updros integritetspolicy. Här beskriver Aurora Media AB hur personuppgifter hanteras enligt GDPR.',
      canonical: 'https://updro.se/integritetspolicy',
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">Integritetspolicy</h1>
          <p className="text-muted-foreground text-sm mb-8">Senast uppdaterad: 2026-05-03</p>

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Personuppgiftsansvarig</h2>
              <p><strong>Aurora Media AB</strong>, org.nr. <strong>559272-0220</strong>, är personuppgiftsansvarig för behandlingen av personuppgifter på Updro och updro.se.</p>
              <p className="mt-1">Kontakt: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a></p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Vilka uppgifter vi behandlar</h2>
              <p>Vilka uppgifter vi behandlar beror på hur du använder tjänsten.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Kontakt- och kontouppgifter:</strong> namn, e-postadress, telefonnummer, företagsnamn, stad och roll.</li>
                <li><strong>Uppdragsinformation:</strong> projektbeskrivning, budget, tidsplan, bransch, önskade tjänster och övrig information du lämnar i formulär.</li>
                <li><strong>Byråprofil:</strong> företagsuppgifter, presentation, kategorier, webbplats, portfolio och annan information som byråer själva anger.</li>
                <li><strong>Kommunikation:</strong> meddelanden, offerter och annan kontakt mellan beställare, byråer och Updro.</li>
                <li><strong>Betalnings- och transaktionsuppgifter:</strong> betalstatus, abonnemang, fakturaunderlag och kvitton. Kortuppgifter hanteras av Stripe och lagras inte av oss.</li>
                <li><strong>Teknisk information:</strong> IP-adress, webbläsare, enhet, loggar, säkerhetshändelser och cookieval.</li>
                <li><strong>Analys- och marknadsföringsdata:</strong> sidvisningar, konverteringar och kampanjdata om du samtycker till sådana cookies.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Varför vi behandlar uppgifter och rättslig grund</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Tillhandahålla tjänsten:</strong> skapa konto, publicera uppdrag, matcha beställare och byråer, hantera offerter och meddelanden. Rättslig grund: avtal eller åtgärder innan avtal.</li>
                <li><strong>Kundservice och drift:</strong> svara på frågor, felsöka, skydda tjänsten och förebygga missbruk. Rättslig grund: berättigat intresse.</li>
                <li><strong>Betalning och bokföring:</strong> hantera betalningar, kvitton, fakturor och redovisning. Rättslig grund: avtal och rättslig förpliktelse.</li>
                <li><strong>Analys:</strong> förstå hur webbplatsen används och förbättra tjänsten. Rättslig grund: samtycke när icke-nödvändiga cookies används.</li>
                <li><strong>Marknadsföring och konverteringsmätning:</strong> mäta effekten av annonser och förbättra relevansen i marknadsföring. Rättslig grund: samtycke för cookies och liknande teknik.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Cookies, Google Analytics och Google Ads</h2>
              <p>Vi använder nödvändiga cookies för att webbplatsen ska fungera och för att spara ditt cookieval. Analys- och marknadsföringscookies laddas först om du aktivt väljer att acceptera dem i cookie-bannern.</p>
              <p className="mt-2">Efter samtycke kan vi använda Google Analytics och Google Ads för statistik, konverteringsmätning och marknadsföringsanalys. Google-taggen laddas inte för analys eller annonsering innan sådant samtycke har lämnats.</p>
              <p className="mt-2">Du kan när som helst ändra ditt val via knappen “Cookieinställningar” på webbplatsen.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Delning av uppgifter</h2>
              <p>Vi delar endast personuppgifter när det behövs för tjänsten, drift, säkerhet, betalning eller lagkrav.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Beställare och byråer:</strong> relevanta uppgifter delas mellan parter i ett uppdrag för att möjliggöra kontakt, offert och leverans.</li>
                <li><strong>Stripe:</strong> betalningshantering, abonnemang och transaktionsunderlag.</li>
                <li><strong>Supabase/Lovable:</strong> hosting, databas, autentisering och teknisk drift.</li>
                <li><strong>Google:</strong> analys och annonsmätning endast efter samtycke.</li>
                <li><strong>Resend eller motsvarande e-postleverantör:</strong> transaktionsmail och servicemeddelanden.</li>
                <li><strong>Myndigheter:</strong> om vi är skyldiga enligt lag.</li>
              </ul>
              <p className="mt-2">Vi säljer inte personuppgifter.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Överföring utanför EU/EES</h2>
              <p>Vår ambition är att behandla personuppgifter inom EU/EES när det är möjligt. Vissa leverantörer, till exempel Google eller Stripe, kan innebära överföring till länder utanför EU/EES. När sådan överföring sker ska den skyddas genom lämpliga skyddsåtgärder, exempelvis EU-kommissionens standardavtalsklausuler eller annat giltigt överföringsstöd.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Lagringstid</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Kontouppgifter:</strong> sparas så länge kontot är aktivt och därefter så länge det behövs för support, säkerhet eller rättsliga krav.</li>
                <li><strong>Uppdrag, offerter och meddelanden:</strong> sparas så länge det behövs för att tillhandahålla tjänsten och hantera historik, tvister eller support.</li>
                <li><strong>Bokföringsmaterial:</strong> sparas enligt bokföringslagens krav.</li>
                <li><strong>Cookieval:</strong> sparas normalt upp till 12 månader eller tills du ändrar ditt val.</li>
                <li><strong>Analysdata:</strong> sparas enligt inställningarna hos aktuell analysleverantör och bara om du har samtyckt.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Dina rättigheter</h2>
              <p>Du har enligt GDPR rätt att:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>begära tillgång till dina personuppgifter,</li>
                <li>begära rättelse av felaktiga uppgifter,</li>
                <li>begära radering i vissa fall,</li>
                <li>begära begränsning av behandling,</li>
                <li>invända mot behandling som grundas på berättigat intresse,</li>
                <li>begära dataportabilitet när behandlingen grundas på avtal eller samtycke,</li>
                <li>återkalla samtycke för framtida behandling.</li>
              </ul>
              <p className="mt-2">Kontakta oss på <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a> om du vill utöva dina rättigheter. Vi svarar normalt inom 30 dagar.</p>
              <p className="mt-1">Du har också rätt att lämna klagomål till Integritetsskyddsmyndigheten, IMY: <a href="https://www.imy.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.imy.se</a>.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Säkerhet</h2>
              <p>Vi arbetar med tekniska och organisatoriska säkerhetsåtgärder för att skydda personuppgifter, bland annat åtkomstbegränsning, krypterad överföring, autentisering, loggning och säkerhetsregler i databasen.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Ändringar</h2>
              <p>Vi kan uppdatera denna integritetspolicy när tjänsten, leverantörer eller lagkrav förändras. Den senaste versionen finns alltid på denna sida.</p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export default PrivacyPolicyPage
