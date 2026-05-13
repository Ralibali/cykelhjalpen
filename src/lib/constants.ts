export const CATEGORIES = [
  'Webbutveckling', 'E-handel', 'Digital marknadsföring',
  'Grafisk design/UX', 'SEO', 'App-utveckling',
  'IT-konsult', 'Sociala medier',
  // New categories
  'Mjukvaruutveckling', 'Video & foto', 'Varumärke & PR',
  'UX/Webbdesign', 'Underhåll/IT Support', 'Affärsutveckling', 'AI-utveckling',
] as const

export const NEW_CATEGORIES = new Set([
  'Mjukvaruutveckling', 'Video & foto', 'Varumärke & PR',
  'UX/Webbdesign', 'Underhåll/IT Support', 'Affärsutveckling', 'AI-utveckling',
])

export const CATEGORY_ICONS: Record<string, string> = {
  'Webbutveckling': '🌐',
  'E-handel': '🛒',
  'Digital marknadsföring': '📈',
  'Grafisk design/UX': '🎨',
  'SEO': '🔍',
  'App-utveckling': '📱',
  'IT-konsult': '💻',
  'Sociala medier': '📣',
  'Mjukvaruutveckling': '⚙️',
  'Video & foto': '🎬',
  'Varumärke & PR': '📰',
  'UX/Webbdesign': '✏️',
  'Underhåll/IT Support': '🛠️',
  'Affärsutveckling': '🚀',
  'AI-utveckling': '🤖',
}

export const CATEGORY_STYLES: Record<string, string> = {
  'Webbutveckling': 'bg-blue-50 text-blue-700 border border-blue-200',
  'E-handel': 'bg-violet-50 text-violet-700 border border-violet-200',
  'Digital marknadsföring': 'bg-orange-50 text-orange-700 border border-orange-200',
  'Grafisk design/UX': 'bg-pink-50 text-pink-700 border border-pink-200',
  'SEO': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'App-utveckling': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'IT-konsult': 'bg-slate-50 text-slate-700 border border-slate-200',
  'Sociala medier': 'bg-rose-50 text-rose-700 border border-rose-200',
  'Mjukvaruutveckling': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  'Video & foto': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Varumärke & PR': 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
  'UX/Webbdesign': 'bg-teal-50 text-teal-700 border border-teal-200',
  'Underhåll/IT Support': 'bg-gray-50 text-gray-700 border border-gray-200',
  'Affärsutveckling': 'bg-lime-50 text-lime-700 border border-lime-200',
  'AI-utveckling': 'bg-purple-50 text-purple-700 border border-purple-200',
}

export const CATEGORY_COVER_IMAGES: Record<string, string> = {
  'Webbutveckling': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=300&fit=crop',
  'E-handel': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop',
  'Digital marknadsföring': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop',
  'Grafisk design/UX': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=300&fit=crop',
  'SEO': 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=600&h=300&fit=crop',
  'App-utveckling': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=300&fit=crop',
  'IT-konsult': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=300&fit=crop',
  'Sociala medier': 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=300&fit=crop',
  'Mjukvaruutveckling': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=300&fit=crop',
  'Video & foto': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=300&fit=crop',
  'Varumärke & PR': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=300&fit=crop',
  'UX/Webbdesign': 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=600&h=300&fit=crop',
  'Underhåll/IT Support': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=300&fit=crop',
  'Affärsutveckling': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop',
  'AI-utveckling': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=300&fit=crop',
}

export const BUDGET_LABELS: Record<string, string> = {
  under_10k: 'Under 10 000 kr',
  '10k_50k': '10 000 – 50 000 kr',
  '50k_150k': '50 000 – 150 000 kr',
  over_150k: 'Över 150 000 kr',
  unknown: 'Vet ej / Diskuteras',
}

export const BUDGET_OPTIONS = [
  { value: 'under_10k', label: 'Under 10 000 kr', icon: '💰' },
  { value: '10k_50k', label: '10 000 – 50 000 kr', icon: '💰💰' },
  { value: '50k_150k', label: '50 000 – 150 000 kr', icon: '💰💰💰' },
  { value: 'over_150k', label: 'Över 150 000 kr', icon: '💰💰💰💰' },
  { value: 'unknown', label: 'Vet ej / Diskuteras', icon: '🤷' },
]

export const START_TIME_OPTIONS = [
  { value: 'asap', label: 'Snarast möjligt', icon: '🚀' },
  { value: 'within_month', label: 'Inom en månad', icon: '📅' },
  { value: 'within_3months', label: 'Inom tre månader', icon: '🗓️' },
  { value: 'flexible', label: 'Flexibelt', icon: '🕐' },
]

export const START_TIME_LABELS: Record<string, string> = {
  asap: 'Snarast möjligt',
  within_month: 'Inom en månad',
  within_3months: 'Inom tre månader',
  flexible: 'Flexibelt',
}

export const TRIAL_LEADS = 5
export const TRIAL_DAYS = 7
export const REFERRAL_CREDITS = 3
export const MAX_OFFERS_PER_PROJECT = 5

// Stripe product/price mapping
export const STRIPE_PRODUCTS = {
  monthly: {
    product_id: 'prod_UNNHPlzFIuEL0e',
    price_id: 'price_1TOcX1HzffTezY8204n36Q31',
    name: 'Månadskort',
    price: 1995,
    per: '/månad',
    mode: 'subscription' as const,
  },
  lead: {
    product_id: 'prod_UNNHEXppo9nyyz',
    price_id: 'price_1TOcX2HzffTezY82yzbAX5ZD',
    name: 'Enskilt lead',
    price: 119,
    per: 'per lead',
    mode: 'payment' as const,
  },
} as const

export const PLANS = [
  {
    id: 'lead' as const,
    name: 'Pay per lead',
    price: 119,
    per: 'per lead',
    features: [
      'Betala bara för leads du väljer',
      'Fullständig offert-funktion',
      'Inbyggd chatt med beställare',
      'Inga bindningstider',
    ],
    cta: 'Köp lead',
    highlighted: false,
  },
  {
    id: 'monthly' as const,
    name: 'Månadskort',
    price: 1995,
    per: '/månad',
    features: [
      'Obegränsade leads – svara på allt',
      'Profilsida med logotyp & portfolio',
      'Framhävd profil i sökning',
      'Statistik & insikter',
      'Prioriterad support',
      'Ingen bindningstid',
    ],
    cta: 'Starta månadskort',
    highlighted: true,
    badge: 'Bäst värde',
  },
]

export const PROJECT_TEMPLATES: Record<string, { id: string; name: string; icon: string; title: string; description: string; budget_hint: string }[]> = {
  'Webbutveckling': [
    {
      id: 'web_basic',
      name: 'Grundläggande hemsida',
      icon: '🌐',
      title: 'Ny hemsida för mitt företag',
      description: `Vi behöver en ny hemsida för vårt företag.\n\nVad vi behöver:\n- Startsida med presentation av företaget\n- Om oss-sida\n- Tjänster/produktsida\n- Kontaktsida med formulär\n- Responsiv design (mobil + desktop)\n- Grundläggande SEO-optimering`,
      budget_hint: '10k_50k',
    },
    {
      id: 'web_redesign',
      name: 'Omdesign av befintlig site',
      icon: '🔄',
      title: 'Omdesign av vår befintliga hemsida',
      description: `Vi vill modernisera vår befintliga hemsida.\n\nVad vi vill förbättra:\n- Modern, fräsch design\n- Bättre användarupplevelse (UX)\n- Snabbare laddtider\n- Bättre mobilanpassning`,
      budget_hint: '10k_50k',
    },
    {
      id: 'web_landing',
      name: 'Landningssida',
      icon: '🎯',
      title: 'Landningssida för kampanj',
      description: `Vi behöver en konverteringsoptimerad landningssida.\n\nInnehåll:\n- Hero-sektion med tydlig CTA\n- Fördelar/features-sektion\n- Testimonials/omdömen\n- FAQ\n- Kontaktformulär`,
      budget_hint: 'under_10k',
    },
  ],
  'E-handel': [
    {
      id: 'ecom_new',
      name: 'Ny webbutik',
      icon: '🛒',
      title: 'Ny e-handelssajt',
      description: `Vi vill starta en webbutik.\n\nFunktioner vi behöver:\n- Produktkatalog med kategorier\n- Varukorg och checkout\n- Betalning via Swish, kort, Klarna\n- Fraktintegration\n- Lagerhantering`,
      budget_hint: '10k_50k',
    },
    {
      id: 'ecom_optimize',
      name: 'Optimera befintlig butik',
      icon: '📈',
      title: 'Optimering av befintlig e-handel',
      description: `Vi har en befintlig webbutik som behöver förbättras.\n\nUtmaningar:\n- Låg konverteringsgrad\n- Krånglig checkout\n- Dålig mobilupplevelse\n- Långsam laddning`,
      budget_hint: '10k_50k',
    },
  ],
  'Digital marknadsföring': [
    {
      id: 'marketing_google',
      name: 'Google Ads-kampanj',
      icon: '🎯',
      title: 'Google Ads-hantering',
      description: `Vi vill köra Google Ads för att generera fler leads.\n\nMål:\n- Generera leads via kontaktformulär\n- Öka försäljning\n- Driva trafik till specifik landningssida`,
      budget_hint: '10k_50k',
    },
    {
      id: 'marketing_social',
      name: 'Social media-strategi',
      icon: '📣',
      title: 'Social media-hantering',
      description: `Vi behöver hjälp med vår närvaro på sociala medier.\n\nVad vi söker:\n- Strategi och innehållsplan\n- Produktion av inlägg\n- Schemaläggning och publicering\n- Löpande analys och optimering`,
      budget_hint: '10k_50k',
    },
  ],
  'SEO': [
    {
      id: 'seo_full',
      name: 'Komplett SEO-paket',
      icon: '🔍',
      title: 'SEO-optimering för vår webbplats',
      description: `Vi vill förbättra vår synlighet i Google.\n\nVad vi söker:\n- Teknisk SEO-analys\n- Sökordsanalys\n- On-page optimering\n- Innehållsstrategi\n- Länkbyggande\n- Löpande rapportering`,
      budget_hint: '10k_50k',
    },
  ],
  'Grafisk design/UX': [
    {
      id: 'design_brand',
      name: 'Grafisk profil',
      icon: '🎨',
      title: 'Grafisk profil för vårt företag',
      description: `Vi behöver en komplett grafisk profil.\n\nVad vi behöver:\n- Logotyp (primär + varianter)\n- Färgpalett\n- Typografi\n- Grafiska element\n- Visitkort\n- Briefmall`,
      budget_hint: '10k_50k',
    },
  ],
  'App-utveckling': [
    {
      id: 'app_mvp',
      name: 'MVP-app',
      icon: '📱',
      title: 'MVP-app för vår idé',
      description: `Vi vill bygga en mobilapp.\n\nPlattform: iOS / Android / Båda\n\nKärnfunktioner för MVP:\n1. [Funktion 1]\n2. [Funktion 2]\n3. [Funktion 3]`,
      budget_hint: '50k_150k',
    },
  ],
  'IT-konsult': [
    {
      id: 'it_consulting',
      name: 'IT-konsult',
      icon: '💻',
      title: 'IT-konsult för vårt projekt',
      description: `Vi söker en IT-konsult.\n\nUppdragstyp: Löpande / Projektbaserat / Teknisk rådgivning\n\nOmråde:\n- Systemarkitektur\n- Molnmigrering\n- Säkerhet\n- Integrationer`,
      budget_hint: '50k_150k',
    },
  ],
  'Sociala medier': [
    {
      id: 'social_content',
      name: 'Innehållsproduktion',
      icon: '📸',
      title: 'Innehållsproduktion för sociala medier',
      description: `Vi behöver löpande innehåll till våra sociala kanaler.\n\nVi söker:\n- Planering av innehållskalender\n- Produktion av inlägg\n- Copywriting\n- Stories/reels-produktion`,
      budget_hint: '10k_50k',
    },
  ],
  'AI-utveckling': [
    {
      id: 'ai_chatbot',
      name: 'AI-chatbot',
      icon: '🤖',
      title: 'AI-chatbot för kundtjänst',
      description: `Vi vill bygga en AI-driven chatbot.\n\nFunktioner:\n- Automatiserad kundtjänst\n- Integration med befintligt CRM\n- Flerspråkigt stöd\n- Eskalering till människa`,
      budget_hint: '50k_150k',
    },
  ],
}
