export interface ToolPage {
  slug: string
  metaTitle: string
  metaDesc: string
  h1: string
  intro: string
  description: string
  relatedLinks: { label: string; href: string }[]
}

export const TOOLS: ToolPage[] = [
  {
    slug: 'hemsida-pris-kalkylator',
    metaTitle: 'Hemsida pris kalkylator – Beräkna kostnaden | Updro',
    metaDesc: 'Beräkna vad din hemsida kostar med vår gratis kalkylator. Få en prisuppskattning baserad på dina behov.',
    h1: 'Hemsida pris kalkylator',
    intro: 'Vill du veta vad din hemsida kommer att kosta? Använd vår gratis kalkylator för att få en prisuppskattning baserad på dina specifika behov.',
    description: 'Vår kalkylator tar hänsyn till antal sidor, funktionalitet, design-nivå och CMS-val för att ge dig en realistisk prisuppskattning. Du kan sedan jämföra med riktiga offerter via Updro.',
    relatedLinks: [
      { label: 'Webbutveckling pris', href: '/webbutveckling/pris' },
      { label: 'Vad kostar en hemsida?', href: '/artiklar/vad-kostar-en-hemsida-2026' },
    ]
  },
  {
    slug: 'seo-analys',
    metaTitle: 'Gratis SEO-analys – Analysera din sajt | Updro',
    metaDesc: 'Gratis SEO-analys av din webbplats. Se hur din sajt presterar i sökmotorer och få förbättringsförslag.',
    h1: 'Gratis SEO-analys',
    intro: 'Hur bra presterar din webbplats i sökmotorer? Vår gratis SEO-analys ger dig en snabb överblick och konkreta förbättringsförslag.',
    description: 'Vi analyserar teknisk SEO (hastighet, mobilanpassning), on-page SEO (meta-taggar, rubriker) och ger dig en poäng samt prioriterade åtgärder.',
    relatedLinks: [
      { label: 'SEO', href: '/seo' },
      { label: 'SEO pris', href: '/seo/pris' },
      { label: 'SEO-analys tjänst', href: '/seo/analys' },
    ]
  },
  {
    slug: 'roi-kalkylator-marknadsforing',
    metaTitle: 'ROI-kalkylator för marknadsföring | Updro',
    metaDesc: 'Beräkna ROI för din digitala marknadsföring. Gratis kalkylator för SEO, Google Ads och sociala medier.',
    h1: 'ROI-kalkylator för digital marknadsföring',
    intro: 'Hur mycket avkastning ger din marknadsföring? Använd vår gratis ROI-kalkylator för att beräkna avkastningen på dina digitala investeringar.',
    description: 'Ange din investering, antal leads och konverteringsgrad så beräknar vi din ROI. Perfekt för att jämföra olika kanaler och optimera din budget.',
    relatedLinks: [
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
      { label: 'Digital marknadsföring pris', href: '/digital-marknadsforing/pris' },
    ]
  },
  {
    slug: 'social-media-budget',
    metaTitle: 'Social media budget kalkylator | Updro',
    metaDesc: 'Beräkna din budget för sociala medier. Gratis kalkylator baserad på dina mål och bransch.',
    h1: 'Social media budget kalkylator',
    intro: 'Hur mycket bör du lägga på sociala medier? Vår kalkylator hjälper dig att beräkna en realistisk budget baserad på dina mål.',
    description: 'Baserat på din bransch, målgrupp och mål (varumärke, leads, försäljning) beräknar vi en rekommenderad månadsbudget för organiskt och betalt.',
    relatedLinks: [
      { label: 'Sociala medier', href: '/sociala-medier' },
      { label: 'Digital marknadsföring', href: '/digital-marknadsforing' },
    ]
  },
]

export const findTool = (slug: string) => TOOLS.find(t => t.slug === slug)
