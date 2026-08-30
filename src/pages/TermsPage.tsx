import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import UpdroNavbar from '@/components/Navbar'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import { getCurrentHost } from '@/lib/hostConfig'
import UpdroFooter from '@/components/Footer'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { setSEOMeta } from '@/lib/seoHelpers'
import { formatKrFromOre, useV2Pricing, v2GrossOre } from '@/lib/v2/pricing'
import { useT, useLanguage } from '@/lib/i18n'

const TermsPage = () => {
  const t = useT()
  // Canonical pricing (contract §2.1): the fee displayed in the terms always
  // matches the charged amount — 50 kr exkl. / 62,50 kr inkl. moms today.
  const pricing = useV2Pricing()
  const feeKr = formatKrFromOre(pricing.amountOre)
  const feeGrossKr = formatKrFromOre(v2GrossOre(pricing.amountOre, pricing.vatRate))
  const { lang } = useLanguage()
  const isCykel = getCurrentHost() === 'cykelhjalpen'
  useEffect(() => {
    if (isCykel) return
    setSEOMeta({
      title: t('Allmänna villkor | Cykelhjälpen'),
      description: t('Allmänna villkor för Cykelhjälpen.se — leadplattform för cykelreparation i Linköping, Norrköping, Uppsala och Lund.'),
      canonical: 'https://cykelhjalpen.se/villkor',
    })
  }, [isCykel, t])
  return (
    <div className="min-h-screen flex flex-col">
      {isCykel && (
        <Helmet>
          <title>{t('Allmänna villkor | Cykelhjälpen')}</title>
          <meta name="description" content={t('Allmänna villkor för Cykelhjälpen.se — leadplattform för cykelreparation i Linköping, Norrköping, Uppsala och Lund.')} />
          <link rel="canonical" href="https://cykelhjalpen.se/villkor" />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={t('Allmänna villkor | Cykelhjälpen')} />
          <meta property="og:description" content={t('Villkor för Cykelhjälpen.se — lokal leadplattform för cykelreparation.')} />
          <meta property="og:url" content="https://cykelhjalpen.se/villkor" />
          <meta property="og:image" content="https://cykelhjalpen.se/og/villkor.jpg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={t('Allmänna villkor | Cykelhjälpen')} />
          <meta name="twitter:description" content={t('Villkor för Cykelhjälpen.se.')} />
          <meta name="twitter:image" content="https://cykelhjalpen.se/og/villkor.jpg" />
        </Helmet>
      )}
      {isCykel ? <CykelNavbar /> : <UpdroNavbar />}
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">{t('Allmänna villkor')}</h1>
          <p className="text-muted-foreground text-sm mb-8">{t('Senast uppdaterad: 30 juli 2026')}</p>
          {lang === 'en' && (
            <p className="text-sm italic text-muted-foreground mb-8">{t('Detta är en översättning. Den svenska versionen gäller juridiskt.')}</p>
          )}

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('1. Om tjänsten')}</h2>
              <p>{t('Cykelhjälpen.se (”Tjänsten”) drivs av')} <strong>{t('Aurora Media AB')}</strong>{t(', organisationsnummer 559272-0220, under namnet Cykelhjälpen. Bolagets registrerade postadress är Gustafstorpsvägen 42, 585 74 Ljungsbro.')}</p>
              <p className="mt-2">{t('Tjänsten är en leadplattform där cyklister i Linköping, Norrköping, Uppsala och Lund kan beskriva ett cykelproblem och få upp till tre prisförslag från anslutna cykelverkstäder.')}</p>
              <p className="mt-2">{t('Cykelhjälpen är en förmedlingsplattform och är inte part i avtalet mellan cyklist och verkstad. Ansvaret för utfört arbete, garanti och betalning ligger hos respektive part.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('2. För cyklister')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('Tjänsten är gratis för cyklister och kräver inget konto.')}</li>
                <li>{t('Du förbinder dig att lämna korrekta uppgifter om ditt ärende och dina kontaktuppgifter.')}</li>
                <li>{t('Den offert du får gäller det problem du beskrivit – stämmer din beskrivning ska verkstaden hålla priset.')}</li>
                <li>{t('Priset får bara justeras om felet visar sig vara något annat eller mer omfattande än du beskrivit. Verkstaden ska då informera dig och få ditt godkännande innan arbetet fortsätter (konsumenttjänstlagen 32 §).')}</li>
                <li>{t('Du ansvarar själv för att beskriva felet så noggrant och sanningsenligt du kan – en tydlig beskrivning ger ett pris du kan lita på.')}</li>
                <li>{t('Maximalt tre verkstäder kan lämna ett betalt svar på ett ärende.')}</li>
                <li>{t('Du väljer själv om du vill anlita någon av de verkstäder som svarar.')}</li>
                <li>{t('Avtal om reparation, garanti och betalning ingås direkt mellan dig och verkstaden.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('3. För cykelverkstäder')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('Du måste vara minst 18 år och behörig att ingå avtal å verkstadens vägnar.')}</li>
                <li>{t('Verkstaden måste godkännas manuellt av Cykelhjälpen innan den får tillgång till ärenden.')}</li>
                <li>{t('Du ansvarar för att uppgifterna i ditt konto är korrekta och uppdaterade.')}</li>
                <li>{t('Du ska låta offerten gälla det problem kunden beskrivit – stämmer beskrivningen ska priset hållas.')}</li>
                <li>{t('Priset får endast justeras om felet avviker från kundens beskrivning. Kunden ska i så fall informeras och godkänna det nya priset innan arbetet fortsätter.')}</li>
                <li>{t('Du ansvarar för att lämnade prisförslag och utfört arbete uppfyller tillämplig svensk lagstiftning, bland annat konsumenttjänstlagen när kunden är konsument.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('4. Lead-avgift och betalning för verkstäder')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('Det är gratis att registrera och ansöka om godkännande som verkstad.')}</li>
                <li>{t('Det är kostnadsfritt för verkstäder att svara på kundförfrågningar.')}</li>
                <li>{t('Först när kunden väljer verkstadens prisförslag som vinnande debiteras en vinstavgift om')} <strong>{t('{fee} kr exklusive moms ({feeGross} kr inklusive moms)', { fee: feeKr, feeGross: feeGrossKr })}</strong>. {t('Nya verkstäder får')} <strong>{t('två gratis leads')}</strong> {t('som automatiskt dras vid vinst i stället för betalning. Verkstaden kan även köpa leads i förväg via Stripe.')}</li>
                <li>{t('Moms beräknas utifrån tillämpliga skatteregler och de faktureringsuppgifter som lämnas i Stripe.')}</li>
                <li>{t('Maximalt tre verkstäder kan svara per ärende. Först till kvarn gäller.')}</li>
                <li>{t('Betalningsunderlag hanteras via Stripe.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('5. Återbetalning och ångerrätt')}</h2>
              <p>{t('Tjänsten som säljs till verkstäder är avsedd för näringsidkare. Konsumenters lagstadgade ångerrätt gäller därför normalt inte verkstadens köp av ett lead.')}</p>
              <p className="mt-2">{t('Ett köp anses levererat när verkstadens prisförslag har registrerats som skickat och gjorts tillgängligt för kunden. Återbetalning kan medges om tjänsten inte har kunnat levereras på grund av ett tekniskt fel hos Cykelhjälpen eller om en betalning genomförts efter att ärendet redan blivit fullt. En sådan betalning ska normalt återföras automatiskt.')}</p>
              <p className="mt-2">{t('Begäran om återbetalning görs till')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a> {t('med uppgift om verkstad, datum och berört ärende.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('6. Ansvarsbegränsning')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('Cykelhjälpen ansvarar inte för utfört arbete, garanti, tvister eller skador mellan cyklist och verkstad.')}</li>
                <li>{t('Cykelhjälpen ansvarar inte för offerters eller prisers riktighet och garanterar inte kvaliteten på verkstadens arbete eller att ett lämnat prisförslag leder till ett uppdrag.')}</li>
                <li>{t('Cykelhjälpen garanterar inte att någon offert alls lämnas på ett ärende och ansvarar inte för verkstäders tillgänglighet, svarstider eller uteblivna svar.')}</li>
                <li>{t('Cykelhjälpen ansvarar inte för riktigheten i kunders problembeskrivningar eller för att en förfrågan leder till ett uppdrag.')}</li>
                <li>{t('Cykelhjälpens ansvar gentemot en verkstad är, i den utsträckning tvingande lag tillåter, begränsat till det belopp verkstaden betalat till Cykelhjälpen under de senaste tolv månaderna.')}</li>
                <li>{t('Cykelhjälpen ansvarar inte för indirekta skador, utebliven vinst eller förlust av data, utom när ansvaret följer av tvingande lag.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('7. Förbjudet beteende')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('Falska ärenden, falska verkstadsuppgifter eller manipulering av prisförslag.')}</li>
                <li>{t('Försök att kringgå plattformens betalnings- eller behörighetssystem.')}</li>
                <li>{t('Spam, trakasserier eller annan olämplig kommunikation.')}</li>
                <li>{t('Automatiserad åtkomst, scraping eller bottar utan skriftligt tillstånd.')}</li>
              </ul>
              <p className="mt-1">{t('Överträdelser kan leda till att ärenden tas bort eller att ett konto begränsas eller stängs av.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('8. Personuppgifter')}</h2>
              <p>{t('Behandling av personuppgifter beskrivs i vår')} <a href="/integritetspolicy" className="text-primary hover:underline">{t('integritetspolicy')}</a>.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('9. Tvistlösning och tillämplig lag')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('Svensk lag tillämpas på dessa villkor.')}</li>
                <li>{t('Tvister ska i första hand försöka lösas genom kontakt och förhandling.')}</li>
                <li>{t('En konsument som har en tvist med en verkstad kan, när förutsättningarna är uppfyllda, vända sig till')} <strong>{t('Allmänna reklamationsnämnden (ARN)')}</strong>: <a href="https://www.arn.se" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.arn.se</a>.</li>
                <li>{t('Tvister mellan Cykelhjälpen och en verkstad avgörs, om de inte kan lösas genom förhandling, av svensk allmän domstol med Linköpings tingsrätt som första instans.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('10. Ändringar av villkoren')}</h2>
              <p>{t('Vi kan ändra villkoren när tjänsten, priserna eller rättsliga krav förändras. Väsentliga ändringar som påverkar registrerade verkstäder meddelas i rimlig tid via e-post eller notis i tjänsten.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('11. Kontakt')}</h2>
              <p>{t('Aurora Media AB')}<br />
              {t('Organisationsnummer: 559272-0220')}<br />
              {t('Gustafstorpsvägen 42')}<br />
              {t('585 74 Ljungsbro')}<br />
              {t('E-post:')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a></p>
            </div>
          </section>
        </article>
      </main>
      {getCurrentHost() === 'cykelhjalpen' ? <CykelFooter /> : <UpdroFooter />}
    </div>
  )
}

export default TermsPage
