import { useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { setSEOMeta } from '@/lib/seoHelpers'

const EditorialPolicyPage = () => {
  useEffect(() => {
    setSEOMeta({
      title: 'Redaktionell policy – så jobbar Updro med innehåll',
      description:
        'Hur vi väljer ämnen, vilka källor vi använder och hur vi rättar fel. Updros redaktionella policy för guider och artiklar.',
      canonical: 'https://updro.se/redaktionell-policy',
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-16 max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Redaktionell policy</h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Updros redaktion publicerar guider, jämförelser och nyheter om den svenska digitala byråmarknaden. Den här
            sidan beskriver hur vi väljer ämnen, vilka källor vi använder och hur vi rättar fel.
          </p>

          <div className="mt-10 space-y-8 text-foreground/85 leading-relaxed">
            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Hur vi väljer ämnen</h2>
              <p>
                Vi prioriterar ämnen där vi själva har data – från offerter via Updro, samtal med byråer, eller publika
                källor som Statistiska centralbyrån, E-handelsbarometern och Postnords e-handelsrapporter. Om vi inte
                har egen data eller en pålitlig källa publicerar vi inte siffran.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Källor och faktagranskning</h2>
              <p>
                Konkreta påståenden ska gå att backa upp. Vi använder primärt:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Offert- och projektdata från Updro (anonymiserad och aggregerad).</li>
                <li>Officiell statistik från SCB, Tillväxtverket och liknande myndigheter.</li>
                <li>Branschrapporter från etablerade aktörer (Postnord, IIS, Svensk Digital Handel).</li>
                <li>Direkt kommunikation med svenska byråer och köpare.</li>
              </ul>
              <p className="mt-2">
                Citat från personer publiceras endast om personen själv godkänt det. Vi hittar aldrig på citat.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">AI i produktionen</h2>
              <p>
                Vi använder AI-verktyg för utkast och research. Varje publicerad artikel granskas av en namngiven
                redaktör innan publicering. AI-genererade siffror eller citat tas alltid bort om de inte kan styrkas av
                en mänsklig källa.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Korrigeringar</h2>
              <p>
                Hittar du ett fel i en artikel – mejla{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">
                  info@auroramedia.se
                </a>
                . Vi rättar uppgiften och dokumenterar ändringen i artikelns "senast uppdaterad"-datum. Större
                korrigeringar markeras tydligt i texten.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Oberoende</h2>
              <p>
                Updro är en marknadsplats. Vi tjänar pengar när byråer betalar för leads – inte på att rekommendera
                specifika byråer i artiklar. Inga byråer betalar för positiva omnämnanden, och vi tar inte emot
                sponsring i redaktionellt innehåll.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Kontakt</h2>
              <p>
                Synpunkter eller tips på artikelämnen:{' '}
                <a href="mailto:info@auroramedia.se" className="text-primary underline">
                  info@auroramedia.se
                </a>
                .
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default EditorialPolicyPage
