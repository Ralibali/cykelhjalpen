import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import UpdroNavbar from '@/components/Navbar'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import { getCurrentHost } from '@/lib/hostConfig'
import UpdroFooter from '@/components/Footer'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { setSEOMeta } from '@/lib/seoHelpers'

const PrivacyPolicyPage = () => {
  const isCykel = getCurrentHost() === 'cykelhjalpen'
  useEffect(() => {
    if (isCykel) return
    setSEOMeta({
      title: 'Integritetspolicy | Cykelhjälpen',
      description: 'Integritetspolicy för Cykelhjälpen.se. Så här hanterar Cykelhjälpen personuppgifter enligt GDPR.',
      canonical: '/integritetspolicy',
    })
  }, [isCykel])

  return (
    <div className="min-h-screen flex flex-col">
      {isCykel && (
        <Helmet>
          <title>Integritetspolicy | Cykelhjälpen</title>
          <meta name="description" content="Integritetspolicy för Cykelhjälpen.se. Så här hanterar Cykelhjälpen personuppgifter enligt GDPR." />
          <link rel="canonical" href="https://cykelhjalpen.se/integritetspolicy" />
          <meta property="og:type" content="article" />
          <meta property="og:title" content="Integritetspolicy | Cykelhjälpen" />
          <meta property="og:description" content="Så här hanterar Cykelhjälpen personuppgifter enligt GDPR." />
          <meta property="og:url" content="https://cykelhjalpen.se/integritetspolicy" />
          <meta property="og:image" content="https://cykelhjalpen.se/og/integritetspolicy.jpg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Integritetspolicy | Cykelhjälpen" />
          <meta name="twitter:description" content="Så här hanterar Cykelhjälpen personuppgifter enligt GDPR." />
          <meta name="twitter:image" content="https://cykelhjalpen.se/og/integritetspolicy.jpg" />
        </Helmet>
      )}
      {isCykel ? <CykelNavbar /> : <UpdroNavbar />}
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">Integritetspolicy</h1>
          <p className="text-muted-foreground text-sm mb-8">Senast uppdaterad: 2026-05-27</p>

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Personuppgiftsansvarig</h2>
              <p><strong>Cykelhjälpen</strong> är personuppgiftsansvarig för behandlingen av personuppgifter på Cykelhjälpen.se.</p>
              <p className="mt-1">Kontakt: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a></p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Vilka uppgifter vi behandlar</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Ärendeuppgifter (cyklist):</strong> namn, e-post, eventuellt telefon, cykeltyp, problembeskrivning, område, postnummer och bilder du laddar upp.</li>
                <li><strong>Verkstadsuppgifter:</strong> företagsnamn, organisationsnummer, kontaktuppgifter, adress, webbplats och tjänster.</li>
                <li><strong>Kommunikation:</strong> meddelanden och offerter mellan cyklist och verkstad.</li>
                <li><strong>Betalnings- och transaktionsuppgifter:</strong> lead-avgifter, betalstatus och fakturaunderlag. Kortuppgifter hanteras av Stripe och lagras inte av oss.</li>
                <li><strong>Teknisk information:</strong> IP-adress, webbläsare, enhet, loggar, säkerhetshändelser och cookieval.</li>
                <li><strong>Analys- och marknadsföringsdata:</strong> sidvisningar och kampanjdata om du samtycker till sådana cookies.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Varför vi behandlar uppgifter och rättslig grund</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Tillhandahålla tjänsten:</strong> ta emot cykelärenden, förmedla dem till anslutna verkstäder och möjliggöra offert och kontakt. Rättslig grund: avtal eller åtgärder innan avtal.</li>
                <li><strong>Kundservice och drift:</strong> svara på frågor, felsöka, skydda tjänsten och förebygga missbruk. Rättslig grund: berättigat intresse.</li>
                <li><strong>Betalning och bokföring:</strong> hantera verkstadens lead-avgifter, kvitton och redovisning. Rättslig grund: avtal och rättslig förpliktelse.</li>
                <li><strong>Analys och marknadsföring:</strong> förstå hur webbplatsen används och mäta effekten av annonser. Rättslig grund: samtycke.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Delning av uppgifter</h2>
              <p>Vi delar endast personuppgifter när det behövs för tjänsten, drift, säkerhet, betalning eller lagkrav.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Anslutna cykelverkstäder:</strong> en verkstad ser ärendebeskrivning utan personuppgifter innan offert. Först efter att verkstaden har betalat lead-avgiften delas namn, e-post och eventuellt telefon, så att verkstaden kan återkomma. Maximalt fem verkstäder per ärende får dina kontaktuppgifter.</li>
                <li><strong>Stripe:</strong> betalningshantering för verkstadens lead-avgifter.</li>
                <li><strong>Lovable Cloud (Supabase):</strong> hosting, databas, autentisering och teknisk drift inom EU.</li>
                <li><strong>Google:</strong> analys och annonsmätning endast efter samtycke.</li>
                <li><strong>Resend:</strong> transaktionsmail och servicemeddelanden.</li>
                <li><strong>Cloudflare Turnstile:</strong> spam-skydd vid inlämning av ärende.</li>
                <li><strong>Myndigheter:</strong> om vi är skyldiga enligt lag.</li>
              </ul>
              <p className="mt-2">Vi säljer inte personuppgifter.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Cookies, Google Analytics och Google Ads</h2>
              <p>Vi använder nödvändiga cookies för att webbplatsen ska fungera och för att spara ditt cookieval. Analys- och marknadsföringscookies laddas först om du aktivt accepterar dem i cookie-bannern. Du kan när som helst ändra ditt val via knappen "Cookieinställningar". Se vår <a href="/cookies" className="text-primary hover:underline">cookiepolicy</a> för detaljer.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Överföring utanför EU/EES</h2>
              <p>Vår ambition är att behandla personuppgifter inom EU/EES. Vissa leverantörer (t.ex. Google, Stripe) kan innebära överföring till länder utanför EU/EES. Sådan överföring skyddas genom EU-kommissionens standardavtalsklausuler eller annat giltigt överföringsstöd.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Lagringstid</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Ärenden och bilder:</strong> sparas i tolv månader efter att ärendet stängts, för support och tvistlösning. Kan raderas tidigare på begäran.</li>
                <li><strong>Verkstadens konto:</strong> så länge kontot är aktivt och därefter så länge det behövs för support, säkerhet eller rättsliga krav.</li>
                <li><strong>Bokföringsmaterial:</strong> sju år enligt bokföringslagen.</li>
                <li><strong>Cookieval:</strong> upp till tolv månader eller tills du ändrar ditt val.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Dina rättigheter</h2>
              <p>Du har enligt GDPR rätt att begära tillgång, rättelse, radering, begränsning, dataportabilitet samt invända mot eller återkalla samtycke. Kontakta <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a>. Vi svarar normalt inom 30 dagar.</p>
              <p className="mt-1">Klagomål kan lämnas till Integritetsskyddsmyndigheten (IMY): <a href="https://www.imy.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.imy.se</a>.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">9. Säkerhet</h2>
              <p>Vi arbetar med tekniska och organisatoriska säkerhetsåtgärder, bland annat åtkomstbegränsning, krypterad överföring, autentisering, loggning och Row Level Security i databasen. Bilduppladdningar lagras i ett privat lagringsutrymme och nås endast via tidsbegränsade signerade länkar.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">10. Ändringar</h2>
              <p>Vi kan uppdatera denna policy när tjänsten, leverantörer eller lagkrav förändras. Den senaste versionen finns alltid på denna sida.</p>
            </div>
          </section>
        </article>
      </main>
      {getCurrentHost() === 'cykelhjalpen' ? <CykelFooter /> : <UpdroFooter />}
    </div>
  )
}

export default PrivacyPolicyPage
