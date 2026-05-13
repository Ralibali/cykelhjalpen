export interface SEOSubPage {
  slug: string
  title: string
  h1: string
  metaDesc: string
  intro: string
  sections: { heading: string; content: string }[]
  faq: { q: string; a: string }[]
  relatedLinks: { label: string; href: string }[]
}

export interface SEOPillarPage {
  categorySlug: string
  categoryName: string
  metaTitle: string
  metaDesc: string
  h1: string
  intro: string
  sections: { heading: string; content: string }[]
  faq: { q: string; a: string }[]
  subPages: SEOSubPage[]
  relatedCategories: { label: string; href: string }[]
}

export const SEO_PAGES: SEOPillarPage[] = [
  // ─── WEBBUTVECKLING ───
  {
    categorySlug: 'webbutveckling',
    categoryName: 'Webbutveckling',
    metaTitle: 'Webbutveckling – Hitta rätt webbyrå | Updro',
    metaDesc: 'Jämför offerter från de bästa webbbyråerna i Sverige. Få skräddarsydd webbutveckling till rätt pris – kostnadsfritt och utan förpliktelser.',
    h1: 'Webbutveckling – Hitta rätt byrå för ditt projekt',
    intro: 'Att bygga en professionell webbplats är en av de viktigaste investeringarna för ditt företag. Oavsett om du behöver en enkel företagssida, en avancerad webbapplikation eller en komplett redesign – rätt webbyrå gör hela skillnaden. På Updro jämför du kostnadsfritt offerter från kvalitetssäkrade webbbyråer och hittar den perfekta partnern för ditt projekt.',
    sections: [
      {
        heading: 'Vad är webbutveckling?',
        content: 'Webbutveckling omfattar hela processen att skapa och underhålla webbplatser. Det inkluderar webbdesign, front-end-utveckling (det användaren ser), back-end-utveckling (serverlogik och databaser), samt optimering för hastighet och sökmotorer. Modern webbutveckling handlar om att skapa responsiva, snabba och användarvänliga digitala upplevelser som konverterar besökare till kunder.\n\nEn professionell webbplats är mer än bara en digital närvaro – den är ditt företags viktigaste säljverktyg. Studier visar att 75% av konsumenter bedömer ett företags trovärdighet baserat på webbplatsens design. Därför är det avgörande att investera i kvalitativ webbutveckling.'
      },
      {
        heading: 'Hur fungerar processen?',
        content: 'En typisk webbutvecklingsprocess följer dessa steg:\n\n1. **Behovsanalys** – Byrån kartlägger dina mål, målgrupp och funktionella krav\n2. **Wireframes & design** – Visuella skisser och prototyper tas fram\n3. **Utveckling** – Webbplatsen byggs med modern teknik\n4. **Innehåll** – Texter, bilder och video integreras\n5. **Testning** – Kvalitetssäkring på alla enheter och webbläsare\n6. **Lansering** – Webbplatsen publiceras och optimeras\n7. **Förvaltning** – Löpande underhåll och vidareutveckling\n\nHela processen tar vanligtvis 4–12 veckor beroende på projektets omfattning.'
      },
      {
        heading: 'Vad kostar webbutveckling?',
        content: 'Priset för webbutveckling varierar beroende på projektets komplexitet:\n\n- **Enkel företagssida** (5–10 sidor): 15 000 – 50 000 kr\n- **Avancerad hemsida** med CMS: 30 000 – 100 000 kr\n- **Webbapplikation**: 50 000 – 300 000+ kr\n- **E-handelsplattform**: 40 000 – 200 000+ kr\n\nPriset påverkas av design, funktionalitet, integrationer och val av CMS. Genom att jämföra offerter via Updro kan du spara upp till 40% jämfört med att kontakta byråer direkt.'
      },
      {
        heading: 'Populära tekniker och CMS',
        content: 'De vanligaste teknikerna för webbutveckling i Sverige inkluderar:\n\n- **WordPress** – Världens mest populära CMS, perfekt för företagssidor och bloggar\n- **React / Next.js** – Moderna JavaScript-ramverk för snabba webbapplikationer\n- **Webflow** – Visuell plattform för designdrivna webbplatser\n- **Headless CMS** – Flexibla lösningar som Sanity, Strapi eller Contentful\n- **Custom-utveckling** – Skräddarsydda lösningar från grunden\n\nValet av teknik beror på dina behov, budget och framtida planer.'
      },
      {
        heading: 'Varför anlita en webbyrå?',
        content: 'Att anlita en professionell webbyrå ger dig:\n\n- **Expertis** – Tillgång till designers, utvecklare och projektledare\n- **Kvalitet** – Professionell kod, design och SEO-optimering\n- **Tidsbesparing** – Fokusera på din kärnverksamhet\n- **Resultat** – En webbplats som faktiskt konverterar besökare\n- **Support** – Löpande underhåll och teknisk support\n\nEn bra webbyrå är inte bara en leverantör utan en strategisk partner som hjälper ditt företag att växa digitalt.'
      }
    ],
    faq: [
      { q: 'Hur lång tid tar det att bygga en hemsida?', a: 'En enkel företagssida tar vanligtvis 3–6 veckor. Mer komplexa projekt som webbapplikationer eller e-handel kan ta 8–16 veckor. Tidslinjen beror på projektets omfattning, antal revideringsrundor och hur snabbt innehåll levereras.' },
      { q: 'Vad kostar en hemsida 2026?', a: 'En professionell företagshemsida kostar typiskt mellan 15 000 och 100 000 kr. Priset beror på design, funktionalitet, antal sidor och val av CMS. Genom att jämföra offerter via Updro hittar du rätt pris för ditt projekt.' },
      { q: 'Vilken teknik ska jag välja?', a: 'Det beror på dina behov. WordPress passar de flesta företagssidor, medan React/Next.js är bättre för avancerade webbapplikationer. Vi rekommenderar att du diskuterar dina krav med 2–3 byråer för att hitta rätt lösning.' },
      { q: 'Kan jag uppdatera hemsidan själv?', a: 'Ja, de flesta moderna webbplatser byggs med ett CMS (Content Management System) som gör det enkelt att uppdatera texter, bilder och annat innehåll utan teknisk kunskap.' },
      { q: 'Ingår SEO i webbutvecklingen?', a: 'Grundläggande teknisk SEO bör alltid ingå – snabb laddtid, mobilanpassning, sitemaps och korrekta meta-taggar. Mer avancerad SEO som sökordsoptimering och länkbyggande är ofta separata tjänster.' },
    ],
    subPages: [
      {
        slug: 'stockholm',
        title: 'Webbutveckling Stockholm – Hitta webbyrå | Updro',
        h1: 'Webbutveckling i Stockholm',
        metaDesc: 'Hitta de bästa webbbyråerna i Stockholm. Jämför offerter kostnadsfritt och hitta rätt partner för din webbutveckling.',
        intro: 'Stockholm är Sveriges digitala nav med hundratals webbbyråer att välja bland. Oavsett om du driver ett startup i Södermalm eller ett etablerat företag i Kista – rätt webbyrå kan transformera din digitala närvaro. Via Updro jämför du offerter från kvalitetssäkrade Stockholmsbyråer och hittar den perfekta matchningen.',
        sections: [
          { heading: 'Webbbyråer i Stockholm', content: 'Stockholms webbyrå-marknad är en av de mest dynamiska i Norden. Här finns allt från boutique-studios med 5 anställda till fullservice-byråer med 200+ medarbetare. Priserna varierar – en enkel hemsida kostar typiskt 20 000–60 000 kr hos Stockholmsbyråer, medan mer avancerade projekt kan kosta 100 000–500 000 kr. Genom att jämföra offerter via Updro hittar du rätt kvalitet till rätt pris.' },
          { heading: 'Varför välja en lokal byrå?', content: 'Att välja en webbyrå i Stockholm ger dig möjlighet till fysiska möten, bättre förståelse för den lokala marknaden och enklare kommunikation. Många företag föredrar en byrå i samma stad för snabbare responstider och starkare partnerskap. Dock kan distanssamarbeten fungera utmärkt – det viktigaste är att byrån förstår dina behov och levererar kvalitet.' },
          { heading: 'Populära områden för webbbyråer', content: 'Stockholms webbbyråer är spridda över hela staden:\n\n- **Södermalm** – Kreativa studios och startups\n- **Kungsholmen** – Mellanstora byråer och konsulter\n- **Kista** – Teknikfokuserade utvecklare\n- **Vasastan** – Design-drivna byråer\n- **Gamla Stan** – Etablerade fullservice-byråer' },
        ],
        faq: [
          { q: 'Vad kostar webbutveckling i Stockholm?', a: 'Priserna ligger vanligtvis 10–20% högre än rikssnittet. En enkel företagssida kostar 20 000–60 000 kr, medan avancerade projekt kostar från 80 000 kr och uppåt.' },
          { q: 'Hur hittar jag rätt webbyrå i Stockholm?', a: 'Jämför minst 3 offerter, granska byråernas portfolio, och be om referenser. Via Updro matchar vi dig automatiskt med relevanta Stockholmsbyråer.' },
        ],
        relatedLinks: [
          { label: 'Webbutveckling Göteborg', href: '/webbutveckling/goteborg' },
          { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
          { label: 'SEO Stockholm', href: '/seo/stockholm' },
        ]
      },
      {
        slug: 'goteborg',
        title: 'Webbutveckling Göteborg – Hitta webbyrå | Updro',
        h1: 'Webbutveckling i Göteborg',
        metaDesc: 'Hitta webbbyråer i Göteborg. Jämför offerter och hitta rätt partner för webbutveckling i Göteborg.',
        intro: 'Göteborg har en livlig tech-scen med många duktiga webbbyråer. Staden är känd för sin starka design-tradition och innovativa företagsklimat. Via Updro jämför du offerter från Göteborgsbyråer och hittar rätt partner för ditt projekt.',
        sections: [
          { heading: 'Webbyrå-marknaden i Göteborg', content: 'Göteborgs webbyrå-marknad har vuxit kraftigt de senaste åren. Staden erbjuder en bra mix av kvalitet och prisvärdhet – typiskt 10–15% lägre priser jämfört med Stockholm. Här finns starka designbyråer, tekniska specialister och fullservice-agenturer som levererar på hög nivå.' },
          { heading: 'Lokal expertis', content: 'Göteborg är hem för flera framstående techbolag och har en stark tradition inom design och innovation. Webbbyråer i Göteborg är ofta duktiga på e-handel, industridesign och B2B-lösningar. Avenyn-området och Lindholmen Science Park är två populära nav för digitala företag.' },
        ],
        faq: [
          { q: 'Vad kostar webbutveckling i Göteborg?', a: 'Priserna är generellt 10–15% lägre än i Stockholm. En företagshemsida kostar vanligtvis 15 000–50 000 kr.' },
          { q: 'Finns det bra webbbyråer i Göteborg?', a: 'Absolut! Göteborg har en stark digital scen med många prisbelönta byråer. Jämför offerter via Updro för att hitta din matchning.' },
        ],
        relatedLinks: [
          { label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' },
          { label: 'E-handel Göteborg', href: '/ehandel/goteborg' },
          { label: 'SEO Göteborg', href: '/seo/goteborg' },
        ]
      },
      {
        slug: 'pris',
        title: 'Webbutveckling pris 2026 – Vad kostar en hemsida? | Updro',
        h1: 'Vad kostar webbutveckling 2026?',
        metaDesc: 'Komplett prisguide för webbutveckling i Sverige 2026. Se vad en hemsida kostar och jämför offerter från webbbyråer.',
        intro: 'Att veta vad webbutveckling kostar kan vara svårt – priserna varierar enormt beroende på vad du behöver. Här ger vi dig en komplett översikt över priserna för webbutveckling i Sverige 2026, så att du kan budgetera rätt och jämföra offerter.',
        sections: [
          { heading: 'Prisnivåer för webbutveckling', content: 'Här är en realistisk prisbild för webbutveckling i Sverige 2026:\n\n| Typ av projekt | Prisintervall |\n|---|---|\n| Enkel landningssida | 5 000 – 15 000 kr |\n| Företagshemsida (5–10 sidor) | 15 000 – 50 000 kr |\n| Avancerad hemsida med CMS | 30 000 – 100 000 kr |\n| E-handelsplattform | 40 000 – 200 000 kr |\n| Webbapplikation | 80 000 – 500 000+ kr |\n| Redesign av befintlig sajt | 15 000 – 80 000 kr |' },
          { heading: 'Vad påverkar priset?', content: 'Flera faktorer påverkar kostnaden:\n\n- **Design** – Unik design kostar mer än färdiga mallar\n- **Funktionalitet** – Fler funktioner = högre pris\n- **CMS-val** – WordPress är billigare, custom är dyrare\n- **Integrationer** – Betalningar, CRM, API:er\n- **Innehåll** – Copywriting, bilder, video\n- **SEO** – Sökmotoroptimering\n- **Byråns storlek** – Större byråer har ofta högre priser' },
          { heading: 'Så sparar du pengar', content: 'Tips för att hålla nere kostnaderna:\n\n1. **Jämför offerter** – Använd Updro för att jämföra minst 3 offerter\n2. **Prioritera** – Börja med MVP och bygg ut\n3. **Förbered innehåll** – Leverera texter och bilder i tid\n4. **Var tydlig** – En bra kravspecifikation minskar missförstånd\n5. **Välj rätt CMS** – Undvik överkonstruerade lösningar' },
        ],
        faq: [
          { q: 'Varför varierar priserna så mycket?', a: 'Prisskillnaderna beror på byråns storlek, erfarenhet, projektets komplexitet och geografisk plats. En freelancer kan ta 500 kr/timme medan en stor byrå kan ta 1 500 kr/timme.' },
          { q: 'Kan jag bygga en hemsida billigt?', a: 'Ja, men kompromissa inte med kvaliteten. En billig hemsida som inte konverterar är dyrare i längden. Satsa på minst 15 000–30 000 kr för en professionell företagssida.' },
          { q: 'Vad kostar underhåll?', a: 'Löpande underhåll kostar vanligtvis 500–3 000 kr/månad beroende på omfattning. Detta inkluderar uppdateringar, säkerhet och backup.' },
        ],
        relatedLinks: [
          { label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' },
          { label: 'E-handel pris', href: '/ehandel/pris' },
          { label: 'SEO pris', href: '/seo/pris' },
        ]
      },
      {
        slug: 'wordpress',
        title: 'WordPress-utveckling – Hitta WordPress-byrå | Updro',
        h1: 'WordPress-utveckling – Bygg din hemsida med världens populäraste CMS',
        metaDesc: 'Hitta WordPress-byråer i Sverige. Jämför offerter för WordPress-utveckling – hemsidor, teman och plugins.',
        intro: 'WordPress driver över 40% av alla webbplatser i världen och är det självklara valet för företag som vill ha en flexibel, skalbar och enkel webbplats. Från enkla bloggar till komplexa företagslösningar – WordPress kan hantera det mesta.',
        sections: [
          { heading: 'Varför WordPress?', content: 'WordPress är populärt av goda skäl:\n\n- **Flexibelt** – Tusentals plugins och teman\n- **Användarvänligt** – Enkelt att uppdatera innehåll\n- **SEO-vänligt** – Bra grund för sökmotoroptimering\n- **Kostnadseffektivt** – Lägre utvecklingskostnader\n- **Stort community** – Enkel att hitta utvecklare och support' },
          { heading: 'WordPress vs andra CMS', content: 'WordPress jämfört med andra plattformar:\n\n- **WordPress vs Webflow** – WordPress mer flexibelt, Webflow enklare design\n- **WordPress vs Wix** – WordPress skalbart, Wix enklare men begränsat\n- **WordPress vs Headless** – WordPress traditionellt, headless mer modernt\n- **WordPress vs Custom** – WordPress snabbare, custom mer skräddarsytt' },
        ],
        faq: [
          { q: 'Vad kostar en WordPress-sajt?', a: 'En enkel WordPress-sajt kostar 10 000–30 000 kr. En avancerad sajt med custom-tema och plugins kostar 30 000–100 000 kr.' },
          { q: 'Är WordPress säkert?', a: 'Ja, med rätt underhåll. Regelbundna uppdateringar, säkerhetsplugins och stark hosting gör WordPress mycket säkert.' },
        ],
        relatedLinks: [
          { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
          { label: 'E-handel WooCommerce', href: '/ehandel/woocommerce' },
          { label: 'SEO', href: '/seo' },
        ]
      },
      {
        slug: 'foretag',
        title: 'Webbutveckling för företag – Professionella hemsidor | Updro',
        h1: 'Webbutveckling för företag',
        metaDesc: 'Professionell webbutveckling för företag. Jämför offerter från företagsanpassade webbbyråer i Sverige.',
        intro: 'Din företagshemsida är ofta det första intrycket potentiella kunder får av ditt varumärke. En professionell, snabb och konverteringsoptimerad webbplats är inte en kostnad – det är en investering som betalar sig mångfalt.',
        sections: [
          { heading: 'Krav för företagshemsidor', content: 'En modern företagshemsida bör ha:\n\n- Responsiv design för alla enheter\n- Snabb laddtid (under 3 sekunder)\n- SSL-certifikat och GDPR-anpassning\n- CMS för enkel innehållshantering\n- SEO-optimerad struktur\n- Kontaktformulär och tydliga CTA:er\n- Integration med analytics och CRM' },
          { heading: 'ROI för företagshemsidor', content: 'En professionell hemsida ger avkastning genom:\n\n- Fler leads och förfrågningar\n- Ökad trovärdighet och professionalism\n- Bättre synlighet i sökmotorer\n- Effektivare kundkommunikation\n- Stärkt varumärke' },
        ],
        faq: [
          { q: 'Behöver mitt företag en hemsida?', a: 'Ja. Över 80% av konsumenter söker online innan de köper. Utan en professionell webbplats förlorar du potentiella kunder till konkurrenter.' },
        ],
        relatedLinks: [
          { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
          { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
          { label: 'SEO', href: '/seo' },
        ]
      },
    ],
    relatedCategories: [
      { label: 'SEO', href: '/seo' },
      { label: 'UX / Webbdesign', href: '/webbdesign' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
    ]
  },

  // ─── E-HANDEL ───
  {
    categorySlug: 'ehandel',
    categoryName: 'E-handel',
    metaTitle: 'E-handel – Bygg din webbutik | Updro',
    metaDesc: 'Jämför offerter från e-handelsbyråer i Sverige. Shopify, WooCommerce, custom – hitta rätt lösning för din webbutik.',
    h1: 'E-handel – Bygg en webbutik som säljer',
    intro: 'E-handeln i Sverige omsätter över 150 miljarder kronor årligen och fortsätter växa. Oavsett om du startar en ny webbutik eller vill optimera en befintlig – rätt e-handelsbyrå hjälper dig att maximera din försäljning online.',
    sections: [
      { heading: 'Vad är e-handelsutveckling?', content: 'E-handelsutveckling handlar om att bygga och optimera webbutiker. Det omfattar allt från design och användarupplevelse till betalningslösningar, lagerhantering och logistik-integrationer. En professionell e-handelsplattform är mer än bara en butik – det är ett komplett säljsystem som arbetar 24/7.\n\nModern e-handel kräver mobile-first-design, snabba laddtider, sömlösa checkout-flöden och integration med betalningsplattformar som Klarna, Swish och kortbetalning.' },
      { heading: 'Populära e-handelsplattformar', content: '**Shopify** – Enkel att komma igång, bra appar, månadsavgift\n**WooCommerce** – WordPress-baserat, flexibelt, inga transaktionsavgifter\n**Magento/Adobe Commerce** – Enterprise-lösning för stora volymer\n**Custom-byggt** – Helt skräddarsytt, max flexibilitet\n**Centra** – Svenskt alternativ för mode och lifestyle' },
      { heading: 'Vad kostar en webbutik?', content: '- **Enkel Shopify-butik**: 15 000 – 40 000 kr\n- **WooCommerce-butik**: 20 000 – 80 000 kr\n- **Avancerad e-handel**: 50 000 – 200 000 kr\n- **Enterprise-lösning**: 200 000 – 1 000 000+ kr\n\nLöpande kostnader inkluderar hosting, underhåll, betalningslösningar och marknadsföring.' },
    ],
    faq: [
      { q: 'Vilken e-handelsplattform är bäst?', a: 'Det beror på dina behov. Shopify är enklast, WooCommerce mest flexibelt, och Magento bäst för stora volymer. Jämför offerter via Updro för att hitta rätt.' },
      { q: 'Vad kostar det att starta e-handel?', a: 'Räkna med 20 000–80 000 kr för utveckling plus löpande kostnader på 1 000–5 000 kr/månad för hosting, betalningar och underhåll.' },
      { q: 'Hur lång tid tar det att bygga en webbutik?', a: 'En enkel Shopify-butik kan vara klar på 2–4 veckor. Mer avancerade lösningar tar 6–16 veckor.' },
    ],
    subPages: [
      {
        slug: 'shopify', title: 'Shopify-utveckling – Hitta Shopify-byrå | Updro', h1: 'Shopify-utveckling', metaDesc: 'Hitta Shopify-byråer i Sverige. Jämför offerter för Shopify-butiker, teman och appar.',
        intro: 'Shopify är världens ledande e-handelsplattform med över 4 miljoner butiker globalt. Plattformen erbjuder enkelhet, skalbarhet och ett enormt app-ekosystem.',
        sections: [
          { heading: 'Varför Shopify?', content: 'Shopify erbjuder en hosted lösning som tar hand om teknik, säkerhet och hosting. Du fokuserar på att sälja – Shopify sköter resten. Med Shopify Plus kan du skala upp till enterprise-nivå utan att byta plattform.' },
          { heading: 'Pris för Shopify-utveckling', content: 'En enkel Shopify-butik kostar 15 000–40 000 kr att bygga. Custom-tema: 30 000–80 000 kr. Shopify Plus-implementation: 100 000–300 000 kr. Månadsavgiften för Shopify Basic börjar på $39/månad.' },
        ],
        faq: [
          { q: 'Är Shopify bra för svenska butiker?', a: 'Ja! Shopify stödjer Klarna, Swish och har bra svenskt stöd. Många av Sveriges snabbast växande e-handlare använder Shopify.' },
        ],
        relatedLinks: [{ label: 'E-handel WooCommerce', href: '/ehandel/woocommerce' }, { label: 'E-handel pris', href: '/ehandel/pris' }]
      },
      {
        slug: 'woocommerce', title: 'WooCommerce-utveckling – WordPress e-handel | Updro', h1: 'WooCommerce-utveckling', metaDesc: 'Hitta WooCommerce-byråer i Sverige. Jämför offerter för WooCommerce-butiker och WordPress e-handel.',
        intro: 'WooCommerce är det mest populära e-handels-pluginet för WordPress och driver miljontals butiker världen över. Det är gratis, flexibelt och perfekt för företag som vill ha full kontroll.',
        sections: [
          { heading: 'Fördelar med WooCommerce', content: 'WooCommerce ger dig:\n- Inga transaktionsavgifter\n- Full ägandeskap av din data\n- Tusentals tillägg och extensions\n- SEO-fördelar tack vare WordPress\n- Obegränsad flexibilitet' },
        ],
        faq: [{ q: 'WooCommerce vs Shopify?', a: 'WooCommerce ger mer kontroll och flexibilitet men kräver mer teknisk kunskap. Shopify är enklare men har transaktionsavgifter och mindre flexibilitet.' }],
        relatedLinks: [{ label: 'E-handel Shopify', href: '/ehandel/shopify' }, { label: 'Webbutveckling WordPress', href: '/webbutveckling/wordpress' }]
      },
      {
        slug: 'pris', title: 'E-handel pris 2026 – Vad kostar en webbutik? | Updro', h1: 'Vad kostar e-handel 2026?', metaDesc: 'Komplett prisguide för e-handelsutveckling i Sverige 2026. Se kostnader för Shopify, WooCommerce och custom.',
        intro: 'Att starta eller uppgradera en webbutik är en investering. Här får du en realistisk prisbild för e-handelsutveckling i Sverige.',
        sections: [
          { heading: 'Kostnadsöversikt', content: '| Typ | Pris |\n|---|---|\n| Enkel Shopify-butik | 15 000 – 40 000 kr |\n| WooCommerce-butik | 20 000 – 80 000 kr |\n| Avancerad e-handel | 50 000 – 200 000 kr |\n| Enterprise (Magento/Centra) | 200 000 – 1 000 000+ kr |' },
        ],
        faq: [{ q: 'Vad kostar det per månad?', a: 'Räkna med 1 000–5 000 kr/månad för hosting, underhåll och betalningslösning. Shopify tar dessutom en transaktionsavgift om du inte använder Shopify Payments.' }],
        relatedLinks: [{ label: 'Webbutveckling pris', href: '/webbutveckling/pris' }, { label: 'SEO pris', href: '/seo/pris' }]
      },
      {
        slug: 'stockholm', title: 'E-handel Stockholm – Hitta e-handelsbyrå | Updro', h1: 'E-handel i Stockholm', metaDesc: 'Hitta e-handelsbyråer i Stockholm. Jämför offerter för webbutiker och e-handelslösningar.',
        intro: 'Stockholm är hem för många av Sveriges ledande e-handelsbyråer. Jämför offerter och hitta rätt byrå för din webbutik.',
        sections: [
          { heading: 'E-handelsbyråer i Stockholm', content: 'Stockholm har ett brett utbud av e-handelsspecialister – från Shopify-experter till enterprise-konsulter. Priserna är högre än rikssnittet men kvaliteten är konsekvent hög.' },
        ],
        faq: [{ q: 'Hur väljer jag e-handelsbyrå i Stockholm?', a: 'Jämför minst 3 offerter via Updro, granska portfolios och be om kundrekommendationer.' }],
        relatedLinks: [{ label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }, { label: 'SEO Stockholm', href: '/seo/stockholm' }]
      },
      {
        slug: 'utveckling', title: 'E-handelsutveckling – Bygg webbutik | Updro', h1: 'E-handelsutveckling – Guide till din webbutik', metaDesc: 'Allt du behöver veta om e-handelsutveckling. Från val av plattform till lansering och optimering.',
        intro: 'E-handelsutveckling är mer än att bara sätta upp en butik. Det handlar om att bygga ett komplett säljsystem som konverterar besökare till kunder.',
        sections: [
          { heading: 'Utvecklingsprocessen', content: '1. Strategi och kravspecifikation\n2. UX-design och wireframes\n3. Utveckling och integration\n4. Produktuppladdning och testning\n5. Lansering och optimering' },
        ],
        faq: [{ q: 'Kan jag starta e-handel utan teknisk kunskap?', a: 'Ja, med rätt byrå och plattform (som Shopify) kan du starta utan att skriva en rad kod.' }],
        relatedLinks: [{ label: 'E-handel Shopify', href: '/ehandel/shopify' }, { label: 'E-handel WooCommerce', href: '/ehandel/woocommerce' }]
      },
    ],
    relatedCategories: [
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'SEO', href: '/seo' },
    ]
  },

  // ─── DIGITAL MARKNADSFÖRING ───
  {
    categorySlug: 'digital-marknadsforing',
    categoryName: 'Digital marknadsföring',
    metaTitle: 'Digital marknadsföring – Hitta byrå | Updro',
    metaDesc: 'Jämför offerter från de bästa marknadsföringsbyråerna i Sverige. Google Ads, sociala medier, content – hitta rätt byrå.',
    h1: 'Digital marknadsföring – Nå rätt kunder online',
    intro: 'Digital marknadsföring är nyckeln till tillväxt i dagens konkurrensutsatta marknad. Genom att kombinera SEO, annonsering, sociala medier och content marketing kan du nå rätt kunder vid rätt tidpunkt. Via Updro jämför du offerter från kvalitetssäkrade marknadsföringsbyråer.',
    sections: [
      { heading: 'Vad ingår i digital marknadsföring?', content: 'Digital marknadsföring omfattar:\n\n- **SEO** – Organisk synlighet i sökmotorer\n- **Google Ads** – Betald annonsering i sökresultat\n- **Sociala medier** – Organiskt och betalt på Facebook, Instagram, LinkedIn\n- **Content marketing** – Bloggar, guider, video\n- **E-postmarknadsföring** – Nyhetsbrev och automatiserade flöden\n- **Konverteringsoptimering** – A/B-testning och UX-förbättringar' },
      { heading: 'Vad kostar digital marknadsföring?', content: '- **SEO-paket**: 5 000 – 30 000 kr/månad\n- **Google Ads-hantering**: 5 000 – 20 000 kr/månad + annonsbudget\n- **Social media-hantering**: 8 000 – 25 000 kr/månad\n- **Content marketing**: 5 000 – 20 000 kr/månad\n- **Komplett digital strategi**: 15 000 – 50 000 kr/månad' },
    ],
    faq: [
      { q: 'Vad ger bäst ROI?', a: 'SEO ger bäst långsiktig ROI medan Google Ads ger snabbare resultat. En kombination av båda är oftast optimalt.' },
      { q: 'Hur lång tid tar det att se resultat?', a: 'Google Ads ger resultat direkt. SEO tar vanligtvis 3–6 månader att ge märkbar effekt. Sociala medier varierar beroende på strategi.' },
    ],
    subPages: [
      {
        slug: 'strategi', title: 'Digital marknadsföringsstrategi – Guide | Updro', h1: 'Digital marknadsföringsstrategi', metaDesc: 'Så bygger du en digital marknadsföringsstrategi som ger resultat. Guide + jämför offerter från byråer.',
        intro: 'En framgångsrik digital marknadsföringsstrategi börjar med tydliga mål och en djup förståelse för din målgrupp.',
        sections: [{ heading: 'Bygga din strategi', content: '1. Definiera mål och KPI:er\n2. Analysera målgrupp och konkurrenter\n3. Välj kanaler och taktiker\n4. Skapa innehållsplan\n5. Implementera och mät\n6. Optimera löpande' }],
        faq: [{ q: 'Behöver jag en strategi?', a: 'Ja, utan strategi slösar du pengar på aktiviteter som inte ger resultat.' }],
        relatedLinks: [{ label: 'SEO', href: '/seo' }, { label: 'Sociala medier', href: '/sociala-medier' }]
      },
      {
        slug: 'stockholm', title: 'Digital marknadsföring Stockholm | Updro', h1: 'Digital marknadsföring i Stockholm', metaDesc: 'Hitta marknadsföringsbyråer i Stockholm. Jämför offerter för Google Ads, SEO och sociala medier.',
        intro: 'Stockholm har Sveriges bredaste utbud av marknadsföringsbyråer. Jämför offerter och hitta rätt partner.',
        sections: [{ heading: 'Marknadsföringsbyråer i Stockholm', content: 'Från små nischade specialister till stora fullservice-byråer – Stockholm har allt. De vanligaste tjänsterna inkluderar SEO, Google Ads, sociala medier och content marketing.' }],
        faq: [{ q: 'Vad kostar en marknadsföringsbyrå i Stockholm?', a: 'Räkna med 10 000–40 000 kr/månad beroende på tjänsteomfattning.' }],
        relatedLinks: [{ label: 'SEO Stockholm', href: '/seo/stockholm' }, { label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }]
      },
      {
        slug: 'pris', title: 'Digital marknadsföring pris 2026 | Updro', h1: 'Vad kostar digital marknadsföring?', metaDesc: 'Prisguide för digital marknadsföring 2026. Se kostnader för SEO, Google Ads och sociala medier.',
        intro: 'Priserna för digital marknadsföring varierar kraftigt. Här ger vi dig en tydlig översikt.',
        sections: [{ heading: 'Prisöversikt', content: '| Tjänst | Månadspris |\n|---|---|\n| SEO-grundpaket | 5 000 – 15 000 kr |\n| Google Ads-hantering | 5 000 – 20 000 kr |\n| Social media-paket | 8 000 – 25 000 kr |\n| Content marketing | 5 000 – 20 000 kr |\n| Komplett digital strategi | 20 000 – 60 000 kr |' }],
        faq: [{ q: 'Vad bör jag lägga i annonsbudget?', a: 'Minst lika mycket som du betalar byrån, gärna mer. En rimlig start är 5 000–10 000 kr/månad i annonsbudget.' }],
        relatedLinks: [{ label: 'SEO pris', href: '/seo/pris' }, { label: 'Webbutveckling pris', href: '/webbutveckling/pris' }]
      },
      {
        slug: 'byra', title: 'Marknadsföringsbyrå – Hitta rätt byrå | Updro', h1: 'Hitta rätt marknadsföringsbyrå', metaDesc: 'Guide till att hitta rätt marknadsföringsbyrå. Jämför offerter och hitta din perfekta matchning.',
        intro: 'Att välja rätt marknadsföringsbyrå är avgörande för dina resultat. Här guidar vi dig genom processen.',
        sections: [{ heading: 'Så väljer du byrå', content: '1. Definiera dina mål och budget\n2. Jämför minst 3 offerter via Updro\n3. Granska portfolios och case studies\n4. Be om kundrekommendationer\n5. Säkerställ att de rapporterar resultat transparent' }],
        faq: [{ q: 'Ska jag välja en nischad eller fullservice-byrå?', a: 'Om du har specifika behov (t.ex. bara SEO) passar en nischad byrå bäst. Om du behöver en heltäckande strategi kan en fullservice-byrå vara bättre.' }],
        relatedLinks: [{ label: 'SEO', href: '/seo' }, { label: 'Sociala medier', href: '/sociala-medier' }]
      },
    ],
    relatedCategories: [
      { label: 'SEO', href: '/seo' },
      { label: 'Sociala medier', href: '/sociala-medier' },
      { label: 'Webbutveckling', href: '/webbutveckling' },
    ]
  },

  // ─── SEO ───
  {
    categorySlug: 'seo',
    categoryName: 'SEO',
    metaTitle: 'SEO – Sökmotoroptimering | Hitta SEO-byrå | Updro',
    metaDesc: 'Jämför offerter från SEO-byråer i Sverige. Teknisk SEO, innehållsoptimering, länkbyggande – hitta rätt SEO-partner.',
    h1: 'SEO – Sökmotoroptimering som ger resultat',
    intro: 'Sökmotoroptimering (SEO) är den mest kostnadseffektiva kanalen för att driva relevant trafik till din webbplats. Till skillnad från betald annonsering ger SEO långsiktig tillväxt som inte försvinner när budgeten tar slut. Via Updro hittar du rätt SEO-byrå för ditt företag.',
    sections: [
      { heading: 'Vad är SEO?', content: 'SEO (Search Engine Optimization) handlar om att optimera din webbplats för att ranka högre i Googles sökresultat. Det omfattar tre huvudområden:\n\n- **Teknisk SEO** – Sajthastighet, mobilanpassning, crawlbarhet, strukturerad data\n- **On-page SEO** – Sökordsoptimering, meta-taggar, rubriker, innehållskvalitet\n- **Off-page SEO** – Länkbyggande, PR, omnämnanden\n\nEn effektiv SEO-strategi kombinerar alla tre för bästa resultat.' },
      { heading: 'Vad kostar SEO?', content: '- **SEO-audit**: 5 000 – 15 000 kr (engångskostnad)\n- **Grundpaket**: 5 000 – 15 000 kr/månad\n- **Standardpaket**: 10 000 – 25 000 kr/månad\n- **Premiumpaket**: 20 000 – 50 000+ kr/månad\n\nROI för SEO är typiskt 5–10x inom 12 månader för företag som investerar konsekvent.' },
      { heading: 'Hur lång tid tar SEO?', content: 'SEO är en långsiktig investering. Typiska tidshorisonter:\n\n- **1–3 månader**: Tekniska förbättringar, initial optimering\n- **3–6 månader**: Synliga förbättringar i ranking\n- **6–12 månader**: Signifikant trafikökning\n- **12+ månader**: Etablerad position, stabil tillväxt' },
    ],
    faq: [
      { q: 'Är SEO värt det?', a: 'Absolut. SEO ger typiskt 5–10 gånger avkastning på investerad summa. Till skillnad från annonser fortsätter organisk trafik även om du pausar arbetet.' },
      { q: 'Kan jag göra SEO själv?', a: 'Grundläggande SEO kan du göra själv, men för bästa resultat behövs expertis inom teknisk SEO, innehållsstrategi och länkbyggande.' },
      { q: 'SEO vs Google Ads?', a: 'SEO ger långsiktig, kostnadsfri trafik medan Google Ads ger omedelbar men betald trafik. Bäst resultat får du med en kombination.' },
    ],
    subPages: [
      {
        slug: 'stockholm', title: 'SEO Stockholm – Hitta SEO-byrå | Updro', h1: 'SEO i Stockholm', metaDesc: 'Hitta SEO-byråer i Stockholm. Jämför offerter och hitta rätt SEO-partner i Stockholm.',
        intro: 'Stockholm har Sveriges största utbud av SEO-byråer. Jämför offerter och hitta rätt partner för din sökmotoroptimering.',
        sections: [{ heading: 'SEO-byråer i Stockholm', content: 'Stockholms SEO-marknad erbjuder allt från freelancers till enterprise-byråer. Priserna ligger på 8 000–40 000 kr/månad beroende på omfattning.' }],
        faq: [{ q: 'Vad kostar SEO i Stockholm?', a: 'SEO-byråer i Stockholm tar vanligtvis 8 000–30 000 kr/månad.' }],
        relatedLinks: [{ label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }, { label: 'Digital marknadsföring Stockholm', href: '/digital-marknadsforing/stockholm' }]
      },
      {
        slug: 'goteborg', title: 'SEO Göteborg – Hitta SEO-byrå | Updro', h1: 'SEO i Göteborg', metaDesc: 'Hitta SEO-byråer i Göteborg. Jämför offerter för sökmotoroptimering i Göteborg.',
        intro: 'Göteborg har ett växande utbud av SEO-specialister. Jämför offerter via Updro och hitta rätt byrå.',
        sections: [{ heading: 'SEO i Göteborg', content: 'SEO-byråer i Göteborg erbjuder ofta bra pris-kvalitet. Priserna ligger vanligtvis 5 000–25 000 kr/månad.' }],
        faq: [{ q: 'Finns det bra SEO-byråer i Göteborg?', a: 'Ja, Göteborg har flera duktiga SEO-specialister med starka resultat.' }],
        relatedLinks: [{ label: 'SEO Stockholm', href: '/seo/stockholm' }, { label: 'Webbutveckling Göteborg', href: '/webbutveckling/goteborg' }]
      },
      {
        slug: 'pris', title: 'SEO pris 2026 – Vad kostar SEO? | Updro', h1: 'Vad kostar SEO 2026?', metaDesc: 'Komplett prisguide för SEO i Sverige 2026. Se kostnader för sökmotoroptimering.',
        intro: 'SEO-priser varierar kraftigt. Här ger vi dig en realistisk prisbild för sökmotoroptimering i Sverige.',
        sections: [{ heading: 'Prisöversikt', content: '| Paket | Pris/månad |\n|---|---|\n| SEO-audit (engång) | 5 000 – 15 000 kr |\n| Grundpaket | 5 000 – 15 000 kr |\n| Standard | 10 000 – 25 000 kr |\n| Premium | 20 000 – 50 000+ kr |' }],
        faq: [{ q: 'Varför är SEO så dyrt?', a: 'SEO kräver expertis, tid och kontinuerligt arbete. Men ROI är typiskt 5–10x, så det betalar sig.' }],
        relatedLinks: [{ label: 'Webbutveckling pris', href: '/webbutveckling/pris' }, { label: 'Digital marknadsföring pris', href: '/digital-marknadsforing/pris' }]
      },
      {
        slug: 'analys', title: 'SEO-analys – Gratis granskning | Updro', h1: 'SEO-analys – Så bra presterar din sajt', metaDesc: 'Få en SEO-analys av din webbplats. Identifiera förbättringsområden och jämför offerter.',
        intro: 'En SEO-analys ger dig en tydlig bild av din webbplats nuläge och visar exakt vad som behöver förbättras.',
        sections: [{ heading: 'Vad ingår?', content: 'En komplett SEO-analys inkluderar:\n- Teknisk granskning (hastighet, mobilanpassning, fel)\n- Sökordsanalys\n- Innehållsgranskning\n- Konkurrentanalys\n- Länkprofilanalys\n- Handlingsplan med prioriteringar' }],
        faq: [{ q: 'Hur ofta bör jag göra en SEO-analys?', a: 'Minst en gång per kvartal för att säkerställa att din strategi fungerar.' }],
        relatedLinks: [{ label: 'SEO pris', href: '/seo/pris' }, { label: 'Webbutveckling', href: '/webbutveckling' }]
      },
    ],
    relatedCategories: [
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'UX / Webbdesign', href: '/webbdesign' },
    ]
  },

  // ─── GRAFISK DESIGN ───
  {
    categorySlug: 'grafisk-design',
    categoryName: 'Grafisk design & UX',
    metaTitle: 'Grafisk design – Hitta designbyrå | Updro',
    metaDesc: 'Jämför offerter från designbyråer i Sverige. Logotyp, grafisk profil, UX-design – hitta rätt byrå.',
    h1: 'Grafisk design – Skapa ett visuellt starkt varumärke',
    intro: 'Grafisk design är grunden för hur ditt varumärke uppfattas. Från logotyp och grafisk profil till UX-design och marknadsföringsmaterial – rätt designbyrå hjälper dig att sticka ut.',
    sections: [
      { heading: 'Tjänster inom grafisk design', content: '- **Logotypdesign** – Ditt varumärkes ansikte\n- **Grafisk profil** – Färger, typografi, designelement\n- **UX/UI-design** – Användarvänliga digitala upplevelser\n- **Tryckt material** – Visitkort, broschyrer, förpackningar\n- **Digital design** – Banners, sociala medier-grafik, presentationer' },
      { heading: 'Vad kostar grafisk design?', content: '- **Logotyp**: 5 000 – 30 000 kr\n- **Komplett grafisk profil**: 15 000 – 60 000 kr\n- **UX/UI-design**: 20 000 – 100 000 kr\n- **Marknadsföringsmaterial**: 2 000 – 10 000 kr per projekt' },
    ],
    faq: [
      { q: 'Vad kostar en logotyp?', a: 'En professionell logotyp kostar vanligtvis 5 000–30 000 kr beroende på komplexitet och byrå.' },
      { q: 'Vad ingår i en grafisk profil?', a: 'Logotyp, färgpalett, typografi, grafiska element, visitkort och mallar för olika användningsområden.' },
    ],
    subPages: [
      { slug: 'ux', title: 'UX-design – Hitta UX-byrå | Updro', h1: 'UX-design', metaDesc: 'Hitta UX-designbyråer i Sverige. Jämför offerter för användarupplevelse och gränssnittsdesign.', intro: 'UX-design handlar om att skapa digitala upplevelser som är intuitiva, effektiva och engagerande.', sections: [{ heading: 'Vad är UX-design?', content: 'UX (User Experience) fokuserar på användarens hela upplevelse med en produkt. Det inkluderar research, prototyper, användartester och iterativ design.' }], faq: [{ q: 'Vad kostar UX-design?', a: '20 000–100 000 kr beroende på projektets omfattning.' }], relatedLinks: [{ label: 'Webbdesign', href: '/webbdesign' }, { label: 'Webbutveckling', href: '/webbutveckling' }] },
      { slug: 'logotyp', title: 'Logotypdesign – Hitta designer | Updro', h1: 'Logotypdesign', metaDesc: 'Hitta logotypdesigners i Sverige. Jämför offerter för professionell logotypdesign.', intro: 'En stark logotyp är grunden för ditt varumärke. Jämför offerter och hitta rätt designer.', sections: [{ heading: 'Så skapar du en bra logotyp', content: 'En bra logotyp är:\n- Enkel och minnesvärd\n- Skalbar (fungerar i alla storlekar)\n- Tidlös\n- Relevant för ditt varumärke' }], faq: [{ q: 'Hur lång tid tar det?', a: 'Vanligtvis 2–4 veckor inklusive revideringsrundor.' }], relatedLinks: [{ label: 'Grafisk profil', href: '/grafisk-design' }, { label: 'Varumärke & PR', href: '/varumarke-pr' }] },
      { slug: 'stockholm', title: 'Grafisk design Stockholm | Updro', h1: 'Grafisk design i Stockholm', metaDesc: 'Hitta designbyråer i Stockholm. Jämför offerter för grafisk design.', intro: 'Stockholm har ett rikt utbud av designbyråer. Jämför offerter och hitta din matchning.', sections: [{ heading: 'Designbyråer i Stockholm', content: 'Stockholms designscen är en av Nordens mest kreativa med allt från boutique-studios till prisbelönta fullservice-byråer.' }], faq: [{ q: 'Vad kostar design i Stockholm?', a: 'Priserna ligger vanligtvis 10–20% över rikssnittet.' }], relatedLinks: [{ label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }] },
      { slug: 'pris', title: 'Grafisk design pris 2026 | Updro', h1: 'Vad kostar grafisk design?', metaDesc: 'Prisguide för grafisk design i Sverige 2026.', intro: 'Priserna för grafisk design varierar. Här ger vi dig en översikt.', sections: [{ heading: 'Prisöversikt', content: '| Tjänst | Pris |\n|---|---|\n| Logotyp | 5 000 – 30 000 kr |\n| Grafisk profil | 15 000 – 60 000 kr |\n| Visitkort | 1 000 – 3 000 kr |\n| Broschyr | 3 000 – 10 000 kr |' }], faq: [{ q: 'Kan jag designa själv?', a: 'Med verktyg som Canva kan du göra enklare material, men professionell design ger ett helt annat resultat.' }], relatedLinks: [{ label: 'Webbutveckling pris', href: '/webbutveckling/pris' }] },
    ],
    relatedCategories: [
      { label: 'UX / Webbdesign', href: '/webbdesign' },
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Varumärke & PR', href: '/varumarke-pr' },
    ]
  },

  // ─── WEBBDESIGN ───
  {
    categorySlug: 'webbdesign',
    categoryName: 'UX / Webbdesign',
    metaTitle: 'Webbdesign – Hitta webbdesigner | Updro',
    metaDesc: 'Jämför offerter från webbdesigners i Sverige. UX/UI-design, responsiv design – hitta rätt byrå.',
    h1: 'Webbdesign – Skapa en webbplats som engagerar',
    intro: 'Bra webbdesign handlar om mer än utseende – det handlar om att skapa en upplevelse som konverterar besökare till kunder. Jämför offerter från webbdesigners via Updro.',
    sections: [
      { heading: 'Vad är webbdesign?', content: 'Webbdesign omfattar visuell design, interaktionsdesign, informationsarkitektur och användbarhet. En bra webbdesigner skapar gränssnitt som är både vackra och funktionella.' },
      { heading: 'Vad kostar webbdesign?', content: '- **Enkel design**: 10 000 – 30 000 kr\n- **Avancerad UX/UI**: 30 000 – 100 000 kr\n- **Komplett redesign**: 20 000 – 80 000 kr' },
    ],
    faq: [
      { q: 'Webbdesign vs webbutveckling?', a: 'Webbdesign fokuserar på det visuella och användarupplevelsen. Webbutveckling handlar om den tekniska implementationen. Ofta samarbetar designers och utvecklare.' },
    ],
    subPages: [
      { slug: 'stockholm', title: 'Webbdesign Stockholm | Updro', h1: 'Webbdesign i Stockholm', metaDesc: 'Hitta webbdesigners i Stockholm.', intro: 'Jämför offerter från Stockholms bästa webbdesigners.', sections: [{ heading: 'Webbdesigners i Stockholm', content: 'Stockholm har ett brett utbud av webbdesigners med olika specialiteter och prisnivåer.' }], faq: [], relatedLinks: [{ label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }] },
      { slug: 'pris', title: 'Webbdesign pris 2026 | Updro', h1: 'Vad kostar webbdesign?', metaDesc: 'Prisguide för webbdesign i Sverige 2026.', intro: 'Priserna varierar beroende på komplexitet och byrå.', sections: [{ heading: 'Prisöversikt', content: 'Enkel webbdesign: 10 000–30 000 kr. Avancerad UX/UI-design: 30 000–100 000 kr.' }], faq: [], relatedLinks: [{ label: 'Webbutveckling pris', href: '/webbutveckling/pris' }] },
      { slug: 'ui-ux', title: 'UI/UX-design | Updro', h1: 'UI/UX-design', metaDesc: 'Hitta UI/UX-designers i Sverige.', intro: 'UI/UX-design skapar digitala produkter som användare älskar.', sections: [{ heading: 'UI vs UX', content: 'UI (User Interface) handlar om det visuella gränssnittet. UX (User Experience) handlar om hela användarupplevelsen. Tillsammans skapar de produkter som är både vackra och funktionella.' }], faq: [], relatedLinks: [{ label: 'Grafisk design', href: '/grafisk-design' }] },
      { slug: 'foretag', title: 'Webbdesign för företag | Updro', h1: 'Webbdesign för företag', metaDesc: 'Professionell webbdesign för företag.', intro: 'En professionell webbdesign stärker ditt varumärke och konverterar besökare.', sections: [{ heading: 'Krav för företagsdesign', content: 'En företagswebbplats bör ha konsekvent branding, tydliga CTA:er, responsiv design och snabb laddtid.' }], faq: [], relatedLinks: [{ label: 'Webbutveckling för företag', href: '/webbutveckling/foretag' }] },
    ],
    relatedCategories: [
      { label: 'Grafisk design', href: '/grafisk-design' },
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'App-utveckling', href: '/app-utveckling' },
    ]
  },

  // ─── APP-UTVECKLING ───
  {
    categorySlug: 'app-utveckling',
    categoryName: 'App-utveckling',
    metaTitle: 'App-utveckling – Hitta apputvecklare | Updro',
    metaDesc: 'Jämför offerter från apputvecklare i Sverige. iOS, Android, cross-platform – hitta rätt byrå.',
    h1: 'App-utveckling – Bygg din mobilapp',
    intro: 'Mobilappar är en viktig del av den digitala strategin för allt fler företag. Oavsett om du bygger en B2C-app eller ett internt verktyg – rätt apputvecklare gör skillnaden.',
    sections: [
      { heading: 'Typer av appar', content: '- **Native** (iOS/Android) – Bäst prestanda, dyrast\n- **Cross-platform** (React Native, Flutter) – En kodbas, båda plattformar\n- **PWA** (Progressive Web App) – Webbteknologi, ingen installation\n- **Hybrid** – Webbvy i app-skal' },
      { heading: 'Vad kostar apputveckling?', content: '- **Enkel app**: 50 000 – 150 000 kr\n- **Medelstor app**: 150 000 – 500 000 kr\n- **Komplex app**: 500 000 – 2 000 000+ kr' },
    ],
    faq: [
      { q: 'Hur lång tid tar det att bygga en app?', a: 'En enkel MVP tar 2–4 månader. En komplex app kan ta 6–12+ månader.' },
      { q: 'Native eller cross-platform?', a: 'Cross-platform (React Native/Flutter) passar de flesta. Native krävs för prestandakritiska appar.' },
    ],
    subPages: [
      { slug: 'ios', title: 'iOS-utveckling | Updro', h1: 'iOS-apputveckling', metaDesc: 'Hitta iOS-utvecklare i Sverige.', intro: 'Bygg en native iOS-app med Swift för bästa upplevelse på iPhone och iPad.', sections: [{ heading: 'iOS-utveckling', content: 'iOS-appar byggs med Swift och Xcode. Apple har stränga kvalitetskrav som säkerställer hög standard.' }], faq: [], relatedLinks: [{ label: 'Android-utveckling', href: '/app-utveckling/android' }] },
      { slug: 'android', title: 'Android-utveckling | Updro', h1: 'Android-apputveckling', metaDesc: 'Hitta Android-utvecklare i Sverige.', intro: 'Android dominerar den globala marknaden. Bygg din Android-app med Kotlin.', sections: [{ heading: 'Android-utveckling', content: 'Android-appar byggs med Kotlin och Android Studio. Google Play Store har lägre inträdesbarriärer än App Store.' }], faq: [], relatedLinks: [{ label: 'iOS-utveckling', href: '/app-utveckling/ios' }] },
      { slug: 'pris', title: 'App-utveckling pris 2026 | Updro', h1: 'Vad kostar apputveckling?', metaDesc: 'Prisguide för apputveckling 2026.', intro: 'Apputveckling varierar kraftigt i pris. Här ger vi dig en realistisk bild.', sections: [{ heading: 'Prisöversikt', content: '| Typ | Pris |\n|---|---|\n| MVP / Enkel app | 50 000 – 150 000 kr |\n| Medelstor | 150 000 – 500 000 kr |\n| Enterprise | 500 000 – 2 000 000+ kr |' }], faq: [], relatedLinks: [{ label: 'Webbutveckling pris', href: '/webbutveckling/pris' }] },
      { slug: 'stockholm', title: 'App-utveckling Stockholm | Updro', h1: 'App-utveckling i Stockholm', metaDesc: 'Hitta apputvecklare i Stockholm.', intro: 'Stockholm är Nordens ledande hub för apputveckling med många duktiga byråer.', sections: [{ heading: 'Apputvecklare i Stockholm', content: 'Från startups till enterprise – Stockholms apputvecklare levererar i världsklass.' }], faq: [], relatedLinks: [{ label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }] },
    ],
    relatedCategories: [
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Mjukvaruutveckling', href: '/mjukvaruutveckling' },
      { label: 'AI-utveckling', href: '/ai-utveckling' },
    ]
  },

  // ─── MJUKVARUUTVECKLING ───
  {
    categorySlug: 'mjukvaruutveckling',
    categoryName: 'Mjukvaruutveckling',
    metaTitle: 'Mjukvaruutveckling – Hitta utvecklare | Updro',
    metaDesc: 'Jämför offerter från mjukvaruutvecklare. SaaS, enterprise, systemutveckling – hitta rätt partner.',
    h1: 'Mjukvaruutveckling – Skräddarsydda lösningar',
    intro: 'Behöver ditt företag en skräddarsydd mjukvara? Från SaaS-plattformar till interna system – rätt utvecklingspartner hjälper dig att bygga digitala produkter som ger konkurrensfördelar.',
    sections: [
      { heading: 'Typer av mjukvaruutveckling', content: '- **SaaS-utveckling** – Molnbaserade tjänster\n- **Enterprise-system** – Interna affärssystem\n- **API-utveckling** – Integrationer och datautbyte\n- **Legacy-modernisering** – Uppgradera äldre system' },
      { heading: 'Vad kostar mjukvaruutveckling?', content: '- **Enklare system**: 100 000 – 300 000 kr\n- **SaaS MVP**: 200 000 – 800 000 kr\n- **Enterprise**: 500 000 – 5 000 000+ kr' },
    ],
    faq: [
      { q: 'Build vs buy?', a: 'Bygg skräddarsytt om du har unika krav. Köp färdigt om standardlösningar uppfyller dina behov.' },
    ],
    subPages: [
      { slug: 'foretag', title: 'Mjukvaruutveckling för företag | Updro', h1: 'Mjukvaruutveckling för företag', metaDesc: 'Skräddarsydd mjukvara för företag.', intro: 'Företagsanpassad mjukvara som löser era unika utmaningar.', sections: [{ heading: 'Företagslösningar', content: 'CRM, ERP, projekthantering, workflow-automation – bygg det ni behöver.' }], faq: [], relatedLinks: [{ label: 'IT-konsult', href: '/it-konsult' }] },
      { slug: 'saas', title: 'SaaS-utveckling | Updro', h1: 'SaaS-utveckling', metaDesc: 'Bygg din SaaS-plattform med rätt partner.', intro: 'SaaS-utveckling kräver expertis inom skalbarhet, säkerhet och användarupplevelse.', sections: [{ heading: 'Bygga SaaS', content: 'En framgångsrik SaaS kräver MVP-approach, iterativ utveckling och noggrann validering.' }], faq: [], relatedLinks: [{ label: 'App-utveckling', href: '/app-utveckling' }] },
      { slug: 'pris', title: 'Mjukvaruutveckling pris 2026 | Updro', h1: 'Vad kostar mjukvaruutveckling?', metaDesc: 'Prisguide för mjukvaruutveckling.', intro: 'Mjukvaruutveckling är en större investering. Här är priserna.', sections: [{ heading: 'Prisöversikt', content: 'Enklare system: 100 000–300 000 kr. SaaS MVP: 200 000–800 000 kr. Enterprise: 500 000–5 000 000+ kr.' }], faq: [], relatedLinks: [{ label: 'App-utveckling pris', href: '/app-utveckling/pris' }] },
    ],
    relatedCategories: [
      { label: 'App-utveckling', href: '/app-utveckling' },
      { label: 'AI-utveckling', href: '/ai-utveckling' },
      { label: 'IT-konsult', href: '/it-konsult' },
    ]
  },

  // ─── AI-UTVECKLING ───
  {
    categorySlug: 'ai-utveckling',
    categoryName: 'AI-utveckling',
    metaTitle: 'AI-utveckling – Hitta AI-byrå | Updro',
    metaDesc: 'Jämför offerter för AI-utveckling. Chatbots, automation, maskininlärning – hitta rätt AI-partner.',
    h1: 'AI-utveckling – Automatisera och effektivisera',
    intro: 'Artificiell intelligens förändrar hur företag arbetar. Från chatbots och automation till prediktiv analys – AI kan ge ditt företag en enorm konkurrensfördel.',
    sections: [
      { heading: 'AI-tjänster', content: '- **Chatbots & konversations-AI** – Automatiserad kundtjänst\n- **Processautomation** – RPA och intelligent automation\n- **Maskininlärning** – Prediktiva modeller och dataanalys\n- **NLP** – Textanalys och språkförståelse\n- **Computer Vision** – Bildanalys och OCR' },
      { heading: 'Vad kostar AI-utveckling?', content: '- **Enkel chatbot**: 20 000 – 80 000 kr\n- **AI-integration**: 50 000 – 200 000 kr\n- **Custom ML-modell**: 100 000 – 500 000+ kr' },
    ],
    faq: [
      { q: 'Behöver mitt företag AI?', a: 'Om du har repetitiva processer, stora datamängder eller behöver snabbare kundrespons – ja, AI kan hjälpa.' },
    ],
    subPages: [
      { slug: 'chatbots', title: 'AI-chatbots | Updro', h1: 'AI-chatbots', metaDesc: 'Bygg en AI-chatbot för kundtjänst.', intro: 'AI-chatbots hanterar kundförfrågningar dygnet runt med hög precision.', sections: [{ heading: 'Chatbots för företag', content: 'Moderna AI-chatbots kan hantera upp till 80% av kundförfrågningar automatiskt.' }], faq: [], relatedLinks: [{ label: 'AI automation', href: '/ai-utveckling/automation' }] },
      { slug: 'automation', title: 'AI-automation | Updro', h1: 'AI-automation', metaDesc: 'Automatisera processer med AI.', intro: 'AI-automation frigör tid och minskar fel genom att automatisera repetitiva uppgifter.', sections: [{ heading: 'Automatisering med AI', content: 'Från fakturering till kundhantering – AI kan automatisera processer som idag tar hundratals timmar.' }], faq: [], relatedLinks: [{ label: 'AI-chatbots', href: '/ai-utveckling/chatbots' }] },
      { slug: 'foretag', title: 'AI för företag | Updro', h1: 'AI-lösningar för företag', metaDesc: 'AI-lösningar anpassade för företag.', intro: 'Implementera AI i ditt företag för att öka effektivitet och konkurrenskraft.', sections: [{ heading: 'AI i praktiken', content: 'AI är inte bara för techbolag. Tillverkningsföretag, fastighetsbolag, e-handel och tjänsteföretag – alla kan dra nytta av AI.' }], faq: [], relatedLinks: [{ label: 'Mjukvaruutveckling', href: '/mjukvaruutveckling' }] },
    ],
    relatedCategories: [
      { label: 'Mjukvaruutveckling', href: '/mjukvaruutveckling' },
      { label: 'App-utveckling', href: '/app-utveckling' },
      { label: 'IT-konsult', href: '/it-konsult' },
    ]
  },

  // ─── IT-KONSULT ───
  {
    categorySlug: 'it-konsult',
    categoryName: 'IT-konsult',
    metaTitle: 'IT-konsult – Hitta konsultbolag | Updro',
    metaDesc: 'Jämför offerter från IT-konsulter i Sverige. Systemarkitektur, molnmigrering, säkerhet.',
    h1: 'IT-konsult – Expert hjälp för dina IT-behov',
    intro: 'Ibland behöver man experthjälp. En IT-konsult ger dig tillgång till specialiserad kompetens utan att anställa – från molnmigrering till säkerhetsgranskningar.',
    sections: [
      { heading: 'IT-konsulttjänster', content: '- Systemarkitektur\n- Molnmigrering (AWS, Azure, GCP)\n- IT-säkerhet\n- Integration och API-design\n- Teknisk projektledning\n- DevOps och infrastruktur' },
      { heading: 'Vad kostar en IT-konsult?', content: '- **Junior**: 600 – 900 kr/timme\n- **Medior**: 900 – 1 300 kr/timme\n- **Senior**: 1 200 – 1 800 kr/timme\n- **Specialist**: 1 500 – 2 500+ kr/timme' },
    ],
    faq: [
      { q: 'När behöver jag en IT-konsult?', a: 'När du saknar intern kompetens, behöver en oberoende granskning eller har ett tidsbegränsat projekt.' },
    ],
    subPages: [
      { slug: 'stockholm', title: 'IT-konsult Stockholm | Updro', h1: 'IT-konsulter i Stockholm', metaDesc: 'Hitta IT-konsulter i Stockholm.', intro: 'Stockholm har Sveriges största utbud av IT-konsulter.', sections: [{ heading: 'IT-konsulter i Stockholm', content: 'Allt från frilansare till stora konsultbolag som Accenture, Sigma och Knowit.' }], faq: [], relatedLinks: [{ label: 'Webbutveckling Stockholm', href: '/webbutveckling/stockholm' }] },
      { slug: 'pris', title: 'IT-konsult pris 2026 | Updro', h1: 'Vad kostar en IT-konsult?', metaDesc: 'Prisguide för IT-konsulter 2026.', intro: 'IT-konsultpriser varierar beroende på erfarenhet och specialisering.', sections: [{ heading: 'Timpriser', content: 'Junior: 600–900 kr/h. Medior: 900–1 300 kr/h. Senior: 1 200–1 800 kr/h.' }], faq: [], relatedLinks: [{ label: 'IT-support pris', href: '/it-support' }] },
      { slug: 'foretag', title: 'IT-konsult för företag | Updro', h1: 'IT-konsulting för företag', metaDesc: 'IT-konsulttjänster för företag.', intro: 'Få experthjälp med era IT-utmaningar.', sections: [{ heading: 'Företagskonsulting', content: 'Strategisk IT-rådgivning, systemimplementation och digital transformation.' }], faq: [], relatedLinks: [{ label: 'Mjukvaruutveckling', href: '/mjukvaruutveckling' }] },
    ],
    relatedCategories: [
      { label: 'Mjukvaruutveckling', href: '/mjukvaruutveckling' },
      { label: 'IT-support', href: '/it-support' },
      { label: 'AI-utveckling', href: '/ai-utveckling' },
    ]
  },

  // ─── IT-SUPPORT ───
  {
    categorySlug: 'it-support',
    categoryName: 'IT-support / Underhåll',
    metaTitle: 'IT-support – Hitta supportpartner | Updro',
    metaDesc: 'Jämför offerter för IT-support och underhåll. Drift, säkerhet, helpdesk – hitta rätt partner.',
    h1: 'IT-support & underhåll – Trygg drift av dina system',
    intro: 'Pålitlig IT-support är avgörande för att hålla verksamheten igång. Jämför offerter från IT-supportföretag via Updro.',
    sections: [
      { heading: 'IT-supporttjänster', content: '- Helpdesk och användarsupport\n- Serverunderhåll och drift\n- Säkerhetsövervakning\n- Backup och disaster recovery\n- Nätverkshantering\n- Mjukvaruuppdateringar' },
      { heading: 'Vad kostar IT-support?', content: '- **Per användare**: 200 – 800 kr/månad\n- **Paketpris (1–10 användare)**: 3 000 – 8 000 kr/månad\n- **Enterprise**: Skräddarsytt pris' },
    ],
    faq: [
      { q: 'Inhouse vs outsourced IT-support?', a: 'Outsourcing ger tillgång till bredare kompetens till lägre kostnad. Inhouse ger snabbare respons och djupare systemkunskap.' },
    ],
    subPages: [
      { slug: 'foretag', title: 'IT-support för företag | Updro', h1: 'IT-support för företag', metaDesc: 'IT-support anpassad för företag.', intro: 'Professionell IT-support som håller ert företag igång.', sections: [{ heading: 'Företags-IT', content: 'Komplett IT-hantering anpassad efter er storlek och behov.' }], faq: [], relatedLinks: [{ label: 'IT-konsult', href: '/it-konsult' }] },
      { slug: 'stockholm', title: 'IT-support Stockholm | Updro', h1: 'IT-support i Stockholm', metaDesc: 'Hitta IT-support i Stockholm.', intro: 'Stockholms IT-supportföretag erbjuder allt från fjärrsupport till on-site-besök.', sections: [{ heading: 'IT-support Stockholm', content: 'Jämför offerter från Stockholms bästa IT-supportföretag.' }], faq: [], relatedLinks: [{ label: 'IT-konsult Stockholm', href: '/it-konsult/stockholm' }] },
      { slug: '24-7', title: 'IT-support dygnet runt | Updro', h1: 'IT-support 24/7', metaDesc: 'IT-support dygnet runt för företag.', intro: 'Behöver du IT-support dygnet runt? Hitta leverantörer med 24/7-beredskap.', sections: [{ heading: '24/7-support', content: 'Kritiska system kräver support dygnet runt. Jämför leverantörer som erbjuder jourberedskap och snabba SLA:er.' }], faq: [], relatedLinks: [{ label: 'IT-support för företag', href: '/it-support/foretag' }] },
    ],
    relatedCategories: [
      { label: 'IT-konsult', href: '/it-konsult' },
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Mjukvaruutveckling', href: '/mjukvaruutveckling' },
    ]
  },

  // ─── SOCIALA MEDIER ───
  {
    categorySlug: 'sociala-medier',
    categoryName: 'Sociala medier',
    metaTitle: 'Sociala medier – Hitta byrå | Updro',
    metaDesc: 'Jämför offerter för hantering av sociala medier. Annonsering, strategi, innehåll – hitta rätt byrå.',
    h1: 'Sociala medier – Öka din närvaro online',
    intro: 'Sociala medier är en av de viktigaste kanalerna för att bygga varumärke, engagera kunder och driva försäljning. Jämför offerter från specialiserade sociala medier-byråer.',
    sections: [
      { heading: 'Tjänster', content: '- Strategi och kanalval\n- Innehållsproduktion\n- Community management\n- Social media-annonsering\n- Influencer marketing\n- Analys och rapportering' },
      { heading: 'Vad kostar det?', content: '- **Grundpaket**: 5 000 – 15 000 kr/månad\n- **Standardpaket**: 10 000 – 25 000 kr/månad\n- **Premiumpaket**: 20 000 – 50 000+ kr/månad\n- **Annonsering**: Minst 3 000–10 000 kr/månad i budget' },
    ],
    faq: [
      { q: 'Vilka kanaler ska jag vara på?', a: 'Det beror på din målgrupp. B2B: LinkedIn. B2C: Instagram, Facebook, TikTok. Unga målgrupper: TikTok, Snapchat.' },
    ],
    subPages: [
      { slug: 'annonsering', title: 'Social media-annonsering | Updro', h1: 'Social media-annonsering', metaDesc: 'Annonsering på sociala medier.', intro: 'Nå din målgrupp exakt med annonsering på Facebook, Instagram och LinkedIn.', sections: [{ heading: 'Annonsformat', content: 'Feed-annonser, stories, reels, carousel, lead ads – varje format har sina styrkor.' }], faq: [], relatedLinks: [{ label: 'Digital marknadsföring', href: '/digital-marknadsforing' }] },
      { slug: 'strategi', title: 'Social media-strategi | Updro', h1: 'Social media-strategi', metaDesc: 'Bygg en social media-strategi.', intro: 'En tydlig strategi gör skillnaden mellan att bara publicera och att faktiskt nå resultat.', sections: [{ heading: 'Strategiramverk', content: '1. Definiera mål\n2. Identifiera målgrupp\n3. Välj kanaler\n4. Skapa innehållsplan\n5. Mät och optimera' }], faq: [], relatedLinks: [{ label: 'Digital marknadsföring strategi', href: '/digital-marknadsforing/strategi' }] },
      { slug: 'byra', title: 'Sociala medier-byrå | Updro', h1: 'Hitta en sociala medier-byrå', metaDesc: 'Jämför sociala medier-byråer.', intro: 'En dedikerad byrå tar hand om allt – från strategi till publicering och analys.', sections: [{ heading: 'Vad gör en SoMe-byrå?', content: 'Strategi, innehållsproduktion, schemaläggning, community management, annonsering och rapportering.' }], faq: [], relatedLinks: [{ label: 'Digital marknadsföring byrå', href: '/digital-marknadsforing/byra' }] },
    ],
    relatedCategories: [
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'Grafisk design', href: '/grafisk-design' },
      { label: 'Video & Foto', href: '/video-foto' },
    ]
  },

  // ─── VIDEO & FOTO ───
  {
    categorySlug: 'video-foto',
    categoryName: 'Video & Foto',
    metaTitle: 'Video & Foto – Hitta produktionsbolag | Updro',
    metaDesc: 'Jämför offerter för videoproduktion och företagsfotografering. Reklamfilm, profilbilder, produktfoto.',
    h1: 'Video & Foto – Professionellt visuellt innehåll',
    intro: 'Visuellt innehåll engagerar mer än text. Professionell video och foto stärker ditt varumärke och ökar konverteringen.',
    sections: [
      { heading: 'Tjänster', content: '- Företagsvideo och reklamfilm\n- Produktfotografering\n- Profilbilder och teamfoton\n- Social media-content\n- Animerad video och motion graphics\n- Drönarfoto och -video' },
      { heading: 'Vad kostar det?', content: '- **Profilbilder**: 3 000 – 8 000 kr\n- **Produktfoto (per dag)**: 5 000 – 15 000 kr\n- **Företagsvideo (1–2 min)**: 15 000 – 60 000 kr\n- **Reklamfilm**: 30 000 – 200 000+ kr' },
    ],
    faq: [
      { q: 'Video eller foto – vad ger bäst resultat?', a: 'Video engagerar mer men kostar mer. En mix av både foto och video ger bäst resultat.' },
    ],
    subPages: [
      { slug: 'videoproduktion', title: 'Videoproduktion | Updro', h1: 'Videoproduktion', metaDesc: 'Hitta videoproduktionsbolag.', intro: 'Professionell videoproduktion för företag – från koncept till färdig film.', sections: [{ heading: 'Produktionsprocess', content: 'Förproduktion (manus, planering) → Inspelning → Efterproduktion (redigering, färgkorrigering, ljud)' }], faq: [], relatedLinks: [{ label: 'Reklamfilm', href: '/video-foto/reklamfilm' }] },
      { slug: 'reklamfilm', title: 'Reklamfilm | Updro', h1: 'Reklamfilm', metaDesc: 'Hitta reklamfilmsproducenter.', intro: 'En professionell reklamfilm kan transformera ditt varumärke.', sections: [{ heading: 'Reklamfilm för företag', content: 'Från 30-sekunders social media-spots till fullskaleproduktioner.' }], faq: [], relatedLinks: [{ label: 'Videoproduktion', href: '/video-foto/videoproduktion' }] },
    ],
    relatedCategories: [
      { label: 'Sociala medier', href: '/sociala-medier' },
      { label: 'Grafisk design', href: '/grafisk-design' },
      { label: 'Varumärke & PR', href: '/varumarke-pr' },
    ]
  },

  // ─── VARUMÄRKE & PR ───
  {
    categorySlug: 'varumarke-pr',
    categoryName: 'Varumärke & PR',
    metaTitle: 'Varumärke & PR – Hitta PR-byrå | Updro',
    metaDesc: 'Jämför offerter för varumärkesstrategi och PR. Bygga varumärke, pressmaterial, kommunikation.',
    h1: 'Varumärke & PR – Bygg ett starkt varumärke',
    intro: 'Ett starkt varumärke skiljer dig från konkurrenterna. Med rätt varumärkesstrategi och PR bygger du trovärdighet, igenkänning och kundlojalitet.',
    sections: [
      { heading: 'Tjänster', content: '- Varumärkesstrategi\n- PR och medierelationer\n- Pressmeddelanden\n- Krishantering\n- Employer branding\n- Content och storytelling' },
      { heading: 'Vad kostar det?', content: '- **Varumärkesstrategi**: 30 000 – 150 000 kr\n- **PR-retainer**: 15 000 – 50 000 kr/månad\n- **Pressmeddelande**: 3 000 – 10 000 kr/st' },
    ],
    faq: [
      { q: 'Varför är varumärke viktigt?', a: 'Starka varumärken kan ta ut högre priser, har lojala kunder och attraherar talang.' },
    ],
    subPages: [
      { slug: 'pr-byra', title: 'PR-byrå | Updro', h1: 'Hitta PR-byrå', metaDesc: 'Jämför PR-byråer i Sverige.', intro: 'En PR-byrå hjälper dig att nå ut i media och bygga förtroende.', sections: [{ heading: 'Vad gör en PR-byrå?', content: 'Medierelationer, pressmeddelanden, eventplanering, krishantering och opinionsbildning.' }], faq: [], relatedLinks: [{ label: 'Varumärkesstrategi', href: '/varumarke-pr/varumarkesstrategi' }] },
      { slug: 'varumarkesstrategi', title: 'Varumärkesstrategi | Updro', h1: 'Varumärkesstrategi', metaDesc: 'Bygg en stark varumärkesstrategi.', intro: 'En varumärkesstrategi definierar vem du är, vad du står för och hur du kommunicerar.', sections: [{ heading: 'Strategiprocessen', content: '1. Varumärkesanalys\n2. Positionering\n3. Målgrupp och personas\n4. Visuell identitet\n5. Tonalitet och budskap\n6. Implementering' }], faq: [], relatedLinks: [{ label: 'Grafisk design', href: '/grafisk-design' }] },
      { slug: 'pressmeddelanden', title: 'Pressmeddelanden | Updro', h1: 'Pressmeddelanden', metaDesc: 'Professionella pressmeddelanden.', intro: 'Ett välskrivet pressmeddelande kan ge enormt genomslag i media.', sections: [{ heading: 'Effektiva pressmeddelanden', content: 'Nyhetsvärde, tydlig vinkel, citat och kontaktuppgifter – grunderna för ett bra pressmeddelande.' }], faq: [], relatedLinks: [{ label: 'PR-byrå', href: '/varumarke-pr/pr-byra' }] },
    ],
    relatedCategories: [
      { label: 'Grafisk design', href: '/grafisk-design' },
      { label: 'Sociala medier', href: '/sociala-medier' },
      { label: 'Video & Foto', href: '/video-foto' },
    ]
  },

  // ─── AFFÄRSUTVECKLING ───
  {
    categorySlug: 'affarsutveckling',
    categoryName: 'Affärsutveckling',
    metaTitle: 'Affärsutveckling – Hitta konsult | Updro',
    metaDesc: 'Jämför offerter för affärsutveckling. Strategi, digitalisering, tillväxt – hitta rätt rådgivare.',
    h1: 'Affärsutveckling – Accelerera din tillväxt',
    intro: 'Affärsutveckling handlar om att identifiera och realisera tillväxtmöjligheter. Från strategisk rådgivning till digital transformation – rätt partner hjälper dig att ta nästa steg.',
    sections: [
      { heading: 'Tjänster', content: '- Affärsstrategi\n- Digital transformation\n- Go-to-market-strategi\n- Tillväxtrådgivning\n- Processoptimering\n- Affärsmodellering' },
      { heading: 'Vad kostar det?', content: '- **Strategiworkshop**: 15 000 – 50 000 kr\n- **Löpande rådgivning**: 10 000 – 40 000 kr/månad\n- **Transformationsprojekt**: 50 000 – 500 000+ kr' },
    ],
    faq: [
      { q: 'När behöver jag affärsutveckling?', a: 'När du vill växa, digitalisera, lansera nya tjänster eller behöver en extern perspektiv på din verksamhet.' },
    ],
    subPages: [
      { slug: 'startups', title: 'Affärsutveckling för startups | Updro', h1: 'Affärsutveckling för startups', metaDesc: 'Rådgivning för startups och scaleups.', intro: 'Rätt rådgivning i ett tidigt skede kan göra hela skillnaden.', sections: [{ heading: 'Startup-rådgivning', content: 'Affärsmodell, pitch, finansiering, go-to-market och skalning.' }], faq: [], relatedLinks: [{ label: 'Affärsstrategi', href: '/affarsutveckling/affarsstrategi' }] },
      { slug: 'digitalisering', title: 'Digitalisering | Updro', h1: 'Digitalisering', metaDesc: 'Digitalisera ditt företag.', intro: 'Digitalisering handlar om att använda teknik för att förbättra affärsprocesser och kundupplevelser.', sections: [{ heading: 'Digital transformation', content: 'Automation, moln, data-driven beslutsfattande och digital kundupplevelse.' }], faq: [], relatedLinks: [{ label: 'IT-konsult', href: '/it-konsult' }] },
      { slug: 'affarsstrategi', title: 'Affärsstrategi | Updro', h1: 'Affärsstrategi', metaDesc: 'Bygg en vinnande affärsstrategi.', intro: 'En tydlig affärsstrategi sätter riktningen för din tillväxt.', sections: [{ heading: 'Strategiprocess', content: 'Nulägesanalys → Vision och mål → Strategival → Handlingsplan → Implementering → Uppföljning' }], faq: [], relatedLinks: [{ label: 'Affärsutveckling för startups', href: '/affarsutveckling/startups' }] },
    ],
    relatedCategories: [
      { label: 'IT-konsult', href: '/it-konsult' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'AI-utveckling', href: '/ai-utveckling' },
    ]
  },
  // ─── GOOGLE ADS ───
  {
    categorySlug: 'google-ads',
    categoryName: 'Google Ads',
    metaTitle: 'Google Ads-byrå – Hitta rätt byrå för Google Ads | Updro',
    metaDesc: 'Jämför offerter från certifierade Google Ads-byråer i Sverige. Sök-, display- och Shopping-annonser – hitta rätt partner gratis.',
    h1: 'Google Ads – Hitta rätt byrå för din annonsering',
    intro: 'Google Ads är den snabbaste vägen till synlighet i Googles sökresultat. Men utan rätt byrå kan annonsbudgeten försvinna snabbt. På Updro jämför du kostnadsfritt offerter från certifierade Google Ads-byråer och hittar den partner som maximerar din avkastning.',
    sections: [
      {
        heading: 'Vad är Google Ads?',
        content: 'Google Ads (tidigare AdWords) är Googles annonsplattform där företag betalar per klick (PPC) för att synas i sökresultat, på YouTube och på miljontals webbplatser i Googles displaynätverk.\n\nDe vanligaste kampanjtyperna:\n- **Sökkampanjer** – Textannonser i sökresultaten\n- **Display-kampanjer** – Bannerannonser på webbplatser\n- **Shopping-kampanjer** – Produktannonser med bild och pris\n- **Video-kampanjer** – Annonser på YouTube\n- **Performance Max** – AI-driven kampanjtyp som använder alla kanaler'
      },
      {
        heading: 'Vad kostar Google Ads?',
        content: 'Google Ads-kostnader delas i två delar:\n\n**Byråavgift:**\n| Nivå | Pris/månad |\n|---|---|\n| Basic | 3 000 – 8 000 kr |\n| Standard | 8 000 – 20 000 kr |\n| Premium | 15 000 – 40 000 kr |\n| Enterprise | 30 000+ kr |\n\n**Annonsbudget:**\nRekommenderad minsta annonsbudget är 5 000–10 000 kr/månad. De flesta företag spenderar 10 000–50 000 kr/månad.\n\nKostnaden per klick (CPC) varierar från 2–5 kr (låg konkurrens) till 30–100+ kr (hög konkurrens som jurist, försäkring).'
      },
      {
        heading: 'Varför anlita en Google Ads-byrå?',
        content: 'En certifierad byrå kan:\n- Sänka din kostnad per konvertering med 30–50%\n- Identifiera och exkludera irrelevanta sökord\n- Optimera budstrategier med AI och maskininlärning\n- Bygga konverteringsspårning och attribution\n- A/B-testa annonser för bästa CTR\n- Leverera transparent rapportering\n\nSkillnaden mellan en bra och dålig Google Ads-hantering kan vara hundratusentals kronor per år.'
      },
      {
        heading: 'Så väljer du rätt Google Ads-byrå',
        content: '1. **Kontrollera certifieringar** – Google Partner eller Premier Partner\n2. **Be om resultat** – ROAS, CPA, konverteringsdata\n3. **Fråga om transparens** – Har du full tillgång till kontot?\n4. **Undvik långa bindningstider** – Max 3 månader initialt\n5. **Jämför offerter** – Använd Updro för att jämföra 3–5 byråer\n6. **Kontrollera avtalet** – Vem äger kontot? Vad händer vid uppsägning?'
      },
    ],
    faq: [
      { q: 'Hur snabbt ger Google Ads resultat?', a: 'Till skillnad från SEO kan Google Ads ge klick och konverteringar redan första dagen. Men det tar 2–4 veckor att optimera kampanjerna för bästa resultat.' },
      { q: 'Google Ads eller SEO – vad ska jag välja?', a: 'Båda! Google Ads ger omedelbar trafik medan SEO bygger långsiktig synlighet. Bäst resultat med en kombination.' },
      { q: 'Kan jag hantera Google Ads själv?', a: 'Grundläggande kampanjer ja, men en byrå optimerar typiskt 30–50% bättre. Det handlar om kompetens inom budstrategier, negativa sökord och konverteringsspårning.' },
      { q: 'Vad är en bra ROAS?', a: 'Return On Ad Spend varierar per bransch. Generellt är 3–5x bra (3–5 kr tillbaka per spenderad krona). E-handel siktar ofta på 4–8x.' },
      { q: 'Behöver byrån vara Google Partner?', a: 'Det är ett bra tecken på kompetens och erfarenhet, men inte ett absolut krav. Kontrollera resultat och kundrecensioner.' },
    ],
    subPages: [
      {
        slug: 'pris',
        title: 'Google Ads pris 2026 – Vad kostar det? | Updro',
        h1: 'Google Ads pris 2026 – Komplett prisguide',
        metaDesc: 'Vad kostar Google Ads 2026? Byråavgifter, klickpriser och annonsbudget. Komplett prisguide med aktuella siffror.',
        intro: 'Google Ads-priser beror på bransch, konkurrens och geografi. Här ger vi dig en komplett prisöversikt för 2026.',
        sections: [
          { heading: 'Klickpriser per bransch', content: '| Bransch | Genomsnittligt CPC |\n|---|---|\n| E-handel | 3 – 15 kr |\n| Konsulttjänster | 10 – 40 kr |\n| Fastigheter | 15 – 50 kr |\n| Juridik | 30 – 100+ kr |\n| Försäkring | 40 – 120+ kr |\n| SaaS / Tech | 8 – 35 kr |\n\nKlickpriset påverkas av konkurrens, kvalitetspoäng och geografisk inriktning.' },
          { heading: 'Rekommenderade budgetar', content: '- **Startup/Litet företag**: 5 000 – 15 000 kr/mån\n- **Medelstort företag**: 15 000 – 50 000 kr/mån\n- **Stort företag**: 50 000 – 200 000+ kr/mån\n\nTill detta tillkommer byråavgift på 3 000 – 30 000 kr/mån beroende på servicenivå.' },
        ],
        faq: [
          { q: 'Hur mycket ska jag lägga på Google Ads?', a: 'Minst 5 000 kr/mån i annonsbudget + byråavgift. De flesta företag ser bäst resultat med 15 000+ kr/mån totalt.' },
        ],
        relatedLinks: [
          { label: 'Google Ads', href: '/google-ads' },
          { label: 'Bästa Google Ads-byrån', href: '/basta-google-ads-byran' },
          { label: 'SEO pris', href: '/seo/pris' },
        ],
      },
      {
        slug: 'stockholm',
        title: 'Google Ads-byrå Stockholm | Updro',
        h1: 'Google Ads-byrå i Stockholm',
        metaDesc: 'Hitta certifierade Google Ads-byråer i Stockholm. Jämför offerter och maximera din annonsavkastning.',
        intro: 'Stockholm har det bredaste utbudet av Google Ads-byråer i Sverige – från nischade PPC-specialister till fullservice-byråer.',
        sections: [
          { heading: 'Google Ads i Stockholm', content: 'Stockholm har flest Google Partner-certifierade byråer i Sverige. Priserna ligger generellt 10–15% högre än rikssnittet, men kompetensen och erfarenheten matchar.' },
        ],
        faq: [],
        relatedLinks: [
          { label: 'SEO Stockholm', href: '/seo/stockholm' },
          { label: 'Digital marknadsföring Stockholm', href: '/digital-marknadsforing/stockholm' },
        ],
      },
      {
        slug: 'goteborg',
        title: 'Google Ads-byrå Göteborg | Updro',
        h1: 'Google Ads-byrå i Göteborg',
        metaDesc: 'Hitta Google Ads-byråer i Göteborg. Jämför offerter kostnadsfritt.',
        intro: 'Göteborg har en stark PPC-marknad med byråer som levererar hög avkastning till konkurrenskraftiga priser.',
        sections: [
          { heading: 'Google Ads i Göteborg', content: 'Göteborgs Google Ads-byråer erbjuder ofta 10–20% lägre priser än Stockholm med stark lokal marknadskännedom.' },
        ],
        faq: [],
        relatedLinks: [
          { label: 'Google Ads Stockholm', href: '/google-ads/stockholm' },
          { label: 'SEO Göteborg', href: '/seo/goteborg' },
        ],
      },
    ],
    relatedCategories: [
      { label: 'SEO', href: '/seo' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'Sociala medier', href: '/sociala-medier' },
      { label: 'E-handel', href: '/ehandel' },
    ],
  },
]

// Merge expanded sub-pages
import { EXTRA_SUB_PAGES } from './seoDataExpanded'
for (const page of SEO_PAGES) {
  const extra = EXTRA_SUB_PAGES[page.categorySlug]
  if (extra) {
    // Only add pages that don't already exist
    for (const sub of extra) {
      if (!page.subPages.find(s => s.slug === sub.slug)) {
        page.subPages.push(sub)
      }
    }
  }
}

// Helper: Find pillar page by slug
export const findPillarPage = (slug: string) => SEO_PAGES.find(p => p.categorySlug === slug)

// Helper: Find sub page
export const findSubPage = (categorySlug: string, subSlug: string) => {
  const pillar = findPillarPage(categorySlug)
  return pillar?.subPages.find(s => s.slug === subSlug)
}

// Get all category links for nav
export const getCategoryNavLinks = () => SEO_PAGES.map(p => ({
  label: p.categoryName,
  href: `/${p.categorySlug}`,
}))
