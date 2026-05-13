// Lokal fallback-analys för AI-projektbrief.
// Används när edge function analyze-brief inte är tillgänglig.

import type { Category, BudgetRange, StartTime } from '@/types'

export interface BriefSuggestion {
  category: Category
  title: string
  description: string
  budget_range: BudgetRange
  start_time: StartTime
  requirements: string[]
  questions_for_agencies: string[]
  lead_score: number
  estimated_matching_agencies: number
}

const CATEGORY_KEYWORDS: Array<{ cat: Category; words: string[] }> = [
  { cat: 'SEO', words: ['seo', 'ranking', 'sökord', 'google sök', 'organisk', 'sökmotor'] },
  { cat: 'E-handel', words: ['shopify', 'webbutik', 'klarna', 'checkout', 'e-handel', 'woocommerce', 'butik online'] },
  { cat: 'App-utveckling', words: ['app', 'ios', 'android', 'mobilapp', 'react native', 'flutter'] },
  { cat: 'AI-utveckling', words: ['ai ', 'chatbot', 'chattbot', 'automation', 'maskininlärning', 'gpt', 'llm'] },
  { cat: 'Digital marknadsföring', words: ['annonser', 'google ads', 'meta ads', 'facebook ads', 'kampanj', 'ppc'] },
  { cat: 'Grafisk design/UX', words: ['logga', 'logotyp', 'grafisk profil', 'figma', 'ux', 'ui design', 'designsystem'] },
  { cat: 'Sociala medier', words: ['instagram', 'tiktok', 'linkedin', 'sociala medier', 'social media'] },
  { cat: 'Video & foto', words: ['video', 'film', 'foto', 'fotografering', 'reklamfilm'] },
  { cat: 'Webbutveckling', words: ['hemsida', 'website', 'webbplats', 'wordpress', 'react', 'next.js', 'webbsida'] },
]

const inferCategory = (lower: string): Category => {
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    if (words.some(w => lower.includes(w))) return cat
  }
  return 'Webbutveckling'
}

const inferBudget = (lower: string): BudgetRange => {
  if (/\b200\s*0{3}\b|200k|över\s*150|200\s*tkr|300k|500k|1\s*miljon|miljonbudget/.test(lower)) return 'over_150k'
  if (/50k.*150k|50\s*000.*150\s*000|100k|150k|100\s*tkr/.test(lower)) return '50k_150k'
  if (/10k.*50k|10\s*000.*50\s*000|20k|30k|40k|50k/.test(lower)) return '10k_50k'
  if (/under\s*10|under\s*tio|liten budget|<\s*10/.test(lower)) return 'under_10k'
  return 'unknown'
}

const inferStartTime = (lower: string): StartTime => {
  if (/snarast|akut|omgående|asap|nu på en gång|denna vecka|inom\s+några\s+dagar/.test(lower)) return 'asap'
  if (/inom\s+en\s+månad|några\s+veckor|nästa\s+månad|inom\s+4\s+veckor/.test(lower)) return 'within_month'
  if (/3\s*månader|kvartal|inom\s+ett\s+kvartal|tre\s+månader/.test(lower)) return 'within_3months'
  return 'flexible'
}

const buildTitle = (description: string, category: Category): string => {
  const cleaned = description.trim().replace(/\s+/g, ' ')
  if (!cleaned) return `Nytt uppdrag inom ${category}`
  const sentence = cleaned.split(/[.!?\n]/)[0]?.trim() || cleaned
  const truncated = sentence.length > 80 ? `${sentence.slice(0, 77)}...` : sentence
  return truncated
}

const buildRequirements = (category: Category): string[] => {
  const base: Record<string, string[]> = {
    'Webbutveckling': ['Responsiv design', 'CMS för innehållshantering', 'SEO-grunder', 'Snabba laddningstider'],
    'E-handel': ['Säker betalning (Klarna/Stripe)', 'Lagerhantering', 'Mobiloptimerad checkout', 'Produktfilter'],
    'SEO': ['Teknisk SEO-revision', 'Sökordsanalys', 'On-page optimering', 'Månatlig rapportering'],
    'App-utveckling': ['Stöd för iOS och Android', 'Push-notiser', 'Offline-läge', 'Onboarding-flöde'],
    'AI-utveckling': ['Integrationer mot befintliga system', 'Säker datahantering', 'Modellval & prompts', 'Loggning av användning'],
    'Digital marknadsföring': ['Mätbart ROAS-mål', 'Konverteringsspårning', 'A/B-tester', 'Månadsrapport'],
    'Grafisk design/UX': ['Visuell identitet', 'Logotyp i flera format', 'Designsystem', 'UX-prototyp'],
    'Sociala medier': ['Innehållskalender', 'Community management', 'Statistikrapport', 'Story/Reels-produktion'],
    'Mjukvaruutveckling': ['Tydlig kravspecifikation', 'Testautomation', 'Versionshantering', 'CI/CD'],
    'Video & foto': ['Storyboard/manus', 'Råmaterial och slutfiler', 'Färgkorrigering', 'Format för flera kanaler'],
    'Varumärke & PR': ['Tonalitet och budskap', 'Pressmaterial', 'Mediekontakter', 'Mätning av synlighet'],
    'UX/Webbdesign': ['Användarintervjuer', 'Wireframes', 'Designsystem', 'Testbarhet på mobil'],
    'Underhåll/IT Support': ['SLA-tider', 'Säkerhetsuppdateringar', 'Backuprutiner', 'Felrapportering'],
    'Affärsutveckling': ['Marknadsanalys', 'Affärsmodellgenomgång', 'KPI-er', 'Implementationsplan'],
    'IT-konsult': ['Tydligt scope', 'Senior kompetens', 'Dokumentation', 'Kunskapsöverföring'],
  }
  return base[category] || ['Tydligt scope', 'Tidplan', 'Pris och betalningsplan', 'Dokumentation']
}

const buildQuestions = (category: Category): string[] => {
  const base: Record<string, string[]> = {
    'Webbutveckling': ['Finns befintlig design eller vill ni att vi tar fram?', 'Vilket CMS föredrar ni?', 'Vilka integrationer behövs?'],
    'E-handel': ['Hur många produkter ska säljas?', 'Vilka betalsätt ska stödjas?', 'Hur sköts lager och frakt idag?'],
    'SEO': ['Vilka är era viktigaste sökord idag?', 'Har ni tidigare arbetat med SEO?', 'Vilka konkurrenter vill ni mäta er mot?'],
    'App-utveckling': ['Är det iOS, Android eller båda?', 'Behövs en backend?', 'Vilka tredjepartstjänster ska integreras?'],
    'AI-utveckling': ['Vilken data finns tillgänglig?', 'Vilka säkerhetskrav gäller?', 'Vilket användningsfall är viktigast?'],
    'Digital marknadsföring': ['Vilken är er nuvarande månadsbudget?', 'Vilka kanaler vill ni prioritera?', 'Vilket är ert konverteringsmål?'],
    'Grafisk design/UX': ['Finns befintlig grafisk profil?', 'Vilken målgrupp vänder ni er till?', 'Vilka leveranser krävs?'],
  }
  return base[category] || [
    'Vilket är det viktigaste affärsmålet?',
    'När behöver projektet vara klart?',
    'Finns det interna resurser att samarbeta med?',
  ]
}

const calculateLeadScore = (text: string, budget: BudgetRange, start: StartTime): number => {
  let score = 0
  if (text.length >= 500) score += 30
  else if (text.length >= 220) score += 20
  else if (text.length >= 80) score += 10
  if (budget !== 'unknown') score += 25
  if (start === 'asap' || start === 'within_month') score += 20
  else if (start) score += 10
  score += 15 // is_company default true
  score += 10 // few offers
  return Math.min(100, score)
}

export const analyzeBriefLocally = (text: string): BriefSuggestion => {
  const lower = text.toLowerCase()
  const category = inferCategory(lower)
  const budget_range = inferBudget(lower)
  const start_time = inferStartTime(lower)
  const description = text.trim().slice(0, 600)
  const lead_score = calculateLeadScore(text, budget_range, start_time)

  return {
    category,
    title: buildTitle(description, category),
    description,
    budget_range,
    start_time,
    requirements: buildRequirements(category),
    questions_for_agencies: buildQuestions(category),
    lead_score,
    estimated_matching_agencies: Math.max(3, Math.round(lead_score / 8)),
  }
}
