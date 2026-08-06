import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import UpdroNavbar from '@/components/Navbar'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import { getCurrentHost } from '@/lib/hostConfig'
import UpdroFooter from '@/components/Footer'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { setSEOMeta } from '@/lib/seoHelpers'
import { useT, useLanguage } from '@/lib/i18n'

const PrivacyPolicyPage = () => {
  const t = useT()
  const { lang } = useLanguage()
  const isCykel = getCurrentHost() === 'cykelhjalpen'
  useEffect(() => {
    if (isCykel) return
    setSEOMeta({
      title: t('Integritetspolicy | Cykelhjälpen'),
      description: t('Integritetspolicy för Cykelhjälpen.se. Så här hanterar Cykelhjälpen personuppgifter enligt GDPR.'),
      canonical: '/integritetspolicy',
    })
  }, [isCykel, t])

  return (
    <div className="min-h-screen flex flex-col">
      {isCykel && (
        <Helmet>
          <title>{t('Integritetspolicy | Cykelhjälpen')}</title>
          <meta name="description" content={t('Integritetspolicy för Cykelhjälpen.se. Så här hanterar Cykelhjälpen personuppgifter enligt GDPR.')} />
          <link rel="canonical" href="https://cykelhjalpen.se/integritetspolicy" />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={t('Integritetspolicy | Cykelhjälpen')} />
          <meta property="og:description" content={t('Så här hanterar Cykelhjälpen personuppgifter enligt GDPR.')} />
          <meta property="og:url" content="https://cykelhjalpen.se/integritetspolicy" />
          <meta property="og:image" content="https://cykelhjalpen.se/og/integritetspolicy.jpg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={t('Integritetspolicy | Cykelhjälpen')} />
          <meta name="twitter:description" content={t('Så här hanterar Cykelhjälpen personuppgifter enligt GDPR.')} />
          <meta name="twitter:image" content="https://cykelhjalpen.se/og/integritetspolicy.jpg" />
        </Helmet>
      )}
      {isCykel ? <CykelNavbar /> : <UpdroNavbar />}
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">{t('Integritetspolicy')}</h1>
          <p className="text-muted-foreground text-sm mb-8">{t('Senast uppdaterad: 13 juli 2026')}</p>
          {lang === 'en' && (
            <p className="text-sm italic text-muted-foreground mb-8">{t('Detta är en översättning. Den svenska versionen gäller juridiskt.')}</p>
          )}

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('1. Personuppgiftsansvarig')}</h2>
              <p><strong>{t('Aurora Media AB')}</strong>{t(', organisationsnummer 559272-0220, är personuppgiftsansvarig för behandlingen av personuppgifter på Cykelhjälpen.se och driver tjänsten under namnet Cykelhjälpen.')}</p>
              <p className="mt-1">{t('Postadress: Gustafstorpsvägen 42, 585 74 Ljungsbro.')}</p>
              <p className="mt-1">{t('Kontakt:')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a></p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('2. Vilka uppgifter vi behandlar')}</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>{t('Ärendeuppgifter (cyklist):')}</strong> {t('namn, e-post, eventuellt telefon, cykeltyp, problembeskrivning, område, postnummer och bilder du laddar upp.')}</li>
                <li><strong>{t('Verkstadsuppgifter:')}</strong> {t('företagsnamn, kontaktuppgifter, adress, webbplats, stad och tjänster.')}</li>
                <li><strong>{t('Prospektuppgifter om verkstäder:')}</strong> {t('offentligt publicerade företagsuppgifter, exempelvis företagsnamn, webbplats, generell företagsadress, telefon, e-postadress och beskrivning av tjänster.')}</li>
                <li><strong>{t('Kommunikation:')}</strong> {t('meddelanden och offerter mellan cyklist och verkstad samt vår kontakt med verkstäder.')}</li>
                <li><strong>{t('Betalnings- och transaktionsuppgifter:')}</strong> {t('lead-avgifter, betalstatus och fakturaunderlag. Kortuppgifter hanteras av Stripe och lagras inte av oss.')}</li>
                <li><strong>{t('Teknisk information:')}</strong> {t('IP-adress, webbläsare, enhet, loggar, säkerhetshändelser och cookieval.')}</li>
                <li><strong>{t('Analys- och marknadsföringsdata:')}</strong> {t('sidvisningar och kampanjdata om du samtycker till sådana cookies.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('3. Varför vi behandlar uppgifter och rättslig grund')}</h2>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>{t('Tillhandahålla tjänsten:')}</strong> {t('ta emot cykelärenden, förmedla dem till anslutna verkstäder och möjliggöra offert och kontakt. Rättslig grund: avtal eller åtgärder innan avtal.')}</li>
                <li><strong>{t('Kundservice och drift:')}</strong> {t('svara på frågor, felsöka, skydda tjänsten och förebygga missbruk. Rättslig grund: berättigat intresse.')}</li>
                <li><strong>{t('Betalning och bokföring:')}</strong> {t('hantera verkstadens lead-avgifter, kvitton och redovisning. Rättslig grund: avtal och rättslig förpliktelse.')}</li>
                <li><strong>{t('Information till relevanta verkstäder:')}</strong> {t('identifiera och kontakta cykelverkstäder om möjligheten att ansluta sig till tjänsten. Rättslig grund: berättigat intresse av att bygga ett lokalt verkstadsnätverk. Varje sådant mejl innehåller en enkel möjlighet att invända och avregistrera sig.')}</li>
                <li><strong>{t('Analys och marknadsföring på webbplatsen:')}</strong> {t('förstå hur webbplatsen används och mäta effekten av annonser. Rättslig grund: samtycke.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('4. Uppgifter som hämtas från andra källor')}</h2>
              <p>{t('När vi kontaktar en cykelverkstad kan uppgifterna ha hämtats från verkstadens egen webbplats eller andra öppet tillgängliga företagskällor. Vi använder sök- och insamlingsverktyg, bland annat Firecrawl, för att hitta och sammanställa relevanta offentliga företagsuppgifter. Vi använder i första hand generella företagsadresser och behandlar inte uppgifterna för andra ändamål än att bedöma om verkstaden är relevant för Cykelhjälpens nätverk och genomföra en begränsad kontakt.')}</p>
              <p className="mt-2">{t('Du kan när som helst invända mot direktmarknadsföring eller begära rättelse eller radering via avregistreringslänken i mejlet eller genom att kontakta')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a>{t('. När du invänder spärrar vi adressen för framtida rekryteringsutskick.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('5. Delning av uppgifter')}</h2>
              <p>{t('Vi delar endast personuppgifter när det behövs för tjänsten, drift, säkerhet, betalning eller lagkrav.')}</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>{t('Anslutna cykelverkstäder:')}</strong> {t('en verkstad ser ärendebeskrivning utan kundens kontaktuppgifter innan den skickar en betald offert. Maximalt tre verkstäder kan skicka en offert per ärende.')}</li>
                <li><strong>{t('Stripe:')}</strong> {t('betalningshantering för verkstadens lead-avgifter.')}</li>
                <li><strong>{t('Supabase:')}</strong> {t('hosting, databas, autentisering och teknisk drift.')}</li>
                <li><strong>{t('Google:')}</strong> {t('analys och annonsmätning endast efter samtycke.')}</li>
                <li><strong>{t('Resend:')}</strong> {t('transaktionsmejl, servicemeddelanden och manuellt godkända verkstadsutskick.')}</li>
                <li><strong>{t('Firecrawl:')}</strong> {t('sökning och sammanställning av offentligt publicerade verkstadsuppgifter.')}</li>
                <li><strong>{t('Cloudflare Turnstile:')}</strong> {t('skydd mot automatiserat missbruk vid inlämning av ärende.')}</li>
                <li><strong>{t('Myndigheter:')}</strong> {t('om vi är skyldiga enligt lag.')}</li>
              </ul>
              <p className="mt-2">{t('Vi säljer inte personuppgifter.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('6. Cookies, Google Analytics och Google Ads')}</h2>
              <p>{t('Vi använder nödvändiga lagringsfunktioner för att webbplatsen ska fungera och för att spara ditt cookieval. Analys- och marknadsföringskod laddas först om du aktivt accepterar den i cookie-bannern. Du kan när som helst ändra ditt val via knappen ”Cookieinställningar”. Se vår')} <a href="/cookies" className="text-primary hover:underline">{t('cookiepolicy')}</a> {t('för detaljer.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('7. Överföring utanför EU/EES')}</h2>
              <p>{t('Vissa leverantörer kan innebära behandling eller överföring utanför EU/EES. När det sker använder vi ett giltigt överföringsstöd, exempelvis EU-kommissionens standardavtalsklausuler, och kompletterande skyddsåtgärder när det behövs.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('8. Lagringstid')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>{t('Ärenden och bilder:')}</strong> {t('sparas normalt i tolv månader efter att ärendet stängts, för support och tvistlösning. De kan raderas tidigare på begäran när det inte finns rättsliga skäl att behålla dem.')}</li>
                <li><strong>{t('Verkstadens konto:')}</strong> {t('så länge kontot är aktivt och därefter så länge det behövs för support, säkerhet eller rättsliga krav.')}</li>
                <li><strong>{t('Prospektuppgifter:')}</strong> {t('så länge de behövs för den begränsade verkstadskontakten. Spärruppgifter efter en invändning behålls för att säkerställa att nya utskick inte görs.')}</li>
                <li><strong>{t('Bokföringsmaterial:')}</strong> {t('så länge bokföringslagstiftningen kräver det.')}</li>
                <li><strong>{t('Cookieval:')}</strong> {t('upp till tolv månader eller tills du ändrar ditt val.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('9. Dina rättigheter')}</h2>
              <p>{t('Du har enligt GDPR rätt att begära tillgång, rättelse, radering, begränsning och dataportabilitet samt att invända mot behandling som grundas på berättigat intresse. Du har alltid rätt att invända mot behandling för direktmarknadsföring; då upphör den behandlingen för den aktuella adressen. Du kan också återkalla ett samtycke utan att det påverkar lagligheten före återkallelsen.')}</p>
              <p className="mt-2">{t('Kontakta')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a>. {t('Vi svarar normalt inom en månad. Klagomål kan lämnas till Integritetsskyddsmyndigheten (IMY):')} <a href="https://www.imy.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.imy.se</a>.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('10. Säkerhet')}</h2>
              <p>{t('Vi arbetar med tekniska och organisatoriska säkerhetsåtgärder, bland annat åtkomstbegränsning, krypterad överföring, autentisering, loggning och Row Level Security i databasen. Bilduppladdningar lagras i ett privat lagringsutrymme och nås endast via tidsbegränsade signerade länkar.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('11. Ändringar')}</h2>
              <p>{t('Vi kan uppdatera denna policy när tjänsten, leverantörer eller lagkrav förändras. Den senaste versionen finns alltid på denna sida.')}</p>
            </div>
          </section>
        </article>
      </main>
      {getCurrentHost() === 'cykelhjalpen' ? <CykelFooter /> : <UpdroFooter />}
    </div>
  )
}

export default PrivacyPolicyPage
