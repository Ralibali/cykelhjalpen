export type ArticleType = 'guide' | 'news' | 'comparison' | 'case-study'

export interface ArticlePage {
  slug: string
  metaTitle: string
  metaDesc: string
  h1: string
  category: string
  publishedDate: string
  /** ISO date – defaults to publishedDate when missing */
  updatedDate?: string
  /** Editorial type – default 'guide' for evergreen content */
  type?: ArticleType
  /** Estimated reading time in minutes (auto-derived if missing) */
  readTimeMinutes?: number
  intro: string
  sections: { heading: string; content: string }[]
  faq: { q: string; a: string }[]
  relatedLinks: { label: string; href: string }[]
}

/** Friendly Swedish label for an article type */
export const ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  guide: 'Guide',
  news: 'Nyhet',
  comparison: 'Jämförelse',
  'case-study': 'Case',
}

export const ARTICLES: ArticlePage[] = [
  {
    slug: 'vad-kostar-en-hemsida-2026',
    metaTitle: 'Vad kostar en hemsida 2026? Komplett prisguide | Updro',
    metaDesc: 'Vad kostar det att bygga en hemsida 2026? Prisguide med aktuella priser, tips och jämförelser. Se vad du kan förvänta dig.',
    h1: 'Vad kostar en hemsida 2026? Komplett prisguide',
    category: 'Webbutveckling',
    publishedDate: '2026-01-15',
    intro: 'En av de vanligaste frågorna vi får är "Vad kostar det att bygga en hemsida?". Svaret beror på vad du behöver, men i den här guiden ger vi dig en komplett prisöversikt för 2026 baserad på faktiska offerter vi sett via Updro.',
    sections: [
      { heading: 'Prisöversikt 2026', content: 'Baserat på tusentals offerter via Updro kan vi presentera aktuella marknadspriser:\n\n| Typ av hemsida | Prisintervall 2026 |\n|---|---|\n| Enkel landningssida | 5 000 – 15 000 kr |\n| Företagshemsida (5–10 sidor) | 15 000 – 50 000 kr |\n| Hemsida med CMS (WordPress) | 20 000 – 80 000 kr |\n| E-handelsplattform | 30 000 – 200 000 kr |\n| Avancerad webbapplikation | 80 000 – 500 000+ kr |\n| Redesign | 10 000 – 80 000 kr |\n\nDessa priser inkluderar design, utveckling och grundläggande SEO-setup.' },
      { heading: 'Faktorer som påverkar priset', content: '**Design** – Unik design kostar 15 000–30 000 kr extra jämfört med mallbaserad.\n\n**Funktionalitet** – Varje extra funktion (bokningssystem, betalning, login) ökar priset.\n\n**CMS-val** – WordPress är billigast, Webflow i mellansegmentet, custom-byggt dyrt.\n\n**Antal sidor** – Fler sidor = mer arbete.\n\n**Integrationer** – CRM, betallösningar, ERP-kopplingar.\n\n**Innehåll** – Professionell copywriting kostar 500–2 000 kr per sida.\n\n**Byråns storlek** – Freelancers tar 500–1 000 kr/h, stora byråer 1 200–2 000 kr/h.' },
      { heading: 'Löpande kostnader', content: '- **Hosting**: 200–2 000 kr/månad\n- **Domän**: 100–200 kr/år\n- **SSL-certifikat**: Gratis (Let\'s Encrypt) – 2 000 kr/år\n- **Underhåll**: 500–3 000 kr/månad\n- **Content updates**: 1 000–5 000 kr/månad\n\nRäkna med 1 000–5 000 kr/månad i löpande kostnader.' },
      { heading: 'Så sparar du pengar', content: '1. **Jämför offerter** – Använd Updro för att jämföra minst 3 offerter\n2. **Börja med MVP** – Bygg grunderna först, utöka sedan\n3. **Förbered innehåll** – Ha texter och bilder klara innan projektet startar\n4. **Var tydlig** – En bra kravspecifikation minskar missförstånd\n5. **Överväg templates** – En bra mall kan spara 50% av designkostnaden' },
    ],
    faq: [
      { q: 'Kan jag bygga en hemsida gratis?', a: 'Ja, med verktyg som WordPress.com eller Wix kan du skapa en enkel sida gratis, men den ser ofta oprofessionell ut och saknar viktiga funktioner.' },
      { q: 'Är det värt att betala för en dyr hemsida?', a: 'En professionell hemsida som konverterar besökare till kunder betalar sig ofta inom månader. En billig sajt som inte konverterar är dyrare i längden.' },
      { q: 'Hur ofta bör jag uppgradera min hemsida?', a: 'En fullständig redesign vart 3–5 år, med löpande förbättringar och content-uppdateringar däremellan.' },
    ],
    relatedLinks: [
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
      { label: 'Bästa webbyrån', href: '/basta-webbyran' },
    ]
  },
  {
    slug: 'hur-valjer-man-webbyra',
    metaTitle: 'Hur väljer man webbyrå? 10 tips | Updro',
    metaDesc: 'Guide för att välja rätt webbyrå. 10 tips som hjälper dig hitta den perfekta byrån för ditt projekt.',
    h1: 'Hur väljer man webbyrå? 10 tips för rätt val',
    category: 'Webbutveckling',
    publishedDate: '2026-02-01',
    intro: 'Att välja webbyrå är ett av de viktigaste besluten för ditt företags digitala satsning. Med hundratals byråer att välja bland kan det kännas överväldigande. Här är 10 beprövade tips.',
    sections: [
      { heading: '1. Definiera dina behov', content: 'Innan du kontaktar byråer bör du ha klart för dig:\n- Vad är syftet med hemsidan?\n- Vilka funktioner behöver du?\n- Vem är din målgrupp?\n- Vilken budget har du?\n- När behöver du vara klar?' },
      { heading: '2. Jämför minst 3 offerter', content: 'Kontakta aldrig bara en byrå. Via Updro kan du kostnadsfritt jämföra offerter från kvalitetssäkrade byråer och hitta rätt pris för ditt projekt.' },
      { heading: '3–10. Ytterligare tips', content: '3. **Granska portfolion** – Matchar deras stil din vision?\n4. **Kontrollera referenser** – Ring befintliga kunder\n5. **Diskutera process** – Hur jobbar de? Agilt? Vattenfall?\n6. **Fråga om teknik** – Vilken stack rekommenderar de?\n7. **Förstå prissättningen** – Fast pris eller löpande?\n8. **Kolla avtalet** – Vem äger koden? Support?\n9. **Testa kemin** – Ni ska jobba tätt tillsammans\n10. **Tänk långsiktigt** – Kan byrån växa med er?' },
    ],
    faq: [
      { q: 'Ska jag välja en stor eller liten byrå?', a: 'Liten byrå ger personligare service och ofta lägre priser. Stor byrå ger bredare kompetens och resurser. Välj baserat på projektets storlek.' },
    ],
    relatedLinks: [
      { label: 'Bästa webbyrån', href: '/basta-webbyran' },
      { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
    ]
  },
  {
    slug: 'seo-guide-foretag',
    metaTitle: 'SEO guide för företag 2026 – Komplett guide | Updro',
    metaDesc: 'Komplett SEO-guide för företag. Lär dig sökmotoroptimering steg för steg med konkreta tips och strategier.',
    h1: 'SEO guide för företag 2026 – Komplett guide',
    category: 'SEO',
    publishedDate: '2026-01-20',
    intro: 'Sökmotoroptimering (SEO) är den mest kostnadseffektiva kanalen för att driva relevant trafik. Den här guiden ger dig allt du behöver veta för att komma igång med SEO för ditt företag.',
    sections: [
      { heading: 'Grunderna i SEO', content: 'SEO handlar om att optimera din webbplats för att ranka högre i Googles organiska sökresultat. De tre pelarna är:\n\n- **Teknisk SEO** – Sajthastighet, mobilanpassning, crawlbarhet\n- **On-page SEO** – Sökordsoptimering, meta-taggar, innehåll\n- **Off-page SEO** – Länkbyggande och digitalt PR' },
      { heading: 'Steg-för-steg', content: '1. Gör en SEO-audit av din nuvarande sajt\n2. Analysera dina sökord och konkurrenter\n3. Åtgärda tekniska problem\n4. Optimera befintligt innehåll\n5. Skapa nytt, sökoptimerat innehåll\n6. Bygg kvalitetslänkar\n7. Mät och optimera löpande' },
    ],
    faq: [
      { q: 'Hur lång tid tar SEO?', a: '3–6 månader för märkbara resultat, 6–12 månader för signifikant trafik.' },
      { q: 'Kan jag göra SEO själv?', a: 'Grunderna ja, men för konkurrenskraftiga sökord behövs experthjälp.' },
    ],
    relatedLinks: [
      { label: 'SEO', href: '/seo' },
      { label: 'SEO pris', href: '/seo/pris' },
      { label: 'Bästa SEO-byrån', href: '/basta-seo-byran' },
    ]
  },
  {
    slug: 'shopify-vs-woocommerce',
    metaTitle: 'Shopify vs WooCommerce 2026 – Vilken ska du välja? | Updro',
    metaDesc: 'Jämförelse mellan Shopify och WooCommerce 2026. Priser, funktioner, fördelar och nackdelar.',
    h1: 'Shopify vs WooCommerce 2026 – Komplett jämförelse',
    category: 'E-handel',
    publishedDate: '2026-02-15',
    intro: 'Shopify och WooCommerce är de två mest populära e-handelsplattformarna. Men vilken passar ditt företag bäst? Vi jämför allt – pris, funktioner, skalbarhet och användarvänlighet.',
    sections: [
      { heading: 'Snabb jämförelse', content: '| | Shopify | WooCommerce |\n|---|---|---|\n| Pris | Från $39/mån | Gratis (hosting separat) |\n| Enkelhet | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |\n| Flexibilitet | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |\n| SEO | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |\n| Skalbarhet | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |\n| Appar/plugins | 8 000+ | 50 000+ |' },
      { heading: 'När välja Shopify?', content: 'Shopify passar om du:\n- Vill komma igång snabbt\n- Inte har teknisk kunskap\n- Vill ha allt-i-ett-lösning\n- Prioriterar enkelhet' },
      { heading: 'När välja WooCommerce?', content: 'WooCommerce passar om du:\n- Vill ha full kontroll\n- Redan använder WordPress\n- Vill undvika transaktionsavgifter\n- Behöver maximal flexibilitet' },
    ],
    faq: [
      { q: 'Vilken är billigast?', a: 'WooCommerce är gratis som plugin men kräver hosting (100–500 kr/mån). Shopify börjar på $39/mån men inkluderar hosting.' },
    ],
    relatedLinks: [
      { label: 'E-handel Shopify', href: '/ehandel/shopify' },
      { label: 'E-handel WooCommerce', href: '/ehandel/woocommerce' },
      { label: 'E-handel pris', href: '/ehandel/pris' },
    ]
  },
  {
    slug: 'hur-lang-tid-tar-apputveckling',
    metaTitle: 'Hur lång tid tar apputveckling? Guide 2026 | Updro',
    metaDesc: 'Hur lång tid tar det att utveckla en app? Komplett guide med tidslinjer för iOS, Android och cross-platform.',
    h1: 'Hur lång tid tar apputveckling? Komplett guide',
    category: 'App-utveckling',
    publishedDate: '2026-03-01',
    intro: 'Tidslinjen för apputveckling beror på appens komplexitet, plattform och utvecklingsmetod. Här ger vi realistiska tidsestimat baserat på verkliga projekt.',
    sections: [
      { heading: 'Tidsöversikt', content: '| Typ av app | Tidslinje |\n|---|---|\n| Enkel app (MVP) | 2–3 månader |\n| Medelstor app | 3–6 månader |\n| Komplex app | 6–12 månader |\n| Enterprise-app | 9–18 månader |' },
      { heading: 'Faser i apputveckling', content: '1. **Kravspecifikation** (1–2 veckor)\n2. **UX/UI-design** (2–4 veckor)\n3. **Utveckling** (4–24 veckor)\n4. **Testning** (2–4 veckor)\n5. **Lansering** (1–2 veckor)\n6. **Iteration** (löpande)' },
    ],
    faq: [
      { q: 'Kan man snabba på processen?', a: 'Ja, genom MVP-approach, cross-platform-ramverk och ett erfaret team. Men underskatta inte tiden för testning.' },
    ],
    relatedLinks: [
      { label: 'App-utveckling', href: '/app-utveckling' },
      { label: 'App-utveckling pris', href: '/app-utveckling/pris' },
      { label: 'Bästa apputvecklare', href: '/basta-apputvecklare' },
    ]
  },
  {
    slug: 'seo-pris-guide',
    metaTitle: 'SEO pris 2026 – Vad kostar sökmotoroptimering? | Updro',
    metaDesc: 'Komplett prisguide för SEO 2026. Se vad sökmotoroptimering kostar och jämför SEO-paket.',
    h1: 'SEO pris 2026 – Vad kostar sökmotoroptimering?',
    category: 'SEO',
    publishedDate: '2026-01-25',
    intro: 'SEO-priser varierar enormt – från 3 000 kr till 100 000 kr per månad. Men vad får du faktiskt för pengarna? Här ger vi en ärlig prisguide baserad på marknadsdata.',
    sections: [
      { heading: 'Marknadspriser 2026', content: '| Nivå | Pris/mån | Vad ingår |\n|---|---|---|\n| Basic | 3 000 – 8 000 kr | Grundläggande on-page, rapportering |\n| Standard | 8 000 – 20 000 kr | On-page + off-page, content, teknisk SEO |\n| Premium | 20 000 – 50 000 kr | Allt ovan + dedikerat team, content-produktion |\n| Enterprise | 50 000+ kr | Skräddarsytt, internationell SEO |' },
    ],
    faq: [
      { q: 'Är billig SEO värt det?', a: 'Sällan. SEO under 5 000 kr/mån kan göra mer skada än nytta med black-hat-metoder.' },
    ],
    relatedLinks: [
      { label: 'SEO', href: '/seo' },
      { label: 'Bästa SEO-byrån', href: '/basta-seo-byran' },
    ]
  },
  {
    slug: 'digital-marknadsforing-for-foretag',
    metaTitle: 'Digital marknadsföring för företag – Guide 2026 | Updro',
    metaDesc: 'Komplett guide till digital marknadsföring för företag. Strategier, kanaler och budget – allt du behöver veta.',
    h1: 'Digital marknadsföring för företag – Guide 2026',
    category: 'Marknadsföring',
    publishedDate: '2026-02-10',
    intro: 'Digital marknadsföring är inte längre valfritt – det är nödvändigt. Den här guiden ger dig en komplett översikt över kanaler, strategier och budgetering.',
    sections: [
      { heading: 'De viktigaste kanalerna', content: '1. **SEO** – Organisk synlighet, långsiktig ROI\n2. **Google Ads** – Omedelbar synlighet, betalda klick\n3. **Sociala medier** – Varumärkesbyggande, engagemang\n4. **Content marketing** – Bloggar, guider, video\n5. **E-postmarknadsföring** – Direkt kommunikation\n6. **Retargeting** – Nå tillbaka besökare som inte konverterade' },
    ],
    faq: [
      { q: 'Hur mycket ska jag lägga på marknadsföring?', a: 'Tumregel: 5–15% av omsättningen. Digitalt bör vara minst 50% av total marknadsföringsbudget.' },
    ],
    relatedLinks: [
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'SEO', href: '/seo' },
      { label: 'Sociala medier', href: '/sociala-medier' },
    ]
  },
  {
    slug: 'webbdesign-trender-2026',
    metaTitle: 'Webbdesign-trender 2026 – Årets 10 hetaste trender | Updro',
    metaDesc: 'Upptäck de hetaste webbdesign-trenderna 2026. AI-driven design, 3D, mikrointeraktioner och mer.',
    h1: 'Webbdesign-trender 2026 – Årets 10 hetaste',
    category: 'Webbdesign',
    publishedDate: '2026-01-10',
    intro: 'Webbdesign utvecklas snabbt. Här är de trender som definierar 2026 och som du bör ha koll på för att hålla din webbplats relevant.',
    sections: [
      { heading: 'De 10 hetaste trenderna', content: '1. **AI-genererade layouts** – Personaliserade upplevelser\n2. **Immersive 3D** – Interaktiva 3D-element\n3. **Dark mode som standard** – Mörka teman\n4. **Mikrointeraktioner** – Subtila animationer\n5. **Brutalism 2.0** – Medvetet rå estetik\n6. **Variable fonts** – Dynamisk typografi\n7. **Glassmorphism** – Frostat glas-effekter\n8. **Sustainability design** – Klimatmedveten design\n9. **Voice UI** – Röstnavigering\n10. **Scroll-triggered animations** – Animationer vid scroll' },
    ],
    faq: [
      { q: 'Behöver jag följa alla trender?', a: 'Nej, välj de som passar ditt varumärke och målgrupp. Trender ska komplettera, inte överskugga, funktionalitet.' },
    ],
    relatedLinks: [
      { label: 'Webbdesign', href: '/webbdesign' },
      { label: 'Grafisk design', href: '/grafisk-design' },
    ]
  },
  {
    slug: 'ehandel-statistik-sverige',
    metaTitle: 'E-handel statistik Sverige 2026 – Siffror och trender | Updro',
    metaDesc: 'Aktuell e-handelsstatistik för Sverige 2026. Omsättning, trender, beteenden och prognoser.',
    h1: 'E-handel statistik Sverige 2026',
    category: 'E-handel',
    publishedDate: '2026-02-20',
    intro: 'Den svenska e-handelsmarknaden fortsätter att växa. Här samlar vi den senaste statistiken och trenderna du behöver känna till.',
    sections: [
      { heading: 'Nyckeltal 2026', content: '- **Total omsättning**: ~175 miljarder kr\n- **Tillväxt**: +8% jämfört med 2025\n- **Andel av detaljhandeln**: ~18%\n- **Mobilhandel**: 65% av alla köp\n- **Vanligaste betalsättet**: Klarna (35%), Kort (30%), Swish (20%)\n- **Genomsnittligt ordervärde**: 850 kr' },
      { heading: 'Trender 2026', content: '- Social commerce växer 40% YoY\n- Hållbar e-handel blir standard\n- AI-personalisering ökar konvertering 15–30%\n- Same-day delivery expanderar utanför storstäder\n- Subscription-modeller fortsätter växa' },
    ],
    faq: [
      { q: 'Hur stor är e-handeln i Sverige?', a: 'E-handeln i Sverige omsätter cirka 175 miljarder kr 2026 och växer med 8% årligen.' },
    ],
    relatedLinks: [
      { label: 'E-handel', href: '/ehandel' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
    ]
  },
  {
    slug: 'seo-statistik-sverige',
    metaTitle: 'SEO statistik Sverige 2026 – Fakta och siffror | Updro',
    metaDesc: 'Aktuell SEO-statistik för Sverige 2026. Sökbeteenden, marknadsdata och trender.',
    h1: 'SEO statistik Sverige 2026',
    category: 'SEO',
    publishedDate: '2026-03-05',
    intro: 'Sökmotoroptimering fortsätter vara den viktigaste digitala kanalen. Här samlar vi den senaste SEO-statistiken för den svenska marknaden.',
    sections: [
      { heading: 'Nyckeltal', content: '- **Google marknadsandel i Sverige**: 95%\n- **Andel som klickar på organiskt**: 45–55%\n- **Genomsnittlig SEO-budget**: 12 000 kr/mån\n- **ROI för SEO**: 5–10x inom 12 månader\n- **Antal sökningar i Sverige/dag**: ~15 miljoner\n- **Andel mobila sökningar**: 68%' },
    ],
    faq: [
      { q: 'Är SEO fortfarande relevant 2026?', a: 'Absolut. Med AI-genererade svar ändras formatet, men organisk synlighet är fortfarande den mest kostnadseffektiva kanalen.' },
    ],
    relatedLinks: [
      { label: 'SEO', href: '/seo' },
      { label: 'SEO pris', href: '/seo/pris' },
    ]
  },
  {
    slug: 'webbyra-pris-2026',
    metaTitle: 'Webbyrå pris 2026 – Vad kostar en webbyrå? | Updro',
    metaDesc: 'Vad kostar det att anlita en webbyrå 2026? Timpriser, fasta priser och paketlösningar. Komplett prisguide med aktuella marknadspriser.',
    h1: 'Webbyrå pris 2026 – Vad kostar det att anlita en webbyrå?',
    category: 'Webbutveckling',
    publishedDate: '2026-03-01',
    intro: '"Vad kostar en webbyrå?" är en av de vanligaste frågorna vi får på Updro. Svaret beror på projektets storlek, byråns erfarenhet och var i Sverige byrån finns. I den här guiden ger vi dig en ärlig prisöversikt baserad på verkliga offerter.',
    sections: [
      { heading: 'Timpris vs fast pris', content: '**Timpris:**\n- Freelancers: 500 – 900 kr/h\n- Liten byrå: 800 – 1 200 kr/h\n- Mellanstor byrå: 1 000 – 1 500 kr/h\n- Stor byrå: 1 200 – 2 000+ kr/h\n\n**Fast pris (vanligaste modellen):**\n- Enkel hemsida: 15 000 – 50 000 kr\n- Företagshemsida med CMS: 30 000 – 100 000 kr\n- E-handel: 40 000 – 200 000 kr\n- Webbapplikation: 80 000 – 500 000+ kr\n\nFast pris ger trygghet, timpris ger flexibilitet.' },
      { heading: 'Priser per stad', content: '| Stad | Prisindex |\n|---|---|\n| Stockholm | 100 (referens) |\n| Göteborg | 85–95 |\n| Malmö | 80–90 |\n| Uppsala | 80–90 |\n| Övriga | 70–85 |\n\nStockholm är dyrast, men har också störst urval och bredast kompetens.' },
      { heading: 'Dolda kostnader att se upp för', content: '- **Ändringar utanför scope** – Begär tydlig kravspecifikation\n- **Hosting och underhåll** – 500–3 000 kr/månad löpande\n- **Licenser** – CMS, plugins, bilder kan kosta extra\n- **Content** – Professionella texter kostar 500–2 000 kr/sida\n- **SEO-setup** – Grundläggande SEO bör ingå, men avancerad SEO är ofta extra' },
      { heading: 'Så sparar du pengar', content: '1. **Jämför minst 3 offerter** via Updro – sparar i snitt 30%\n2. **Ha innehåll redo** – Texter och bilder innan projektet startar\n3. **Börja med MVP** – Bygg grunderna, utöka senare\n4. **Välj rätt CMS** – WordPress för enklare sajter, custom för avancerade\n5. **Var tydlig** – En bra kravspecifikation minskar missförstånd och tillägg' },
    ],
    faq: [
      { q: 'Vad är rimligt att betala för en hemsida?', a: 'En professionell företagshemsida bör kosta minst 15 000–30 000 kr. Under det får du sällan kvalitet som konverterar.' },
      { q: 'Varför skiljer sig priserna så mycket?', a: 'Erfarenhet, storlek, geografisk placering och projektets komplexitet påverkar. En erfaren byrå arbetar snabbare och levererar bättre resultat.' },
      { q: 'Ska jag välja billigaste byrån?', a: 'Sällan. En billig hemsida som inte konverterar kostar mer i längden. Fokusera på värde, inte bara pris.' },
    ],
    relatedLinks: [
      { label: 'Webbutveckling', href: '/webbutveckling' },
      { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
      { label: 'Bästa webbyrån', href: '/basta-webbyran' },
      { label: 'Hur väljer man webbyrå?', href: '/artiklar/hur-valjer-man-webbyra' },
    ]
  },
  {
    slug: 'vad-kostar-google-ads',
    metaTitle: 'Vad kostar Google Ads 2026? Komplett prisguide | Updro',
    metaDesc: 'Vad kostar Google Ads 2026? Klickpriser, byråavgifter och annonsbudgetar. Aktuella priser för svenska marknaden.',
    h1: 'Vad kostar Google Ads 2026? Komplett prisguide',
    category: 'Marknadsföring',
    publishedDate: '2026-02-25',
    intro: 'Google Ads-kostnader beror på bransch, konkurrens och kvalitet. Den här guiden ger dig realistiska prisuppgifter för den svenska marknaden 2026 – både annonsbudget och byråavgifter.',
    sections: [
      { heading: 'Klickpriser per bransch i Sverige', content: '| Bransch | CPC (kr) |\n|---|---|\n| E-handel | 3 – 15 |\n| B2B / SaaS | 8 – 35 |\n| Konsulttjänster | 10 – 40 |\n| Fastigheter | 15 – 50 |\n| Hälsa / Sjukvård | 10 – 35 |\n| Juridik | 30 – 100+ |\n| Försäkring | 40 – 120+ |\n| Utbildning | 5 – 20 |\n\nKlickpriset beror på sökordets konkurrens, din kvalitetspoäng och geografisk inriktning.' },
      { heading: 'Rekommenderad annonsbudget', content: '- **Micro** (test): 3 000 – 5 000 kr/mån\n- **Litet företag**: 5 000 – 15 000 kr/mån\n- **Medelstort**: 15 000 – 50 000 kr/mån\n- **Stort/Enterprise**: 50 000 – 500 000+ kr/mån\n\nTumregel: Lägg minst 2x din byråavgift på annonsbudget för att ge byrån tillräckligt med data att optimera.' },
      { heading: 'Byråavgifter', content: '**Fast pris:**\n- 3 000 – 8 000 kr/mån (basic)\n- 8 000 – 20 000 kr/mån (standard)\n- 20 000+ kr/mån (premium)\n\n**Procentmodell:**\n- 10–20% av annonsbudgeten\n\n**Hybridmodell:**\n- Fast grundavgift + procent av budget' },
      { heading: 'Så maximerar du ROI', content: '1. Investera i konverteringsspårning innan du startar\n2. Börja med sökkampanjer – högst köpintention\n3. Använd negativa sökord flitigt\n4. Testa annonser A/B\n5. Jämför byråer via Updro – rätt partner gör enorm skillnad' },
    ],
    faq: [
      { q: 'Hur mycket ska jag lägga på Google Ads?', a: 'Minst 5 000 kr/mån i annonsbudget plus byråavgift. De flesta företag ser bäst resultat med 15 000+ kr/mån totalt.' },
      { q: 'Är Google Ads dyrt?', a: 'Det beror på perspektivet. Om du genererar 10 kunder á 50 000 kr från 15 000 kr i annonser är det en fantastisk investering.' },
      { q: 'Finns det en minsta budget?', a: 'Tekniskt nej, men under 3 000 kr/mån får du sällan tillräckligt med data för att optimera effektivt.' },
    ],
    relatedLinks: [
      { label: 'Google Ads', href: '/google-ads' },
      { label: 'Google Ads pris', href: '/google-ads/pris' },
      { label: 'Bästa Google Ads-byrån', href: '/basta-google-ads-byran' },
      { label: 'SEO pris', href: '/seo/pris' },
    ]
  },
  {
    slug: 'google-ads-vs-seo',
    metaTitle: 'Google Ads vs SEO – Vilken strategi ska du välja? | Updro',
    metaDesc: 'Google Ads eller SEO – vad ska du välja? Jämförelse av kostnader, tid, resultat och när du ska använda vad.',
    h1: 'Google Ads vs SEO – Komplett jämförelse 2026',
    category: 'Marknadsföring',
    publishedDate: '2026-03-05',
    intro: 'Google Ads och SEO är de två viktigaste kanalerna för synlighet i Google. Men vilken ska du satsa på? Svaret beror på din situation – budget, tidsperspektiv och bransch.',
    sections: [
      { heading: 'Snabb jämförelse', content: '| | Google Ads | SEO |\n|---|---|---|\n| Tid till resultat | Dagar | 3–6 månader |\n| Kostnad | Löpande (per klick) | Investering (engång + löpande) |\n| Trafik vid stopp | Försvinner | Kvarstår |\n| CTR (genomsnitt) | 2–5% | 15–30% (position 1) |\n| Trovärdighet | Lägre (markerat som annons) | Högre (organiskt) |\n| Skalbarhet | Omedelbar (öka budget) | Gradvis (mer content) |' },
      { heading: 'När välja Google Ads?', content: '- Du behöver resultat NU (ny produkt, event, säsong)\n- Du testar nya marknader eller sökord\n- Du har hög marginal per kund\n- Din bransch har kort köpcykel\n- Du vill skala snabbt med budget' },
      { heading: 'När välja SEO?', content: '- Du vill bygga långsiktig trafik\n- Du har begränsad månadsbudget men tid\n- Dina konkurrenter dominerar organiskt\n- Du vill bygga auktoritet och trovärdighet\n- Din bransch har informationssökningar' },
      { heading: 'Bästa strategin: Båda!', content: 'Smartast är att kombinera:\n1. **Google Ads** för omedelbar trafik och data\n2. **SEO** för långsiktig kostnadseffektiv trafik\n3. Använd Ads-data för att hitta lönsamma sökord för SEO\n4. Minska Ads-budget gradvis när SEO-trafiken växer\n5. Behåll Ads för konkurrenskraftiga och konverterande sökord' },
    ],
    faq: [
      { q: 'Vilken ger bäst ROI?', a: 'Långsiktigt ger SEO oftast bättre ROI. Kortsiktigt vinner Google Ads. Bäst ROI med en kombination av båda.' },
      { q: 'Kan jag börja med Ads och sedan byta till SEO?', a: 'Ja, det är en vanlig strategi. Google Ads ger snabb data om vilka sökord som konverterar – perfekt input för SEO-strategi.' },
    ],
    relatedLinks: [
      { label: 'Google Ads', href: '/google-ads' },
      { label: 'SEO', href: '/seo' },
      { label: 'Bästa Google Ads-byrån', href: '/basta-google-ads-byran' },
      { label: 'Bästa SEO-byrån', href: '/basta-seo-byran' },
    ]
  },
  {
    slug: 'vad-kostar-digital-marknadsforing',
    metaTitle: 'Vad kostar digital marknadsföring 2026? Prisguide | Updro',
    metaDesc: 'Komplett prisguide för digital marknadsföring 2026. SEO, Google Ads, sociala medier, content – alla priser.',
    h1: 'Vad kostar digital marknadsföring 2026?',
    category: 'Marknadsföring',
    publishedDate: '2026-02-18',
    intro: 'Digital marknadsföring omfattar allt från SEO till sociala medier. Priserna varierar enormt beroende på kanal, byrå och ambitionsnivå. Här ger vi en ärlig prisöversikt.',
    sections: [
      { heading: 'Priser per kanal', content: '| Kanal | Månadspris (byrå) | Annonsbudget |\n|---|---|---|\n| SEO | 5 000 – 30 000 kr | – |\n| Google Ads | 3 000 – 30 000 kr | 5 000 – 200 000 kr |\n| Meta Ads (FB/IG) | 5 000 – 20 000 kr | 5 000 – 100 000 kr |\n| LinkedIn Ads | 5 000 – 15 000 kr | 10 000 – 50 000 kr |\n| Sociala medier (organiskt) | 8 000 – 25 000 kr | – |\n| Content marketing | 8 000 – 30 000 kr | – |\n| E-postmarknadsföring | 3 000 – 15 000 kr | – |\n| Fullservice-paket | 20 000 – 80 000 kr | 10 000 – 200 000 kr |' },
      { heading: 'Hur stor budget behöver du?', content: 'Tumregel: 5–15% av omsättningen bör gå till marknadsföring. Digitalt bör stå för minst 50–70% av total marknadsföringsbudget.\n\n| Företagsstorlek | Rekommenderad digitalbudget |\n|---|---|\n| Startup | 10 000 – 30 000 kr/mån |\n| Litet företag | 15 000 – 50 000 kr/mån |\n| Medelstort | 30 000 – 150 000 kr/mån |\n| Stort | 100 000 – 500 000+ kr/mån |' },
    ],
    faq: [
      { q: 'Vilken kanal ska jag börja med?', a: 'Hemsida + SEO + Google Ads är grundpelarna. Lägg till sociala medier och content marketing i steg 2.' },
      { q: 'Kan jag göra digital marknadsföring själv?', a: 'Grunderna ja, men en byrå levererar typiskt 2–5x bättre ROI tack vare erfarenhet och verktyg.' },
    ],
    relatedLinks: [
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'SEO pris', href: '/seo/pris' },
      { label: 'Google Ads pris', href: '/google-ads/pris' },
    ]
  },

  // ─────────────────────────────────────────────────────────
  // NEWS – 2026 (color the index, signal freshness to Google)
  // ─────────────────────────────────────────────────────────
  {
    slug: 'google-algoritm-update-mars-2026',
    metaTitle: 'Googles marsuppdatering 2026 – så påverkas svenska sajter',
    metaDesc: 'Vad ändrades i Googles marsuppdatering 2026? Tidiga signaler från svenska sajter, vad som rasade och hur du återhämtar dig.',
    h1: 'Googles marsuppdatering 2026 – tidiga signaler från svenska sajter',
    category: 'SEO',
    publishedDate: '2026-03-22',
    updatedDate: '2026-04-02',
    type: 'news',
    intro: 'Google rullade ut en bredare core-uppdatering i mitten av mars. Den slog hårdast mot tunna affiliate-sajter och AI-massproducerat innehåll. Här är vad vi ser i de svenska SERP:erna efter två veckors data.',
    sections: [
      { heading: 'Vad som rörde sig mest i Sverige', content: 'Vinnare i den här omgången är publicister med tydligt ägarskap (om-oss-sida, namngiven redaktion, kontaktuppgifter) och e-handel med rejält produktinnehåll. Förlorare är generiska "topp 10"-listor och AI-genererade pris- och guide-sajter utan källor.\n\nFlera svenska tjänsteföretag rapporterar 20–40 procent tappad organisk trafik. Det är inte ovanligt vid en core-uppdatering, men nivån är högre än i 2025-uppdateringarna.' },
      { heading: 'Mönster i de drabbade sidorna', content: '- Sajter där författare saknas helt eller där en "expert" är samma person på 200 artiklar.\n- Långa guider utan konkret data, prisuppgifter eller exempel.\n- Sidor som rankade på keyword-stuffing snarare än faktiskt djup.\n- Auto-genererade stadslandningssidor utan unikt innehåll per stad.\n\nGemensam nämnare: ytligt innehåll producerat snabbt utan mänsklig redaktion.' },
      { heading: 'Vad du gör om du tappat', content: 'Vänta minst tre veckor innan du panikar. Core-uppdateringar fortsätter rulla ut i 2–4 veckor. Använd tiden till att granska dina mest tappade sidor: är de faktiskt bättre än konkurrenternas? Har de en namngiven författare? Konkreta siffror? Senast-uppdaterad-datum?\n\nOm svaret är nej på flera av dem är det inte algoritmen som är problemet.' },
      { heading: 'Vad vi gör på Updro', content: 'Vi har en redaktion med namn och bild, varje artikel är granskad av en människa, och vi har lagt till "senast granskad"-datum på alla guider. Den här typen av signaler matchar det Google sa i marsuppdateringens dokumentation om "people-first content".' },
    ],
    faq: [
      { q: 'Är detta en HCU-uppdatering?', a: 'Inte officiellt namngiven så, men signalerna är samma: belönar sidor där en människa stått bakom innehållet.' },
      { q: 'Kan jag återhämta innan nästa update?', a: 'Ja, men effekten syns oftast först vid nästa core-uppdatering. Förbered nu.' },
      { q: 'Påverkas alla branscher lika?', a: 'Nej. YMYL-områden (hälsa, finans) träffades hårdast. E-handel mer måttligt.' },
    ],
    relatedLinks: [
      { label: 'SEO för AI-sök 2026', href: '/artiklar/seo-for-ai-sok-2026' },
      { label: 'SEO-guide för företag', href: '/artiklar/seo-guide-foretag' },
      { label: 'SEO pris', href: '/seo/pris' },
    ]
  },
  {
    slug: 'ai-verktyg-marknadsforing-2026',
    metaTitle: 'AI-verktyg för marknadsföring 2026 – vad fungerar i Sverige',
    metaDesc: 'Vilka AI-verktyg använder svenska marknadsavdelningar 2026? Genomgång av det som faktiskt sparar tid – och det som inte gör det.',
    h1: 'AI-verktyg för marknadsföring 2026 – läget i Sverige',
    category: 'Marknadsföring',
    publishedDate: '2026-04-08',
    updatedDate: '2026-04-08',
    type: 'news',
    intro: 'På ett år har AI-verktygen i marknadsavdelningarna gått från "vi testar lite" till "vi har sex licenser och vet inte vilka som används". Här är en lägesrapport från ett 30-tal svenska marknadschefer vi pratat med under första kvartalet 2026.',
    sections: [
      { heading: 'Vad som faktiskt används dagligen', content: 'ChatGPT (eller motsvarande) för briefer, e-postutkast och sammanfattningar. Perplexity för research. Claude för längre texter. Midjourney och Adobe Firefly för bildkoncept – sällan slutlevererade bilder.\n\nDet som inte används lika ofta som leverantörerna säger: heltäckande "AI marketing platforms". De flesta avdelningar har plockat ihop sitt eget stack.' },
      { heading: 'Det som verkligen sparar tid', content: 'Snabba första utkast på e-post, annonscopy och produktbeskrivningar. SEO-research där en människa sedan väljer ut det relevanta. Transkribering och sammanfattning av kundsamtal. Korrektur och tonjustering.\n\nEn marknadschef i Linköping uppskattade att hennes team sparar 6–8 timmar per vecka enbart på dessa fyra användningsområden.' },
      { heading: 'Det som inte fungerat', content: 'Att låta AI publicera content utan redigering. Trafiken kommer kanske, men konvertering och varumärkesförtroende rasar. Flera bolag fick också besök av jurister efter att AI:n hittat på påståenden om priser och garantier.\n\nAuto-genererade landningssidor i skala är också på väg ut. Google straffar dem nu (se marsuppdateringen) och konvertering är generellt sämre.' },
      { heading: 'Vad svenska byråer rekommenderar 2026', content: 'Använd AI för tempo, inte ersättning. Behåll en mänsklig redaktör mellan modellen och publicerat innehåll. Investera i bra prompts som dokumenteras internt – det är det nya "brand voice"-dokumentet.' },
    ],
    faq: [
      { q: 'Vilket AI-verktyg ska jag börja med?', a: 'ChatGPT eller Claude för text, Perplexity för research. De tre täcker 80 procent av vardagsbehoven.' },
      { q: 'Behöver vi en egen AI-policy?', a: 'Ja, även små bolag. Reglera vad som inte får matas in (kunddata, källkod) och vem som signerar av AI-genererat publikt material.' },
    ],
    relatedLinks: [
      { label: 'ChatGPT-synlighet för företag', href: '/artiklar/chatgpt-synlighet-for-foretag-2026' },
      { label: 'SEO för AI-sök', href: '/artiklar/seo-for-ai-sok-2026' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
    ]
  },
  {
    slug: 'sveriges-digitala-byraer-konjunktur-2026',
    metaTitle: 'Sveriges digitala byråer – konjunkturläget 2026',
    metaDesc: 'Hur går det för svenska digitala byråer just nu? Snittpriser, beläggning och vad köpare prioriterar i lågkonjunktur 2026.',
    h1: 'Konjunkturläget för svenska digitala byråer 2026',
    category: 'Marknadsföring',
    publishedDate: '2026-02-12',
    updatedDate: '2026-03-30',
    type: 'news',
    intro: 'Den svenska byråmarknaden går in i 2026 med blandade signaler. Stora byråer i Stockholm rapporterar prispress, medan specialiserade nischbyråer i Linköping, Umeå och Jönköping har fullbokat. Här är vad data och samtal visar.',
    sections: [
      { heading: 'Beläggning och prispress', content: 'Stora generalistbyråer ligger på 70–80 procent beläggning, ned från 90+ för två år sedan. Timpriserna har planat ut runt 1 200–1 500 kr för seniora roller, snarare än att fortsätta uppåt som under 2022–2023.\n\nNischade byråer (renodlad SEO, Shopify-experter, B2B-content) går mot strömmen och har höjt sina priser. Beställare betalar fortfarande premium för specialistkompetens.' },
      { heading: 'Vad beställare prioriterar', content: 'Mätbar avkastning är den största förändringen. "Bygg en fin sajt" har ersatts av "öka konvertering med 15 procent". Mer än hälften av de uppdrag som publiceras på Updro Q1 2026 har en konkret KPI redan i förfrågan.\n\nFasta priser slår timdebitering allt oftare. Byråer som inte kan estimera projekt förlorar affärer.' },
      { heading: 'Vinnarna 2026', content: 'Mindre byråer med tydlig nisch. AI-flytande team som levererar dubbelt så snabbt som tidigare till samma pris. Byråer som vågar säga nej till uppdrag de inte kan leverera på.\n\nFörlorarna är generalister utan särprägel som konkurrerar enbart på pris.' },
    ],
    faq: [
      { q: 'Är det köparens marknad nu?', a: 'I storstäderna – ja. Det finns färre projekt och mer kapacitet än för två år sedan. På specialiserade kompetenser är läget tvärtom.' },
      { q: 'Sjunker timpriserna?', a: 'Inte signifikant. De ligger stilla. Det som faller är överbelagda fastpriser från dyra byråer.' },
    ],
    relatedLinks: [
      { label: 'Webbyrå pris 2026', href: '/artiklar/webbyra-pris-2026' },
      { label: 'Hur väljer man webbyrå?', href: '/artiklar/hur-valjer-man-webbyra' },
      { label: 'Bästa webbyrån', href: '/basta-webbyran' },
    ]
  },
  {
    slug: 'e-handel-trender-varen-2026',
    metaTitle: 'E-handelstrender våren 2026 – vad som faktiskt funkar',
    metaDesc: 'Vilka e-handelstrender slår igenom våren 2026? Konkreta siffror från svenska butiker och vad konsumenterna nu förväntar sig.',
    h1: 'E-handelstrender våren 2026 – från svenska butiker',
    category: 'E-handel',
    publishedDate: '2026-03-04',
    updatedDate: '2026-04-10',
    type: 'news',
    intro: 'Den svenska e-handelsvåren 2026 ser annorlunda ut än fjolårets. Mobilhandeln har stabiliserats kring 67 procent, returprocenten i kläder är fortfarande över 30 procent, och något har hänt med betalningsfördelningen. Här är vad data säger.',
    sections: [
      { heading: 'Betalningsfördelning förändras', content: 'Klarna ligger fortfarande i topp men har tappat 4–5 procentenheter på ett år. Swish e-handel har vuxit kraftigt, särskilt för köp under 500 kr. Direktbetalning via konto (open banking) är på frammarsch hos kunder över 50 år.\n\nFör butiker betyder det fler integrationer i kassan – och fortfarande 1–3 procent i avgifter att förhandla om.' },
      { heading: 'AI-rekommendationer som faktiskt fungerar', content: 'Tre svenska e-handlare vi pratat med ser 12–18 procent högre snittordervärde med moderna rekommendationsmotorer. Skillnaden mot 2024: motorerna är billigare och tränas på butikens egen data, inte generisk branschdata.\n\nKlassisk "kunder köpte också" presterar fortfarande bättre än komplexa rekommendationer i de flesta segment.' },
      { heading: 'Returer och hållbarhet', content: 'Sverige följer EU-trenden där betalda returer blir vanligare i klädbranschen. Två stora svenska klädbutiker införde 49 kr-returer i februari 2026 utan att tappa konvertering nämnvärt. Returprocenten sjönk däremot 4–6 procent.\n\nKonsumenterna är inte överraskade – de har vetat att gratis returer var subventionerade.' },
    ],
    faq: [
      { q: 'Är det fortfarande värt att satsa på Shopify 2026?', a: 'För de flesta svenska butiker upp till 50 mkr i omsättning – ja. Plattformen är stabil och ekosystemet växer. Stora svenska aktörer flyttar dock allt oftare till headless eller composable.' },
      { q: 'Hur viktigt är Swish e-handel nu?', a: 'För B2C under 1 000 kr: viktigt. Avsaknad är en konverteringsfälla särskilt på mobil.' },
    ],
    relatedLinks: [
      { label: 'Shopify vs WooCommerce', href: '/artiklar/shopify-vs-woocommerce' },
      { label: 'E-handel statistik Sverige', href: '/artiklar/ehandel-statistik-sverige' },
      { label: 'E-handel', href: '/ehandel' },
    ]
  },
  {
    slug: 'seo-for-ai-sok-2026',
    metaTitle: 'SEO för AI-sök 2026 – synlighet i ChatGPT, Gemini och Perplexity',
    metaDesc: 'Hur optimerar du för ChatGPT, Perplexity och Gemini 2026? Konkret strategi för AI-sök utan att slänga klassisk SEO.',
    h1: 'SEO för AI-sök 2026 – så syns du i ChatGPT, Perplexity och Gemini',
    category: 'SEO',
    publishedDate: '2026-04-15',
    updatedDate: '2026-04-15',
    type: 'guide',
    intro: 'Andelen sökningar som sker i ChatGPT, Perplexity och Gemini istället för Google växer stadigt. Inte explosivt, men tillräckligt för att svenska byråer börjat få frågan: "Hur syns vi där?". Det korta svaret: gör klassisk SEO, plus några specifika saker. Det långa svaret är det här.',
    sections: [
      { heading: 'Hur LLM-svar plockas ihop', content: 'När en användare ställer en fråga i ChatGPT eller Perplexity hämtas i regel 3–8 källor från webben i realtid. Modellen syntetiserar svaret och nämner ofta källorna. Det är de citaten du jagar.\n\nFör att bli citerad behöver två saker stämma: din sida måste hittas (klassisk crawlability) och innehållet måste vara enkelt att lyfta ut som ett självständigt svar.' },
      { heading: 'Skriv så att svaret står i första meningen', content: 'LLM:er gillar text där svaret står direkt. "En hemsida kostar 15 000–80 000 kr för ett företag i Sverige 2026" är värdefullt. Ett 200-ords inledande resonemang innan siffran kommer är mindre värdefullt.\n\nDet krockar inte med klassisk SEO – det förstärker den. Featured snippets och AI-citat belönar samma struktur.' },
      { heading: 'Tekniska signaler som hjälper', content: '- Tydlig publishing-författare med bio och kontakt.\n- Datum för publicering OCH senaste granskning.\n- Strukturerad data (FAQPage, Article, Organization).\n- En llms.txt på rotnivå som beskriver vad sajten är.\n- Korta URL:er, läsbara rubriker.\n- Tabeller med konkreta siffror.\n\nIngen av dessa är hemliga – det är bara att de spelar större roll nu än för två år sedan.' },
      { heading: 'Vad du inte ska göra', content: 'Skriv inte "AI-optimerade" sidor som är tunna lager keywords. LLM:er är ofta bättre än Google på att se igenom sånt eftersom de läser hela sidan, inte bara signaler.\n\nSluta inte heller med klassisk SEO. ChatGPT och Perplexity hämtar fortfarande till stor del från sidor som rankar bra organiskt. Google driver fortfarande 90+ procent av sökningarna i Sverige.' },
    ],
    faq: [
      { q: 'Behöver jag en egen "llms.txt"?', a: 'Det skadar inte. Vi har en på updro.se. Det är en kort markdownfil som beskriver vad sajten innehåller – LLM:er börjar läsa den.' },
      { q: 'Ska jag spärra AI-bottar i robots.txt?', a: 'Bara om du verkligen inte vill bli citerad. För de flesta svenska företag är citat-trafik värdefull och växande.' },
      { q: 'Hur mäter jag synlighet i AI-sök?', a: 'Verktyg som Otterly och Profound gör det. Annars – ställ konkreta frågor som dina kunder skulle ställa, i ChatGPT och Perplexity, och se vem som nämns.' },
    ],
    relatedLinks: [
      { label: 'SEO-guide för företag', href: '/artiklar/seo-guide-foretag' },
      { label: 'ChatGPT-synlighet för företag', href: '/artiklar/chatgpt-synlighet-for-foretag-2026' },
      { label: 'Googles marsuppdatering 2026', href: '/artiklar/google-algoritm-update-mars-2026' },
    ]
  },
  {
    slug: 'chatgpt-synlighet-for-foretag-2026',
    metaTitle: 'ChatGPT-synlighet för företag 2026 – så blir du rekommenderad',
    metaDesc: 'Bli rekommenderad i ChatGPT när potentiella kunder frågar efter företag i din bransch. Konkret guide för svenska bolag 2026.',
    h1: 'ChatGPT-synlighet för företag 2026 – från noll till rekommendation',
    category: 'SEO',
    publishedDate: '2026-04-02',
    updatedDate: '2026-04-15',
    type: 'guide',
    intro: 'En växande andel B2B-köp börjar med "Vilka är de bästa byråerna för X i Sverige?" – ställd till ChatGPT eller Perplexity. Om ditt företag inte nämns där förlorar du leads du aldrig får veta att du missade. Här är vad som faktiskt fungerar.',
    sections: [
      { heading: 'Vad ChatGPT vet om ditt företag idag', content: 'Testa själv: öppna ChatGPT och fråga "Vilka är de bästa [din bransch]-byråerna i [din stad]?". Får du svar nämns du eller inte? Får du inte svar är ditt företag inte ens i underlaget.\n\nDet är där du börjar. Inte med "AI-strategi", utan med en tydlig mätpunkt på utgångsläget.' },
      { heading: 'Vad som driver omnämnande', content: '1. Att finnas i tredjepartslistor och jämförelser. När någon skrivit "10 bästa SEO-byråerna i Göteborg" och du står där, hamnar du i underlaget för många LLM-svar.\n2. En tydlig om-oss-sida med vad ni gör, var ni finns, vilka som driver bolaget. LLM:er gillar konkreta fakta.\n3. Att ha case eller publicerade kundnamn på sajten – det skapar associationer mellan ditt företag och specifika branscher.\n4. Branschmedier som skrivit om er. Lite gammeldags PR slår fortfarande mycket annat.' },
      { heading: 'Konkret 30-dagarsplan', content: 'Vecka 1: Testa nuvarande synlighet på 10 frågor som dina kunder skulle ställa. Dokumentera vem som nämns istället.\n\nVecka 2: Optimera om-oss-sidan. Lägg till stad, grundare, antal anställda, kunder, tjänster i klartext. Inga buzzwords.\n\nVecka 3: Identifiera 5–10 jämförelseartiklar och listartiklar i din nisch. Pitcha skribenten med ett konkret skäl varför ni borde ingå.\n\nVecka 4: Skriv en egen jämförelseartikel i din nisch där ni ärligt jämför er med konkurrenter. Det blir ofta källa för LLM-svar.' },
      { heading: 'Det som inte fungerar (så bra)', content: 'Att betala för "AI SEO". Just nu finns inga genvägar – det är klassisk content och digital PR i ny kostym.\n\nAtt fylla sajten med "AI-optimerat" innehåll utan substans. LLM:er väljer källor med konkret information, inte ord-soppa.' },
    ],
    faq: [
      { q: 'Hur lång tid tar det att synas?', a: 'Beroende på bransch: 2–6 månader för att märkbart förändra omnämnande-mönstret. Snabbare i nischer.' },
      { q: 'Är detta värt det för små bolag?', a: 'Om dina kunder är digitalt mogna – ja. För konsumentprodukter på Tradera är det fortfarande tidigt.' },
      { q: 'Påverkas omnämnandet av annonser?', a: 'Inte direkt. ChatGPT visar inte annonser ännu. Indirekt om annonsering driver omnämnande på andra sajter.' },
    ],
    relatedLinks: [
      { label: 'SEO för AI-sök 2026', href: '/artiklar/seo-for-ai-sok-2026' },
      { label: 'AI-verktyg för marknadsföring', href: '/artiklar/ai-verktyg-marknadsforing-2026' },
      { label: 'SEO-guide för företag', href: '/artiklar/seo-guide-foretag' },
    ]
  },
]

/** Mark a few existing articles as the comparison type */
const COMPARISON_SLUGS = new Set(['shopify-vs-woocommerce', 'google-ads-vs-seo'])
ARTICLES.forEach(a => {
  if (!a.type) {
    a.type = COMPARISON_SLUGS.has(a.slug) ? 'comparison' : 'guide'
  }
  if (!a.updatedDate) a.updatedDate = a.publishedDate
  if (!a.readTimeMinutes) {
    const total = a.intro.length + a.sections.reduce((s, sec) => s + sec.content.length, 0)
    a.readTimeMinutes = Math.max(3, Math.round(total / 1200))
  }
})

export const findArticle = (slug: string) => ARTICLES.find(a => a.slug === slug)

export const getArticlesByCategory = (category: string) => ARTICLES.filter(a => a.category === category)
