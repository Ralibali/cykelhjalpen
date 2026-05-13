import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { setSEOMeta } from '@/lib/seoHelpers'

const SEOLandingPage = ({
  title,
  metaDescription,
  canonical,
  h1,
  serviceType,
  children,
}: {
  title: string
  metaDescription: string
  canonical: string
  h1: string
  serviceType: string
  children: React.ReactNode
}) => {
  useEffect(() => {
    setSEOMeta({ title, description: metaDescription, canonical })
  }, [title, metaDescription, canonical])

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://updro.se/' },
      { '@type': 'ListItem', position: 2, name: h1, item: canonical },
    ],
  }

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceType,
    serviceType,
    provider: { '@id': 'https://updro.se/#organization' },
    areaServed: { '@type': 'Country', name: 'Sweden' },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SEK',
      description: 'Gratis offertjämförelse',
    },
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <article className="container max-w-3xl py-16 md:py-24">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
            {h1}
          </h1>
          <div className="prose prose-lg max-w-none text-foreground/80 [&_h2]:font-display [&_h2]:text-foreground [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-1">
            {children}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <Link to="/publicera">
              <Button size="lg" className="bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl px-8 py-6 text-base font-semibold shadow-md">
                Starta din förfrågan – gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-col gap-2 text-sm">
            <Link to="/" className="text-primary hover:underline">
              Jämför digitala byråer gratis på Updro
            </Link>
            <Link to="/byraer" className="text-primary hover:underline">
              Se alla byråer
            </Link>
          </div>
        </article>
      </main>
      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
    </div>
  )
}

export const HittaWebbbyraPage = () => (
  <SEOLandingPage
    title="Hitta Webbyrå – Jämför offerter gratis | Updro"
    metaDescription="Jämför offerter från webbyråer i Sverige. Beskriv ditt projekt och få svar inom 24h. Gratis och utan förpliktelser."
    canonical="https://updro.se/hitta-webbyra"
    h1="Hitta rätt webbyrå – få offerter inom 24 timmar"
    serviceType="Webbutveckling"
  >
    <h2>Vad ska man tänka på när man väljer webbyrå?</h2>
    <p>
      Att välja rätt webbyrå är ett av de viktigaste besluten du kan ta för ditt företags digitala närvaro. En bra webbyrå förstår inte bara teknik – de förstår din bransch, dina kunder och dina affärsmål. Innan du bestämmer dig bör du titta på byråns portfolio, läsa recensioner från tidigare kunder och be om referensprojekt som liknar ditt.
    </p>
    <p>
      Det är också viktigt att klargöra vad som ingår i priset. Inkluderar offerten design, utveckling, SEO-grundarbete och utbildning? Erbjuder byrån löpande support och underhåll efter lansering? Dessa frågor kan spara dig både tid och pengar på lång sikt.
    </p>

    <h2>Hur matchar Updro dig med rätt webbyrå?</h2>
    <p>
      På Updro beskriver du ditt projekt i ett enkelt formulär – vad du behöver, din budget och tidsram. Vi matchar sedan din förfrågan med upp till fem kvalitetssäkrade webbyråer som har erfarenhet inom just ditt område. Alla byråer på Updro är manuellt granskade, vilket innebär att du bara får offerter från seriösa och kompetenta partners.
    </p>
    <p>
      Processen är helt gratis för dig som beställare. Du betalar ingenting – varken för att lägga upp ditt projekt eller för att ta emot och jämföra offerter. Byråerna svarar vanligtvis inom 24 timmar, så du kan komma igång snabbt.
    </p>

    <h2>Vad kostar det att anlita en webbyrå?</h2>
    <p>
      Priset för ett webbprojekt varierar kraftigt beroende på omfattning och komplexitet. Priset för ett webbprojekt varierar kraftigt beroende på omfattning och komplexitet. En enklare företagssajt med fem till tio sidor kan kosta mellan 20 000 och 80 000 kr. En mer avancerad sajt med kundportal, bokningssystem eller e-handelsfunktionalitet hamnar ofta mellan 80 000 och 300 000 kr. Större enterprise-lösningar kan kosta ännu mer. En mer avancerad sajt med kundportal, bokningssystem eller e-handelsfunktionalitet hamnar ofta mellan 80 000 och 300 000 kr. Större enterprise-lösningar kan kosta ännu mer.
    </p>
    <p>
      Genom att jämföra offerter från flera webbyråer får du en tydlig bild av marknadspriset och kan fatta ett välgrundat beslut. På Updro ser du inte bara priset – du kan också jämföra byråernas specialistområden, leveranstider och kundbetyg.
    </p>

    <h2>Hur jämför man offerter från webbyråer?</h2>
    <p>
      När du har fått offerter bör du jämföra dem utifrån flera faktorer: pris, leveranstid, vad som ingår, teknikval (WordPress, React, Webflow etc.) och byråns erfarenhet inom din bransch. Billigast är inte alltid bäst – titta på helheten och värdet du får för pengarna. En byrå som levererar en genomtänkt, SEO-optimerad sajt kan spara dig hundratusentals kronor i framtida marknadsföringskostnader.
    </p>
  </SEOLandingPage>
)

export const HittaSeoByraPage = () => (
  <SEOLandingPage
    title="Hitta SEO-byrå – Jämför offerter gratis | Updro"
    metaDescription="Jämför offerter från SEO-byråer i Sverige. Få upp till fem offerter inom 24h. Gratis och utan förpliktelser."
    canonical="https://updro.se/hitta-seo-byra"
    h1="Hitta rätt SEO-byrå – jämför och välj"
    serviceType="SEO & sökmotoroptimering"
  >
    <h2>Vad innebär SEO?</h2>
    <p>
      SEO (sökmotoroptimering) handlar om att förbättra din webbplats synlighet i Googles organiska sökresultat. En effektiv SEO-strategi inkluderar teknisk optimering av din sajt, innehållsproduktion som riktar sig mot relevanta sökord, och länkbyggande som stärker din webbplats auktoritet. Målet är att driva kvalificerad trafik till din sajt – besökare som aktivt söker efter det du erbjuder.
    </p>
    <p>
      Till skillnad från betald annonsering ger SEO långsiktiga resultat. När din sajt väl rankar högt för viktiga sökord får du löpande trafik utan att betala per klick. Det gör SEO till en av de mest kostnadseffektiva marknadsföringsmetoderna över tid.
    </p>

    <h2>Hur väljer man SEO-byrå?</h2>
    <p>
      En bra SEO-byrå ska kunna visa dokumenterade resultat – konkreta exempel på hur de har förbättrat rankings och trafik för andra kunder. Fråga efter case studies och be om att få prata med referenskunder. Se upp för byråer som garanterar förstaplats på Google – det är ett löfte ingen seriös byrå kan ge.
    </p>
    <p>
      Titta också på vilken metodik byrån använder. Transparenta byråer delar regelbundna rapporter och kommunicerar tydligt vad de gör och varför. Undvik byråer som är vaga om sina metoder eller som använder tveksamma tekniker (så kallad "black hat SEO") som kan skada din sajt på lång sikt.
    </p>

    <h2>Vad kostar SEO?</h2>
    <p>
      Priset för SEO-tjänster varierar beroende på projektets omfattning och konkurrensen i din bransch. En grundläggande SEO-insats för ett lokalt företag kan kosta mellan 5 000 och 15 000 kr per månad. Mer ambitiösa satsningar med nationell räckvidd och hög konkurrens hamnar ofta mellan 15 000 och 40 000 kr per månad. Engångsprojekt som SEO-audit eller teknisk optimering prissätts vanligtvis separat.
    </p>

    <h2>Lokal SEO vs. nationell SEO</h2>
    <p>
      Lokal SEO fokuserar på att synas i sökresultat för din geografiska region – perfekt för företag som restauranger, tandläkare och hantverkare. Nationell SEO riktar sig mot hela landet och kräver oftast mer omfattande insatser. Vilken strategi som passar dig beror på din målgrupp och var dina kunder finns.
    </p>

    <h2>Röda flaggor att se upp för</h2>
    <ul>
      <li>Byråer som garanterar förstaplats på Google</li>
      <li>Orealistiskt låga priser som verkar för bra för att vara sant</li>
      <li>Brist på transparens kring metoder och rapportering</li>
      <li>Långa bindningstider utan tydliga milstolpar</li>
      <li>Inga referenskunder eller case studies att visa upp</li>
    </ul>
  </SEOLandingPage>
)

export const HittaDigitalByraPage = () => (
  <SEOLandingPage
    title="Hitta Digital Byrå – Jämför offerter gratis | Updro"
    metaDescription="Hitta rätt digital byrå för ditt projekt. Jämför offerter från kvalitetssäkrade byråer inom Meta Ads, SEO, webb och mer."
    canonical="https://updro.se/hitta-digital-byra"
    h1="Hitta digital byrå – upp till fem offerter gratis"
    serviceType="Digital marknadsföring"
  >
    <h2>Vad gör en digital byrå?</h2>
    <p>
      En digital byrå hjälper företag att växa genom digitala kanaler. Det kan handla om allt från att bygga en ny webbplats och driva sökmotoroptimering till att skapa och hantera annonskampanjer på Meta (Facebook/Instagram), Google Ads och LinkedIn. Många digitala byråer erbjuder också tjänster inom content marketing, e-postmarknadsföring, sociala medier och konverteringsoptimering.
    </p>
    <p>
      Den gemensamma nämnaren är att en digital byrå hjälper dig att nå, engagera och konvertera kunder online. I en värld där allt fler köpbeslut börjar med en Google-sökning eller ett socialt medie-flöde är rätt digital partner avgörande för framgång.
    </p>

    <h2>Fullservice vs. nischade digitala byråer</h2>
    <p>
      Fullservicebyråer erbjuder ett brett utbud av tjänster under ett tak – från strategi och design till utveckling och marknadsföring. Fördelen är att du får en samlad partner som ser helheten. Nackdelen kan vara att de inte är lika specialiserade inom varje enskilt område.
    </p>
    <p>
      Nischade byråer fokuserar istället på ett specifikt område, som SEO, performance marketing eller UX-design. De har ofta djupare expertis inom sitt fält men kan inte hjälpa dig med allt. Valet beror på dina behov – behöver du hjälp med många kanaler samtidigt kan en fullservicebyrå vara rätt. Har du ett specifikt problem kan en nischad specialist vara bättre.
    </p>

    <h2>Hur påverkar budgeten valet av byrå?</h2>
    <p>
      Din budget avgör vilken typ av byrå och vilken omfattning av tjänster du kan förvänta dig. Med en mindre budget (under 10 000 kr/mån) kan du ofta få hjälp med en specifik kanal eller ett avgränsat projekt. Med en medelstor budget (10 000–50 000 kr/mån) öppnar sig möjligheter för mer strategiskt arbete över flera kanaler. Större budgetar ger tillgång till senior kompetens, avancerad analys och flerkanalsstrategier.
    </p>

    <h2>Vanliga misstag vid val av digital partner</h2>
    <ul>
      <li>Att välja enbart baserat på pris utan att utvärdera kvalitet och erfarenhet</li>
      <li>Att inte definiera tydliga mål och KPI:er innan projektet startar</li>
      <li>Att binda sig till långa avtal utan att först testa samarbetet</li>
      <li>Att inte be om referenskunder och case studies</li>
      <li>Att förvänta sig omedelbara resultat – digital marknadsföring tar tid att ge effekt</li>
    </ul>
    <p>
      Genom att jämföra offerter på Updro får du en transparent bild av vad olika byråer erbjuder och kan fatta ett välgrundat beslut. Alla byråer på plattformen är kvalitetssäkrade, vilket minskar risken för dåliga upplevelser.
    </p>
  </SEOLandingPage>
)
