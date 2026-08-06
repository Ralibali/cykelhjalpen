import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import UpdroNavbar from '@/components/Navbar'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import { getCurrentHost } from '@/lib/hostConfig'
import UpdroFooter from '@/components/Footer'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { Button } from '@/components/ui/button'
import { setSEOMeta } from '@/lib/seoHelpers'
import { useT, useLanguage } from '@/lib/i18n'

const CookiePolicyPage = () => {
  const t = useT()
  const { lang } = useLanguage()
  const isCykel = getCurrentHost() === 'cykelhjalpen'
  useEffect(() => {
    if (isCykel) return
    setSEOMeta({
      title: t('Cookiepolicy | Cykelhjälpen'),
      description: t('Läs om hur Cykelhjälpen använder nödvändiga cookies, samtycke, Google Analytics och Google Ads.'),
      canonical: 'https://cykelhjalpen.se/cookies',
    })
  }, [isCykel, t])

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('cookie-settings:open'))
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isCykel && (
        <Helmet>
          <title>{t('Cookiepolicy | Cykelhjälpen')}</title>
          <meta name="description" content={t('Läs om hur Cykelhjälpen använder nödvändiga cookies, samtycke, Google Analytics och Google Ads.')} />
          <link rel="canonical" href="https://cykelhjalpen.se/cookies" />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={t('Cookiepolicy | Cykelhjälpen')} />
          <meta property="og:description" content={t('Cookies på Cykelhjälpen.se — nödvändiga, samtycke och analys.')} />
          <meta property="og:url" content="https://cykelhjalpen.se/cookies" />
          <meta property="og:image" content="https://cykelhjalpen.se/og/cookies.jpg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={t('Cookiepolicy | Cykelhjälpen')} />
          <meta name="twitter:description" content={t('Cookies på Cykelhjälpen.se.')} />
          <meta name="twitter:image" content="https://cykelhjalpen.se/og/cookies.jpg" />
        </Helmet>
      )}
      {isCykel ? <CykelNavbar /> : <UpdroNavbar />}
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">{t('Cookiepolicy')}</h1>
          <p className="text-muted-foreground text-sm mb-8">{t('Senast uppdaterad: 13 juli 2026')}</p>
          {lang === 'en' && (
            <p className="text-sm italic text-muted-foreground mb-8">{t('Detta är en översättning. Den svenska versionen gäller juridiskt.')}</p>
          )}

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('1. Vad är cookies?')}</h2>
              <p>{t('Cookies är små textfiler som lagras i din webbläsare. Liknande tekniker kan också användas för att läsa eller lagra information på din enhet. Vissa cookies behövs för att webbplatsen ska fungera, medan andra kräver ditt samtycke.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('2. Vem ansvarar?')}</h2>
              <p><strong>{t('Aurora Media AB')}</strong>{t(', organisationsnummer 559272-0220, ansvarar för användningen av cookies på Cykelhjälpen.se och driver tjänsten under namnet Cykelhjälpen.')}</p>
              <p className="mt-1">{t('Postadress: Gustafstorpsvägen 42, 585 74 Ljungsbro.')}</p>
              <p className="mt-1">{t('Kontakt:')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a></p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('3. Vilka cookies använder vi?')}</h2>

              <h3 className="font-semibold text-foreground mt-3 mb-1">{t('3.1 Nödvändiga cookies')}</h3>
              <p>{t('Dessa behövs för att webbplatsen och tjänsten ska fungera. De kan till exempel användas för inloggning, säkerhet, sessionshantering och för att spara ditt cookieval. Dessa kräver inte samtycke.')}</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>{t('Cookie-samtycke:')}</strong> {t('sparar om du valt endast nödvändiga cookies eller accepterat alla.')}</li>
                <li><strong>{t('Autentisering och session:')}</strong> {t('används när du loggar in eller använder kontofunktioner.')}</li>
                <li><strong>{t('Säkerhet:')}</strong> {t('skyddar mot missbruk, felaktiga anrop och obehörig åtkomst.')}</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-3 mb-1">{t('3.2 Analyscookies')}</h3>
              <p>{t('Med ditt samtycke använder vi Google Analytics för att förstå hur webbplatsen används, vilka sidor som fungerar bra och var vi behöver förbättra upplevelsen. Vi har konfigurerat laddningen så att Google-taggen inte laddas för analys innan du har accepterat.')}</p>

              <h3 className="font-semibold text-foreground mt-3 mb-1">{t('3.3 Marknadsföringscookies')}</h3>
              <p>{t('Med ditt samtycke använder vi Google Ads för konverteringsmätning och marknadsföringsanalys. Detta hjälper oss att förstå om annonser leder till relevanta besök eller uppdrag. Dessa cookies används inte innan du har accepterat statistik och marknadsföring.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('4. Samtycke')}</h2>
              <p>{t('När du besöker webbplatsen kan du välja mellan att neka icke-nödvändiga cookies eller acceptera statistik och marknadsföring. Ett nej påverkar inte grundläggande funktioner på webbplatsen.')}</p>
              <p className="mt-2">{t('Du kan när som helst ändra ditt val genom knappen “Cookieinställningar” på webbplatsen eller via knappen nedan.')}</p>
              <Button type="button" size="sm" className="rounded-xl mt-3" onClick={openCookieSettings}>
                {t('Ändra cookieinställningar')}
              </Button>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('5. Lagringstid')}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>{t('Sessionscookies:')}</strong> {t('raderas normalt när webbläsaren stängs.')}</li>
                <li><strong>{t('Cookieval:')}</strong> {t('sparas normalt upp till 12 månader eller tills du ändrar ditt val.')}</li>
                <li><strong>{t('Google Analytics/Google Ads:')}</strong> {t('lagringstid styrs av Googles inställningar och används endast efter samtycke.')}</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('6. Tredje parter')}</h2>
              <p>{t('Om du accepterar statistik och marknadsföring kan uppgifter behandlas av Google. Google kan behandla information som IP-adress, enhetsinformation, sidvisningar, klick och kampanjinformation enligt sina villkor och dataskyddsregler.')}</p>
              <p className="mt-2">{t('Betalning, inloggning och drift kan även innebära tekniskt nödvändiga cookies eller lokal lagring från våra drift- och betalleverantörer, exempelvis Supabase och Stripe.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('7. Rättslig grund')}</h2>
              <p>{t('Nödvändiga cookies används för att tillhandahålla webbplatsen och tjänsten. Analys- och marknadsföringscookies används endast efter samtycke enligt lagen om elektronisk kommunikation och GDPR.')}</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">{t('8. Kontakt')}</h2>
              <p>{t('Har du frågor om cookies eller personuppgifter? Kontakta Aurora Media AB på')} <a href="mailto:info@cykelhjalpen.se" className="text-primary hover:underline">info@cykelhjalpen.se</a> {t('eller per post till Gustafstorpsvägen 42, 585 74 Ljungsbro.')}</p>
              <p className="mt-2">{t('Se även vår')} <a href="/integritetspolicy" className="text-primary hover:underline">{t('integritetspolicy')}</a> {t('för mer information om hur vi behandlar personuppgifter.')}</p>
            </div>
          </section>
        </article>
      </main>
      {getCurrentHost() === 'cykelhjalpen' ? <CykelFooter /> : <UpdroFooter />}
    </div>
  )
}

export default CookiePolicyPage
