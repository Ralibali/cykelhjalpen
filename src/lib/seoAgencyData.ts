// SEO data for /byraer routes, /leveranser, and /kunskapsbank

export interface SEOCity {
  slug: string
  name: string
  description: string
}

export interface SEOCategory {
  slug: string
  name: string
  description: string
  /** Maps to CATEGORIES in constants.ts for DB filtering */
  dbCategory?: string
}

export interface SEOService {
  slug: string
  name: string
  description: string
}

export interface SEOArticle {
  slug: string
  title: string
  metaTitle: string
  metaDesc: string
  publishedAt: string
  content: string // markdown placeholder
}

// ─── CITIES (25) ─── synced with seoCities.ts CITIES
export const SEO_CITIES: SEOCity[] = [
  { slug: 'stockholm', name: 'Stockholm', description: 'Sveriges huvudstad och digitala nav med hundratals byråer inom alla kategorier.' },
  { slug: 'goteborg', name: 'Göteborg', description: 'Västkustens kreativa centrum med stark design- och tech-tradition.' },
  { slug: 'malmo', name: 'Malmö', description: 'Skånes digitala centrum med växande startup-scen och kreativa byråer.' },
  { slug: 'uppsala', name: 'Uppsala', description: 'Universitetsstad med stark forsknings- och innovationskompetens.' },
  { slug: 'linkoping', name: 'Linköping', description: 'Östergötlands tech-centrum med stark IT-tradition och innovationskraft.' },
  { slug: 'vasteras', name: 'Västerås', description: 'Industristad med stark teknisk kompetens och innovationskultur.' },
  { slug: 'orebro', name: 'Örebro', description: 'Centralt beläget nav med växande digital sektor och flera kreativa byråer.' },
  { slug: 'norrkoping', name: 'Norrköping', description: 'Visualiseringens huvudstad med stark digital kompetens.' },
  { slug: 'helsingborg', name: 'Helsingborg', description: 'Skånes kreativa port med växande digital sektor.' },
  { slug: 'jonkoping', name: 'Jönköping', description: 'Entreprenörsstad med stark företagartradition och digital kompetens.' },
  { slug: 'umea', name: 'Umeå', description: 'Norrlands digitala huvudstad med fokus på design och användarupplevelse.' },
  { slug: 'lund', name: 'Lund', description: 'Universitetsstad med världsledande forskning och tech-innovation.' },
  { slug: 'gavle', name: 'Gävle', description: 'Norrlandskusten med starka digital- och kommunikationsbyråer.' },
  { slug: 'sundsvall', name: 'Sundsvall', description: 'Norrlands finanscentrum med växande digital tjänstesektor.' },
  { slug: 'eskilstuna', name: 'Eskilstuna', description: 'Mälardalens industri- och tekniska centrum med växande digital sektor.' },
  { slug: 'halmstad', name: 'Halmstad', description: 'Hallands kreativa centrum med fokus på digital marknadsföring.' },
  { slug: 'karlstad', name: 'Karlstad', description: 'Värmlands huvudstad med växande byråscen och innovation.' },
  { slug: 'vaxjo', name: 'Växjö', description: 'Smålands digitala nav med starka byråer inom webb och design.' },
  { slug: 'sodertalje', name: 'Södertälje', description: 'Industristad i Storstockholm med växande digitalt ekosystem.' },
  { slug: 'lulea', name: 'Luleå', description: 'Norrbottens digitala centrum med starka tech-företag.' },
  { slug: 'boras', name: 'Borås', description: 'Stad med stark e-handelstradition och växande digital sektor.' },
  { slug: 'kristianstad', name: 'Kristianstad', description: 'Nordöstra Skånes nav med växande digital sektor.' },
  { slug: 'solna', name: 'Solna', description: 'Stockholms norra företagsnav med tätt kluster av digitala byråer.' },
  { slug: 'skelleftea', name: 'Skellefteå', description: 'Norrlands nya tillväxtstad med växande digital sektor.' },
  { slug: 'kalmar', name: 'Kalmar', description: 'Östkuststad med kreativa byråer och stark lokal företagsamhet.' },
]

// ─── CATEGORIES for /byraer routes (10 primary + legacy) ───
// Synced with SERVICE_CATEGORIES in seoCities.ts so /byraer/:stad/:kategori works for the same slugs.
export const SEO_AGENCY_CATEGORIES: SEOCategory[] = [
  { slug: 'webbutveckling', name: 'Webbutveckling', description: 'Webbbyråer som bygger moderna, snabba och konverterande webbplatser.', dbCategory: 'Webbutveckling' },
  { slug: 'seo', name: 'SEO', description: 'SEO-byråer som hjälper dig ranka högre i Google.', dbCategory: 'SEO' },
  { slug: 'ehandel', name: 'E-handel', description: 'E-handelsbyråer som bygger, optimerar och driver webbutiker.', dbCategory: 'E-handel' },
  { slug: 'digital-marknadsforing', name: 'Digital marknadsföring', description: 'Byråer inom digital marknadsföring, annonsering och tillväxt.', dbCategory: 'Digital marknadsföring' },
  { slug: 'apputveckling', name: 'Apputveckling', description: 'Byråer som bygger mobilappar för iOS och Android, nativt eller cross-platform.', dbCategory: 'Apputveckling' },
  { slug: 'grafisk-design', name: 'Grafisk design', description: 'Byråer specialiserade på grafisk formgivning, varumärke och visuell identitet.', dbCategory: 'Grafisk design/UX' },
  { slug: 'google-ads', name: 'Google Ads', description: 'Google Ads-byråer som bygger lönsamma kampanjer i Search, Display, YouTube och Shopping.', dbCategory: 'Google Ads' },
  { slug: 'e-postmarknadsforing', name: 'E-postmarknadsföring', description: 'Byråer som arbetar med Klaviyo, Mailchimp och Apsis för automation och kampanjer.', dbCategory: 'Digital marknadsföring' },
  { slug: 'analys-data', name: 'Analys & data', description: 'Byråer som hjälper med GA4, GTM, server-side tracking och dashboards.', dbCategory: 'Digital marknadsföring' },
  { slug: 'ux-ui-design', name: 'UX/UI-design', description: 'UX-byråer som arbetar med användarforskning, prototyper och designsystem.', dbCategory: 'Grafisk design/UX' },
  // Legacy categories – behåll bakåtkompatibilitet med befintliga URL:er och DB-data
  { slug: 'design', name: 'Design', description: 'Designbyråer som arbetar med UX, UI, varumärke och visuell kommunikation.', dbCategory: 'Grafisk design/UX' },
  { slug: 'reklam', name: 'Reklam', description: 'Reklambyråer som skapar kampanjer och varumärkesstrategier.', dbCategory: 'Digital marknadsföring' },
  { slug: 'media', name: 'Media', description: 'Mediabyråer inom video, foto, sociala medier och innehållsproduktion.', dbCategory: 'Sociala medier' },
  { slug: 'kommunikation', name: 'Kommunikation', description: 'Kommunikationsbyråer som arbetar med PR, storytelling och intern kommunikation.', dbCategory: 'Varumärke & PR' },
  { slug: 'tryck', name: 'Tryck', description: 'Tryckerier och byråer som arbetar med tryckt material och förpackningsdesign.', dbCategory: 'Grafisk design/UX' },
  { slug: 'fotografering', name: 'Fotografering', description: 'Fotografer och fotobyråer för produktfoto, porträtt och eventfotografering.', dbCategory: 'Video & foto' },
  { slug: 'e-handel', name: 'E-handel (legacy)', description: 'E-handelsbyråer som bygger, optimerar och driver webbutiker.', dbCategory: 'E-handel' },
  { slug: 'pr', name: 'PR', description: 'PR-byråer som arbetar med medierelationer och opinionsbildning.', dbCategory: 'Varumärke & PR' },
  { slug: 'webb', name: 'Webb', description: 'Webbbyråer som bygger moderna, snabba och konverterande webbplatser.', dbCategory: 'Webbutveckling' },
]

// Primary categories shown in city pages (the 10 from SERVICE_CATEGORIES)
export const PRIMARY_CATEGORY_SLUGS = [
  'webbutveckling', 'seo', 'ehandel', 'digital-marknadsforing', 'apputveckling',
  'grafisk-design', 'google-ads', 'e-postmarknadsforing', 'analys-data', 'ux-ui-design',
]

// ─── LEVERANSER / SERVICES (11) ───
export const SEO_SERVICES: SEOService[] = [
  { slug: 'animering-animationer', name: 'Animering & animationer', description: 'Professionella animationer för webb, video och sociala medier. Engagera din målgrupp med rörlig grafik.' },
  { slug: 'guerilla-marketing', name: 'Guerilla marketing', description: 'Kreativ marknadsföring som sticker ut. Okonventionella kampanjer som skapar buzz och engagemang.' },
  { slug: 'digital-marknadsforing', name: 'Digital marknadsföring', description: 'Komplett digital marknadsföring med strategi, annonsering och analys för maximal avkastning.' },
  { slug: 'seo-tjanster', name: 'SEO-tjänster', description: 'Sökmotoroptimering som ökar din synlighet i Google. Teknisk SEO, innehåll och länkbyggande.' },
  { slug: 'social-media-annonsering', name: 'Social media-annonsering', description: 'Annonsering på Facebook, Instagram, LinkedIn och TikTok med fokus på konvertering och ROI.' },
  { slug: 'konverteringsoptimering', name: 'Konverteringsoptimering', description: 'CRO – optimera din webbplats för fler konverteringar, leads och försäljning.' },
  { slug: 'affiliate-marknadsforing', name: 'Affiliate-marknadsföring', description: 'Skala din försäljning med affiliate-program och prestationsbaserad marknadsföring.' },
  { slug: 'e-handel-marknadsforing', name: 'E-handel marknadsföring', description: 'Specialiserad marknadsföring för webbutiker – Google Shopping, retargeting och produktflöden.' },
  { slug: 'data-migrering', name: 'Data-migrering', description: 'Säker och smidig migrering av data mellan system, plattformar och databaser.' },
  { slug: 'bokomslag-design', name: 'Bokomslag-design', description: 'Professionell design av bokomslag som fångar uppmärksamhet och säljer.' },
  { slug: 'albumomslag-design', name: 'Albumomslag-design', description: 'Kreativ design av albumomslag för musik – vinyl, CD och digital distribution.' },
]

// ─── KUNSKAPSBANK ARTICLES (6) ───
export const SEO_KNOWLEDGE_ARTICLES: SEOArticle[] = [
  {
    slug: 'skapa-hemsida-med-egen-doman',
    title: 'Skapa hemsida med egen domän',
    metaTitle: 'Skapa hemsida med egen domän – Guide 2026 | Updro',
    metaDesc: 'Lär dig hur du skapar en professionell hemsida med egen domän. Steg-för-steg-guide med tips om val av plattform och domän.',
    publishedAt: '2026-03-01',
    content: '<!-- Fyll i innehåll här -->\n\nDen här guiden hjälper dig skapa en professionell hemsida med din egen domän.\n\n## Varför egen domän?\n\nEn egen domän ger ditt företag trovärdighet och professionellt intryck.\n\n## Steg för steg\n\n1. Välj domännamn\n2. Registrera domänen\n3. Välj webbhotell\n4. Bygg din hemsida\n5. Publicera\n\n---\n\n*Vill du ha hjälp? Publicera ditt uppdrag på Updro och jämför offerter från kvalificerade webbbyråer.*',
  },
  {
    slug: 'hjalp-med-hemsida',
    title: 'Hjälp med hemsida – Var hittar du rätt byrå?',
    metaTitle: 'Hjälp med hemsida – Hitta rätt byrå | Updro',
    metaDesc: 'Behöver du hjälp med din hemsida? Läs vår guide om hur du hittar rätt byrå och vad det kostar.',
    publishedAt: '2026-03-01',
    content: '<!-- Fyll i innehåll här -->\n\nAtt hitta rätt hjälp med din hemsida kan vara utmanande. Här guidar vi dig.\n\n## När behöver du professionell hjälp?\n\n## Hur mycket kostar det?\n\n## Så jämför du byråer\n\n---\n\n*Publicera ditt uppdrag på Updro och få offerter från kvalificerade byråer.*',
  },
  {
    slug: 'konsult-marknadsforing',
    title: 'Konsult inom marknadsföring – Guide',
    metaTitle: 'Konsult marknadsföring – Hitta rätt expert | Updro',
    metaDesc: 'Hitta en konsult inom marknadsföring. Lär dig vad en marknadsföringskonsult gör och hur du väljer rätt.',
    publishedAt: '2026-03-01',
    content: '<!-- Fyll i innehåll här -->\n\nEn konsult inom marknadsföring kan vara nyckeln till att nå dina affärsmål.\n\n## Vad gör en marknadsföringskonsult?\n\n## Vad kostar det?\n\n## Så hittar du rätt konsult\n\n---\n\n*Jämför konsulter och byråer via Updro – helt gratis.*',
  },
  {
    slug: 'hitta-grafisk-designer',
    title: 'Hitta grafisk designer – Tips & guide',
    metaTitle: 'Hitta grafisk designer – Guide 2026 | Updro',
    metaDesc: 'Letar du efter en grafisk designer? Här får du tips på hur du hittar och väljer rätt formgivare.',
    publishedAt: '2026-03-01',
    content: '<!-- Fyll i innehåll här -->\n\nEn bra grafisk designer kan lyfta ditt varumärke till nästa nivå.\n\n## Vad gör en grafisk designer?\n\n## Portfolio – det viktigaste att kolla på\n\n## Priser och budgetar\n\n---\n\n*Hitta rätt designer via Updro.*',
  },
  {
    slug: 'frilansa-som-designer',
    title: 'Frilansa som designer – Komplett guide',
    metaTitle: 'Frilansa som designer – Guide & tips | Updro',
    metaDesc: 'Vill du frilansa som designer? Lär dig allt om att starta eget, hitta kunder och sätta rätt priser.',
    publishedAt: '2026-03-01',
    content: '<!-- Fyll i innehåll här -->\n\nAtt frilansa som designer ger dig frihet och flexibilitet.\n\n## Kom igång som frilansare\n\n## Hitta dina första kunder\n\n## Prissättning\n\n---\n\n*Registrera dig som byrå på Updro och få uppdrag direkt.*',
  },
  {
    slug: 'kostnad-ny-hemsida',
    title: 'Vad kostar en ny hemsida 2026?',
    metaTitle: 'Kostnad ny hemsida 2026 – Prisguide | Updro',
    metaDesc: 'Vad kostar en ny hemsida? Vi går igenom priser för olika typer av webbplatser och vad som påverkar kostnaden.',
    publishedAt: '2026-03-01',
    content: '<!-- Fyll i innehåll här -->\n\nPriset för en ny hemsida varierar enormt beroende på dina behov.\n\n## Prisöversikt\n\n| Typ | Pris |\n|---|---|\n| Enkel hemsida | 15 000–40 000 kr |\n| Företagssida med CMS | 30 000–100 000 kr |\n| E-handel | 50 000–200 000+ kr |\n| Webbapplikation | 80 000–500 000+ kr |\n\n## Vad påverkar priset?\n\n---\n\n*Jämför offerter gratis via Updro och spara upp till 40%.*',
  },
]

// ─── PRIORITY COMBOS (stad+kategori with extra content) ───
export const PRIORITY_COMBOS: { citySlug: string; categorySlug: string; extraContent: string }[] = [
  { citySlug: 'linkoping', categorySlug: 'design', extraContent: 'Linköping har en stark design-tradition med rötter i Linköpings universitet. Här hittar du byråer som kombinerar akademisk spets med kreativ design.' },
  { citySlug: 'norrkoping', categorySlug: 'media', extraContent: 'Norrköping är känt som visualiseringens huvudstad. Mediabyråer här erbjuder unik kompetens inom rörlig bild och digital storytelling.' },
  { citySlug: 'helsingborg', categorySlug: 'reklam', extraContent: 'Helsingborg har på kort tid blivit en kreativ hub med starka reklambyråer som levererar kampanjer för både lokala och nationella varumärken.' },
  { citySlug: 'halmstad', categorySlug: 'digital-marknadsforing', extraContent: 'Halmstad har ett växande kluster av byråer inom digital marknadsföring, med fokus på e-handel och lokal synlighet.' },
  { citySlug: 'linkoping', categorySlug: 'tryck', extraContent: 'Linköpings tryckbyråer erbjuder allt från visitkort till storskalig produktion med hög kvalitet och snabba leveranser.' },
  { citySlug: 'gavle', categorySlug: 'tryck', extraContent: 'Gävle har en lång tradition av tryckerier och grafisk produktion. Här hittar du byråer med bred kompetens inom print och förpackning.' },
  { citySlug: 'jonkoping', categorySlug: 'grafisk-design', extraContent: 'Jönköpings starka företagartradition har skapat en blomstrande scen för grafisk design. Byråer här arbetar nära lokala företag med varumärke och identitet.' },
  { citySlug: 'orebro', categorySlug: 'digital-marknadsforing', extraContent: 'Örebros centrala läge gör det till ett nav för digitala byråer som betjänar kunder i hela Mellansverige.' },
  { citySlug: 'malmo', categorySlug: 'media', extraContent: 'Malmö har en dynamisk mediascen med byråer som arbetar med allt från dokumentärfilm till social media-produktion.' },
  { citySlug: 'goteborg', categorySlug: 'media', extraContent: 'Göteborg är Västkustens kreativa centrum med mediabyråer kända för sin innovativa approach till content och storytelling.' },
]

// ─── HELPERS ───
export const getCityBySlug = (slug: string) => SEO_CITIES.find(c => c.slug === slug)
export const getCategoryBySlug = (slug: string) => SEO_AGENCY_CATEGORIES.find(c => c.slug === slug)
export const getServiceBySlug = (slug: string) => SEO_SERVICES.find(s => s.slug === slug)
export const getKnowledgeArticle = (slug: string) => SEO_KNOWLEDGE_ARTICLES.find(a => a.slug === slug)
export const getPriorityCombo = (citySlug: string, catSlug: string) => PRIORITY_COMBOS.find(c => c.citySlug === citySlug && c.categorySlug === catSlug)

export const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
