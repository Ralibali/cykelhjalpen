import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { Button } from '@/components/ui/button'
import { setSEOMeta } from '@/lib/seoHelpers'

const CookiePolicyPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Cookiepolicy | Updro',
      description: 'Läs om hur Updro använder nödvändiga cookies, samtycke, Google Analytics och Google Ads.',
      canonical: 'https://updro.se/cookies',
    })
  }, [])

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('updro:open-cookie-settings'))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-slate">
          <h1 className="font-display text-3xl font-bold mb-2">Cookiepolicy</h1>
          <p className="text-muted-foreground text-sm mb-8">Senast uppdaterad: 2026-05-03</p>

          <section className="space-y-6 text-sm leading-relaxed text-foreground/80">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">1. Vad är cookies?</h2>
              <p>Cookies är små textfiler som lagras i din webbläsare. Liknande tekniker kan också användas för att läsa eller lagra information på din enhet. Vissa cookies behövs för att webbplatsen ska fungera, medan andra kräver ditt samtycke.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">2. Vem ansvarar?</h2>
              <p><strong>Aurora Media AB</strong>, org.nr. <strong>559272-0220</strong>, ansvarar för användningen av cookies på Updro.</p>
              <p className="mt-1">Kontakt: <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a></p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">3. Vilka cookies använder vi?</h2>

              <h3 className="font-semibold text-foreground mt-3 mb-1">3.1 Nödvändiga cookies</h3>
              <p>Dessa behövs för att webbplatsen och tjänsten ska fungera. De kan till exempel användas för inloggning, säkerhet, sessionshantering och för att spara ditt cookieval. Dessa kräver inte samtycke.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Cookie-samtycke:</strong> sparar om du valt endast nödvändiga cookies eller accepterat alla.</li>
                <li><strong>Autentisering och session:</strong> används när du loggar in eller använder kontofunktioner.</li>
                <li><strong>Säkerhet:</strong> skyddar mot missbruk, felaktiga anrop och obehörig åtkomst.</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-3 mb-1">3.2 Analyscookies</h3>
              <p>Med ditt samtycke använder vi Google Analytics för att förstå hur webbplatsen används, vilka sidor som fungerar bra och var vi behöver förbättra upplevelsen. Vi har konfigurerat laddningen så att Google-taggen inte laddas för analys innan du har accepterat.</p>

              <h3 className="font-semibold text-foreground mt-3 mb-1">3.3 Marknadsföringscookies</h3>
              <p>Med ditt samtycke använder vi Google Ads för konverteringsmätning och marknadsföringsanalys. Detta hjälper oss att förstå om annonser leder till relevanta besök eller uppdrag. Dessa cookies används inte innan du har accepterat statistik och marknadsföring.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">4. Samtycke</h2>
              <p>När du besöker webbplatsen kan du välja mellan att neka icke-nödvändiga cookies eller acceptera statistik och marknadsföring. Ett nej påverkar inte grundläggande funktioner på webbplatsen.</p>
              <p className="mt-2">Du kan när som helst ändra ditt val genom knappen “Cookieinställningar” på webbplatsen eller via knappen nedan.</p>
              <Button type="button" size="sm" className="rounded-xl mt-3" onClick={openCookieSettings}>
                Ändra cookieinställningar
              </Button>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">5. Lagringstid</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Sessionscookies:</strong> raderas normalt när webbläsaren stängs.</li>
                <li><strong>Cookieval:</strong> sparas normalt upp till 12 månader eller tills du ändrar ditt val.</li>
                <li><strong>Google Analytics/Google Ads:</strong> lagringstid styrs av Googles inställningar och används endast efter samtycke.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">6. Tredje parter</h2>
              <p>Om du accepterar statistik och marknadsföring kan uppgifter behandlas av Google. Google kan behandla information som IP-adress, enhetsinformation, sidvisningar, klick och kampanjinformation enligt sina villkor och dataskyddsregler.</p>
              <p className="mt-2">Betalning, inloggning och drift kan även innebära tekniskt nödvändiga cookies eller lokal lagring från våra drift- och betalleverantörer, exempelvis Supabase/Lovable och Stripe.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">7. Rättslig grund</h2>
              <p>Nödvändiga cookies används för att tillhandahålla webbplatsen och tjänsten. Analys- och marknadsföringscookies används endast efter samtycke enligt lagen om elektronisk kommunikation och GDPR.</p>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">8. Kontakt</h2>
              <p>Har du frågor om cookies eller personuppgifter? Kontakta oss på <a href="mailto:info@auroramedia.se" className="text-primary hover:underline">info@auroramedia.se</a>.</p>
              <p className="mt-2">Se även vår <a href="/integritetspolicy" className="text-primary hover:underline">integritetspolicy</a> för mer information om hur vi behandlar personuppgifter.</p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}

export default CookiePolicyPage
