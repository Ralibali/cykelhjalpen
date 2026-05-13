// Programmatic SEO – cities × service categories
// 25 cities × 10 categories = 250 unique pages

export interface CityData {
  slug: string
  name: string
  population: string
  region: string
  description: string
  techDescription: string
}

export const CITIES: CityData[] = [
  { slug: 'stockholm', name: 'Stockholm', population: '1 000 000+', region: 'Stockholms län', description: 'Sveriges huvudstad och digitala nav.', techDescription: 'Stockholm är Nordens ledande tech-hub med över 40 000 techarbetare. Här finns allt från startups till enterprise-byråer.' },
  { slug: 'goteborg', name: 'Göteborg', population: '590 000', region: 'Västra Götaland', description: 'Västkustens kreativa centrum.', techDescription: 'Göteborg har en dynamisk tech-scen driven av Chalmers och Lindholmen Science Park. Stark tradition inom design, industri och e-handel.' },
  { slug: 'malmo', name: 'Malmö', population: '350 000', region: 'Skåne', description: 'Skånes digitala centrum.', techDescription: 'Malmö är en hotspot för tech-startups med närheten till Köpenhamn och Media Evolution City som katalysatorer.' },
  { slug: 'uppsala', name: 'Uppsala', population: '230 000', region: 'Uppsala län', description: 'Universitetsstad med stark forskningskompetens.', techDescription: 'Uppsala kombinerar akademisk spets med företagsamhet. Flera framgångsrika tech-bolag har rötter här.' },
  { slug: 'linkoping', name: 'Linköping', population: '165 000', region: 'Östergötland', description: 'Östergötlands tech-centrum.', techDescription: 'Linköping har en stark IT-sektor med rötter i Linköpings universitet och närheten till Sectra och IFS.' },
  { slug: 'vasteras', name: 'Västerås', population: '155 000', region: 'Västmanland', description: 'Industristad med stark teknisk kompetens.', techDescription: 'Västerås har en lång tradition av teknisk innovation tack vare ABB och Mälardalens universitet.' },
  { slug: 'orebro', name: 'Örebro', population: '155 000', region: 'Örebro län', description: 'Centralt beläget nav i Mellansverige.', techDescription: 'Örebro har ett växande digitalt ekosystem med flera framgångsrika webbbyråer och IT-konsultbolag.' },
  { slug: 'norrkoping', name: 'Norrköping', population: '142 000', region: 'Östergötland', description: 'Visualiseringens huvudstad.', techDescription: 'Norrköping har positionerat sig som Sveriges visualiseringscentrum med Visualization Center C.' },
  { slug: 'helsingborg', name: 'Helsingborg', population: '145 000', region: 'Skåne', description: 'Skånes kreativa port.', techDescription: 'Helsingborg har på kort tid blivit en kreativ hub med co-working spaces och digitala byråer i Oceanhamnen.' },
  { slug: 'jonkoping', name: 'Jönköping', population: '140 000', region: 'Småland', description: 'Entreprenörsstad med stark företagartradition.', techDescription: 'Jönköping har en av Sveriges starkaste företagartraditioner. Jönköping University driver innovation i regionen.' },
  { slug: 'umea', name: 'Umeå', population: '130 000', region: 'Västerbotten', description: 'Norrlands digitala huvudstad.', techDescription: 'Umeå har en stark digital sektor driven av universitetet och en livlig startup-scen med fokus på design och UX.' },
  { slug: 'lund', name: 'Lund', population: '125 000', region: 'Skåne', description: 'Universitetsstad med världsledande forskning.', techDescription: 'Lund erbjuder världsledande forskning via Lunds universitet och Ideon Science Park – en av Europas äldsta tech-parker.' },
  { slug: 'gavle', name: 'Gävle', population: '102 000', region: 'Gävleborg', description: 'Norrlandskusten med starka kommunikationsbyråer.', techDescription: 'Gävle har en lång tradition av tryckerier och grafisk produktion samt växande digitala byråer.' },
  { slug: 'sundsvall', name: 'Sundsvall', population: '99 000', region: 'Västernorrland', description: 'Norrlands finanscentrum.', techDescription: 'Sundsvall är ett finanscentrum i Norrland med växande digital tjänstesektor och flera IT-konsultbolag.' },
  { slug: 'eskilstuna', name: 'Eskilstuna', population: '108 000', region: 'Södermanland', description: 'Mälardalens industri- och tekniska centrum.', techDescription: 'Eskilstuna har en stark tradition av tillverkning och växande digital sektor. Mälardalens universitet driver innovation.' },
  { slug: 'halmstad', name: 'Halmstad', population: '105 000', region: 'Halland', description: 'Hallands kreativa centrum.', techDescription: 'Halmstad har ett växande kluster av byråer inom digital marknadsföring, med fokus på e-handel och lokal synlighet.' },
  { slug: 'karlstad', name: 'Karlstad', population: '95 000', region: 'Värmland', description: 'Värmlands huvudstad med växande byråscen.', techDescription: 'Karlstad har en växande byråscen driven av Karlstads universitet och innovationsmiljöer som The Wood Region.' },
  { slug: 'vaxjo', name: 'Växjö', population: '95 000', region: 'Småland', description: 'Smålands digitala nav.', techDescription: 'Växjö är Smålands digitala nav med Linnéuniversitetet och starka byråer inom webb och design.' },
  { slug: 'sodertalje', name: 'Södertälje', population: '102 000', region: 'Stockholms län', description: 'Industristad i Storstockholm.', techDescription: 'Södertälje kombinerar storskalig industri (Scania, AstraZeneca) med växande digital sektor.' },
  { slug: 'lulea', name: 'Luleå', population: '79 000', region: 'Norrbotten', description: 'Norrbottens digitala centrum.', techDescription: 'Luleå är ett tech-nav i norr med Luleå tekniska universitet och framväxande datacenter-industri.' },
  { slug: 'boras', name: 'Borås', population: '115 000', region: 'Västra Götaland', description: 'Stark e-handelstradition.', techDescription: 'Borås är Sveriges textilhuvudstad och har en stark e-handelstradition med flera framgångsrika webbutiker.' },
  { slug: 'kristianstad', name: 'Kristianstad', population: '87 000', region: 'Skåne', description: 'Nordöstra Skånes nav.', techDescription: 'Kristianstad har en växande digital sektor med Högskolan Kristianstad som drivkraft för innovation.' },
  { slug: 'solna', name: 'Solna', population: '85 000', region: 'Stockholms län', description: 'Stockholms norra företagsnav.', techDescription: 'Solna är hem för många nordiska huvudkontor och har ett tätt kluster av digitala byråer kring Arenastaden och Solna Strand.' },
  { slug: 'skelleftea', name: 'Skellefteå', population: '76 000', region: 'Västerbotten', description: 'Norrlands nya tillväxtstad.', techDescription: 'Skellefteå växer snabbt tack vare Northvolt och en kraftig satsning på grön industri och digital infrastruktur.' },
  { slug: 'kalmar', name: 'Kalmar', population: '72 000', region: 'Småland', description: 'Östkuststad med kreativa byråer.', techDescription: 'Kalmar har en kreativ scen med Linnéuniversitetet och starka lokala byråer inom webb och varumärke.' },
]

// 10 service categories used for /byraer/{stad}/{kategori} programmatic pages
export interface ServiceCategoryData {
  slug: string
  name: string
  description: string
  shortName: string
  /** Maps to dbCategory in seoAgencyData / constants */
  dbCategory?: string
}

export const SERVICE_CATEGORIES: ServiceCategoryData[] = [
  { slug: 'webbutveckling', name: 'Webbutveckling', shortName: 'webbyrå', dbCategory: 'Webbutveckling', description: 'Webbutveckling handlar om att bygga moderna, snabba och konverterande webbplatser. Allt från enkla landningssidor till avancerade webbapplikationer med CMS, integrationer och databas.' },
  { slug: 'seo', name: 'SEO', shortName: 'SEO-byrå', dbCategory: 'SEO', description: 'SEO (sökmotoroptimering) ökar din synlighet i Google. En SEO-byrå arbetar med teknisk SEO, on-page-optimering, content och länkbyggande för att hjälpa dig ranka högre på relevanta sökord.' },
  { slug: 'ehandel', name: 'E-handel', shortName: 'e-handelsbyrå', dbCategory: 'E-handel', description: 'E-handelsbyråer bygger och driver webbutiker på plattformar som Shopify, WooCommerce och Centra. De hjälper dig med allt från första lansering till skalning, betalningsintegration och optimering av konvertering.' },
  { slug: 'digital-marknadsforing', name: 'Digital marknadsföring', shortName: 'marknadsföringsbyrå', dbCategory: 'Digital marknadsföring', description: 'Digital marknadsföring omfattar strategi, annonsering, SEO och analys. En byrå hjälper dig att nå rätt målgrupp via Google, Meta, LinkedIn och TikTok – med tydliga mål och uppföljning.' },
  { slug: 'apputveckling', name: 'Apputveckling', shortName: 'apputvecklare', dbCategory: 'Apputveckling', description: 'Apputveckling betyder att bygga mobilappar för iOS och Android – nativt eller med React Native och Flutter. Byråer hanterar UX, utveckling, testning och publicering i App Store och Google Play.' },
  { slug: 'grafisk-design', name: 'Grafisk design', shortName: 'designbyrå', dbCategory: 'Grafisk design/UX', description: 'Grafisk design omfattar varumärkesidentitet, logotyper, trycksaker och visuell kommunikation. En designbyrå arbetar med konceptutveckling och färdig produktion.' },
  { slug: 'google-ads', name: 'Google Ads', shortName: 'Google Ads-byrå', dbCategory: 'Google Ads', description: 'Google Ads-byråer bygger lönsamma kampanjer i Search, Display, YouTube och Shopping. De optimerar bud, kvalitetsresultat och målgrupper för bästa möjliga avkastning.' },
  { slug: 'e-postmarknadsforing', name: 'E-postmarknadsföring', shortName: 'e-postbyrå', dbCategory: 'Digital marknadsföring', description: 'E-postmarknadsföring är ett av de mest lönsamma kanalerna inom digital marknadsföring. Byråer hjälper med strategi, mallar, automation och analys i verktyg som Klaviyo, Mailchimp och Apsis.' },
  { slug: 'analys-data', name: 'Analys & data', shortName: 'analysbyrå', dbCategory: 'Digital marknadsföring', description: 'Analys- och databyråer hjälper dig fatta beslut på riktiga siffror. Setup av GA4, GTM, server-side tracking, dashboards i Looker Studio och custom-rapportering för marknad och produkt.' },
  { slug: 'ux-ui-design', name: 'UX/UI-design', shortName: 'UX-byrå', dbCategory: 'Grafisk design/UX', description: 'UX/UI-design handlar om att skapa digitala produkter som är enkla att använda och vackra att titta på. Byråer arbetar med användarforskning, wireframes, prototyper och designsystem.' },
]

// ───────────────────────────────────────────────────────
// Programmatic content generators (city × service)
// ───────────────────────────────────────────────────────

/** Price ranges per service category (used in unique content) */
export const PRICE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  'webbutveckling': { min: 25000, max: 250000, unit: 'projekt' },
  'seo': { min: 8000, max: 35000, unit: 'månad' },
  'ehandel': { min: 50000, max: 400000, unit: 'projekt' },
  'digital-marknadsforing': { min: 12000, max: 60000, unit: 'månad' },
  'apputveckling': { min: 150000, max: 1500000, unit: 'projekt' },
  'grafisk-design': { min: 15000, max: 120000, unit: 'projekt' },
  'google-ads': { min: 7000, max: 40000, unit: 'månad' },
  'e-postmarknadsforing': { min: 8000, max: 30000, unit: 'månad' },
  'analys-data': { min: 15000, max: 80000, unit: 'projekt' },
  'ux-ui-design': { min: 30000, max: 200000, unit: 'projekt' },
}

const fmtSek = (n: number) => n.toLocaleString('sv-SE').replace(/,/g, ' ')

export const getPriceCopy = (serviceSlug: string, cityName: string): string => {
  const r = PRICE_RANGES[serviceSlug]
  if (!r) return ''
  const localMod = ['Stockholm', 'Solna', 'Göteborg'].includes(cityName) ? 1.15 : 1
  const min = Math.round((r.min * localMod) / 1000) * 1000
  const max = Math.round((r.max * localMod) / 1000) * 1000
  return `${fmtSek(min)}–${fmtSek(max)} kr per ${r.unit}`
}

/** Project type examples per category */
const PROJECT_EXAMPLES: Record<string, string[]> = {
  'webbutveckling': ['Företagshemsida med CMS', 'Kampanjsidor och landningssidor', 'Webbapplikationer och kundportaler', 'Migrering från äldre plattform'],
  'seo': ['Teknisk SEO-revision', 'Innehållsstrategi och produktion', 'Lokal SEO med Google Business-optimering', 'Länkbyggande och digital PR'],
  'ehandel': ['Lansering på Shopify eller WooCommerce', 'Migrering från äldre system', 'Konverteringsoptimering av befintlig butik', 'Integration mot affärssystem och lager'],
  'digital-marknadsforing': ['Strategi och GTM-plan', 'Performance-annonsering på Meta och Google', 'Influencer- och content-kampanjer', 'Tillväxtarbete för B2B-leadgenerering'],
  'apputveckling': ['MVP för startup', 'Native iOS/Android-app för befintligt företag', 'Cross-platform med React Native', 'Underhåll och vidareutveckling'],
  'grafisk-design': ['Logotyp och visuell identitet', 'Förpackningsdesign', 'Trycksaker och årsredovisningar', 'Designsystem för digitala produkter'],
  'google-ads': ['Setup av Search-kampanjer', 'Performance Max för e-handel', 'YouTube-annonsering', 'Konton-revision och optimering'],
  'e-postmarknadsforing': ['Setup av Klaviyo eller Mailchimp', 'Welcome- och win-back-flöden', 'Nyhetsbrev och kampanjutskick', 'Segmentering och A/B-test'],
  'analys-data': ['GA4-implementation och migrering', 'Server-side tracking via GTM', 'Dashboards i Looker Studio', 'Attributionsmodellering'],
  'ux-ui-design': ['Användarforskning och intervjuer', 'Prototyper i Figma', 'Designsystem och komponentbibliotek', 'UX-revision av befintlig produkt'],
}

export const getProjectExamples = (serviceSlug: string): string[] =>
  PROJECT_EXAMPLES[serviceSlug] || ['Specifikation och förstudie', 'Implementation', 'Lansering och uppföljning']

/** Variation phrases keyed by population bucket */
const populationBucket = (pop: string): 'large' | 'mid' | 'small' => {
  const n = parseInt(pop.replace(/\D/g, ''), 10)
  if (n >= 300) return 'large'
  if (n >= 100) return 'mid'
  return 'small'
}

export const getCityIntroVariant = (city: CityData, service: ServiceCategoryData): string => {
  const bucket = populationBucket(city.population)
  const tone = bucket === 'large'
    ? `${city.name} är en av Sveriges största marknader för ${service.name.toLowerCase()}, vilket innebär att utbudet av byråer är stort och konkurrensen håller priser och kvalitet i schack.`
    : bucket === 'mid'
      ? `${city.name} har ett fokuserat utbud av byråer inom ${service.name.toLowerCase()} – ofta med tätare kundrelationer och kortare beslutsvägar än i de tre storstäderna.`
      : `${city.name} är en mindre marknad där lokala byråer inom ${service.name.toLowerCase()} ofta känner sina kunder personligen. Många levererar också på distans till hela landet.`
  return `${tone} ${city.techDescription}`
}

// ───────────────────────────────────────────────────────
// City hub (used by /stader/:city)
// ───────────────────────────────────────────────────────

export interface CityHubData {
  slug: string
  name: string
  metaTitle: string
  metaDesc: string
  h1: string
  intro: string
  description: string
  services: { name: string; href: string }[]
}

export const getCityHubData = (citySlug: string): CityHubData | undefined => {
  const city = CITIES.find(c => c.slug === citySlug)
  if (!city) return undefined
  return {
    slug: city.slug,
    name: city.name,
    metaTitle: `Digitala byråer i ${city.name} – Jämför offerter | Updro`,
    metaDesc: `Hitta de bästa digitala byråerna i ${city.name}. Webbutveckling, SEO, e-handel, apputveckling – jämför offerter kostnadsfritt.`,
    h1: `Digitala tjänster i ${city.name}`,
    intro: `${city.name} (${city.population} invånare, ${city.region}). ${city.description} ${city.techDescription} Via Updro jämför du offerter från kvalitetssäkrade byråer i ${city.name} – kostnadsfritt och utan förpliktelser.`,
    description: city.techDescription,
    services: SERVICE_CATEGORIES.map(s => ({
      name: `${s.name} i ${city.name}`,
      href: `/byraer/${city.slug}/${s.slug}`,
    })),
  }
}

export const getAllCityHubs = (): CityHubData[] => CITIES.map(c => getCityHubData(c.slug)!)

/** Find nearby cities (same region first, then by population) */
export const getNearbyCities = (citySlug: string, limit = 6): CityData[] => {
  const city = CITIES.find(c => c.slug === citySlug)
  if (!city) return []
  const sameRegion = CITIES.filter(c => c.slug !== city.slug && c.region === city.region)
  const others = CITIES.filter(c => c.slug !== city.slug && c.region !== city.region)
  return [...sameRegion, ...others].slice(0, limit)
}

// ───────────────────────────────────────────────────────
// Legacy helper – kept for backwards compatibility with SubPage.tsx
// which checks /:category/:sub for city × service overlap.
// New programmatic city × category pages live under /byraer/:stad/:kategori
// ───────────────────────────────────────────────────────
export interface LegacyCityServicePage {
  citySlug: string
  cityName: string
  serviceSlug: string
  serviceName: string
  metaTitle: string
  metaDesc: string
  h1: string
  intro: string
  sections: { heading: string; content: string }[]
  faq: { q: string; a: string }[]
  relatedLinks: { label: string; href: string }[]
}

export const findCityServicePage = (serviceSlug: string, citySlug: string): LegacyCityServicePage | undefined => {
  const city = CITIES.find(c => c.slug === citySlug)
  const service = SERVICE_CATEGORIES.find(s => s.slug === serviceSlug)
  if (!city || !service) return undefined
  return {
    citySlug: city.slug,
    cityName: city.name,
    serviceSlug: service.slug,
    serviceName: service.name,
    metaTitle: `${service.name} ${city.name} – Hitta byrå | Updro`,
    metaDesc: `Hitta byråer för ${service.name.toLowerCase()} i ${city.name}. Jämför offerter kostnadsfritt.`,
    h1: `${service.name} i ${city.name}`,
    intro: getCityIntroVariant(city, service),
    sections: [
      { heading: `${service.name} i ${city.name}`, content: `${city.name} (${city.population} invånare) har ett brett utbud av byråer som arbetar med ${service.name.toLowerCase()}. ${city.description}` },
      { heading: `Vad kostar ${service.name.toLowerCase()} i ${city.name}?`, content: `Räkna med ${getPriceCopy(service.slug, city.name)} för ${service.name.toLowerCase()} i ${city.name}. Det bästa sättet att hitta rätt pris är att jämföra minst tre offerter via Updro.` },
    ],
    faq: [
      { q: `Vad kostar ${service.name.toLowerCase()} i ${city.name}?`, a: `${getPriceCopy(service.slug, city.name)}. Jämför minst tre offerter via Updro för att hitta rätt pris.` },
    ],
    relatedLinks: [
      { label: `${service.name}`, href: `/${service.slug}` },
      { label: `Byråer i ${city.name}`, href: `/byraer/${city.slug}` },
    ],
  }
}
