import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import CykelNavbar from '@/components/cykelhjalpen/CykelNavbar'
import CykelFooter from '@/components/cykelhjalpen/CykelFooter'
import { HomeHero } from '@/components/HomeHero';
import { HomeReveal } from '@/components/HomeReveal'
import { buildCykelHomeFaqs } from '@/components/cykelhjalpen/CykelHomeTrust'
import { CYKEL_CITIES, cityLandingPath } from '@/lib/cykelCities'
import { trackClick } from '@/hooks/usePageTracking'
import { usePageSeo } from '@/i18n/usePageSeo'
import { useLanguage, useT } from '@/lib/i18n'
import '@/home-design.css'

const CykelhjalpenIndexV3 = () => {
  const t = useT()
  const { lang } = useLanguage()
  const pageSeo = usePageSeo('/')
  const faqs = buildCykelHomeFaqs(t)
  const text = (sv: string, en: string) => lang === 'en' ? en : sv

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://cykelhjalpen.se/#website',
        url: 'https://cykelhjalpen.se/',
        name: 'Cykelhjälpen',
        inLanguage: lang === 'en' ? 'en' : 'sv-SE',
      },
      {
        '@type': 'Service',
        '@id': 'https://cykelhjalpen.se/#service',
        name: text('Jämförelsetjänst för cykelreparationer', 'Bike repair comparison service'),
        serviceType: text('Jämförelse av lokala cykelverkstäder', 'Comparison of local bike shops'),
        areaServed: ['Linköping', 'Norrköping', 'Uppsala', 'Lund'].map((name) => ({ '@type': 'City', name })),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
        description: text('Jämför svar från lokala cykelverkstäder i Linköping, Norrköping, Uppsala och Lund.', 'Compare responses from local bike shops in Linköping, Norrköping, Uppsala and Lund.'),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }

  return (
    <div className="home-page home-cycle">
      <Helmet>
        <title>{text('Cykelhjälpen – jämför lokala cykelverkstäder', 'Cykelhjälpen – compare local bike shops')}</title>
        <meta name="description" content={text('Beskriv felet på din cykel och jämför pris och möjlig tid från lokala cykelverkstäder i Linköping, Norrköping, Uppsala och Lund.', 'Describe the problem with your bike and compare price and available time from local bike shops in Linköping, Norrköping, Uppsala and Lund.')} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={pageSeo.canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Cykelhjälpen" />
        <meta property="og:title" content={text('Cykelhjälpen – jämför innan du väljer verkstad', 'Cykelhjälpen – compare before choosing a bike shop')} />
        <meta property="og:description" content={text('Ett formulär, lokala svar och friheten att välja själv.', 'One form, local responses and the freedom to choose.')} />
        <meta property="og:url" content={pageSeo.canonical} />
        <meta property="og:image" content="https://cykelhjalpen.se/og/hem.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <CykelNavbar />
      <main id="home-main">
        <HomeHero lang={lang}>
          <Link className="home-button" to="/skicka-arende" onClick={() => trackClick('home_primary_cta_clicked', 'Få prisförslag gratis')}>{text('Beskriv felet', 'Describe the problem')} <span aria-hidden="true">↗</span></Link>
        </HomeHero>

        <section id="sa-fungerar-det" className="home-section">
          <HomeReveal className="home-container">
            <h2 className="home-section-heading">{text('Så går det till', 'How it works')}</h2>
            <div className="home-grid home-steps">
              {[
                [text('Berätta vad som är fel', 'Tell us what is wrong'), text('Kedjan hoppar, bromsen tar dåligt, det låter konstigt bak. Skriv det som du skulle säga det till en kompis.', 'The chain skips, the brakes feel weak, something rattles at the back. Explain it as you would to a friend.')],
                [text('Verkstäderna svarar', 'The workshops reply'), text('De som har tid och kan jobbet skickar pris och när de kan ta emot cykeln.', 'Workshops that have time and can do the job send a price and when they can take the bike.')],
                [text('Du väljer', 'You choose'), text('Jämför svaren och ta den som passar. Eller ingen alls.', 'Compare the replies and choose the one that suits you. Or none at all.')],
              ].map(([title, body], index) => <div className="home-step" key={title}><span className="home-number">{index + 1}</span><h3>{title}</h3><p>{body}</p></div>)}
            </div>
          </HomeReveal>
        </section>

        <section id="stader" className="home-section home-soft">
          <HomeReveal className="home-container">
            <h2 className="home-section-heading">{text('Var bor du?', 'Where do you live?')}</h2>
            <div className="home-grid home-cities">
              {CYKEL_CITIES.map(city => <Link className="home-card home-city" key={city.name} to={cityLandingPath(city.name)} onClick={() => trackClick('home_v3_city_clicked', city.name, { city: city.name })}><h3>{city.name}</h3><p>{text('Lokala tips och verkstäder', 'Local advice and workshops')}</p><span className="home-city-mark" aria-hidden="true">↗</span></Link>)}
            </div>
          </HomeReveal>
        </section>

        <section className="home-section">
          <HomeReveal className="home-container">
            <h2 className="home-section-heading">{text('Det här brukar folk skriva om', 'Common bike problems')}</h2>
            <div className="home-chips">
              {[
                [text('Punka', 'Flat tyre'), 'Punktering'], [text('Växlarna hoppar', 'Skipping gears'), 'Växlar'], [text('Bromsarna tar dåligt', 'Weak brakes'), 'Bromsar'], [text('Vårservice', 'Spring service'), 'Service'], [text('Elcykeln krånglar', 'E-bike trouble'), 'Elcykel-problem'],
              ].map(([label, problem]) => <Link className="home-chip" key={problem} to={`/skicka-arende?problem=${encodeURIComponent(problem)}`} onClick={() => trackClick('home_quickstart_clicked', label, { problem })}>{label}</Link>)}
            </div>
          </HomeReveal>
        </section>

        <section id="vanliga-fragor" className="home-section" style={{ paddingTop: 0 }}>
          <HomeReveal className="home-container home-faq-layout">
            <h2>{text('Bra att veta', 'Good to know')}</h2>
            <div className="home-faq">
              {[
                [text('Kostar det något?', 'Does it cost anything?'), text('Nej. Du betalar bara verkstaden, om du väljer att anlita någon.', 'No. You only pay the workshop if you choose to use one.')],
                [text('Hur många svar får jag?', 'How many replies will I get?'), text('Högst tre. Det ska vara lätt att jämföra, inte jobbigt.', 'Up to three. Comparing should be easy, not a chore.')],
                [text('Måste jag välja någon?', 'Do I have to choose a workshop?'), text('Nej. Passar inget så låter du bli.', 'No. If none of the replies suit you, leave it at that.')],
              ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
              {/* Keep the original structured-data answers available to visitors. */}
              <details className="home-more"><summary>{text('Fler frågor om Cykelhjälpen', 'More about Cykelhjälpen')}</summary>{faqs.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</details>
            </div>
          </HomeReveal>
        </section>

        <section className="home-section" style={{ paddingTop: 0 }}>
          <HomeReveal className="home-container">
            <div className="home-recruit">
              <div><p className="home-eyebrow">{text('För verkstäder', 'For workshops')}</p><h2>{text('Har du en cykelverkstad?', 'Do you run a bike workshop?')}</h2><p>{text('Få jobb från folk i stan som redan vet vad de vill ha hjälp med. Ingen månadsavgift. De två första kunderna du vinner är gratis, sen kostar det 50 kr exkl. moms per jobb.', 'Get jobs from people nearby who know what they need help with. No monthly fee. The first two customers you win are free, then it costs SEK 50 excluding VAT per job.')}</p></div>
              <Link className="home-button" to="/for-cykelverkstader" onClick={() => trackClick('home_v3_workshop_cta', 'Founding Partner')}>{text('Läs mer och anslut', 'Learn more and join')} <span aria-hidden="true">↗</span></Link>
            </div>
          </HomeReveal>
        </section>
      </main>
      <CykelFooter homeDesign />
    </div>
  )
}

export default CykelhjalpenIndexV3
