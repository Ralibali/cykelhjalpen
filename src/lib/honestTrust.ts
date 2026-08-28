import { CYKEL_CITIES } from './cykelCities'
import { LEAD_FEE_KR } from './pricing'

export const HONEST_TRUST_CITIES = CYKEL_CITIES.map((city) => city.name)
export const HONEST_TRUST_CITY_LIST_SV = 'Linköping, Norrköping, Uppsala och Lund'
export const HONEST_TRUST_CITY_LIST_EN = 'Linköping, Norrköping, Uppsala and Lund'
export const HONEST_TRUST_COMPANY = 'Aurora Media AB'
export const HONEST_TRUST_COMPANY_CITY = 'Linköping'
export const HONEST_TRUST_MAX_QUOTES = 3
export const HONEST_TRUST_FREE_WINS = 2
export const HONEST_TRUST_MONTHLY_FEE_KR = 0
export const HONEST_TRUST_WIN_FEE_KR = LEAD_FEE_KR

export type HonestTrustVariant = 'cyclist' | 'workshop'
export type HonestText = (sv: string, en: string) => string

export type HonestTrustFactId =
  | 'free-cyclist'
  | 'customer-chooses'
  | 'max-quotes'
  | 'monthly-fee'
  | 'win-fee'
  | 'free-wins'

export type HonestTrustFact = {
  id: HonestTrustFactId
  value: string
  title: string
  body: string
}

export type HonestTrustPathStep = {
  value: string
  label: string
}

export type HonestTrustCopy = {
  eyebrow: string
  title: string
  intro: string
  facts: HonestTrustFact[]
  pathLabel: string
  path: HonestTrustPathStep[]
  companyTitle: string
  companyBody: string
  citiesTitle: string
  citiesBody: string
}

const CYCLIST_ORDER: HonestTrustFactId[] = [
  'free-cyclist',
  'customer-chooses',
  'max-quotes',
  'monthly-fee',
  'win-fee',
  'free-wins',
]

const WORKSHOP_ORDER: HonestTrustFactId[] = [
  'monthly-fee',
  'win-fee',
  'free-wins',
  'customer-chooses',
  'free-cyclist',
  'max-quotes',
]

export const buildHonestTrustFacts = (text: HonestText): Record<HonestTrustFactId, HonestTrustFact> => ({
  'free-cyclist': {
    id: 'free-cyclist',
    value: '0 kr',
    title: text('Gratis för cyklisten', 'Free for the cyclist'),
    body: text(
      'Det kostar inget att skicka ett ärende. Du betalar inte Cykelhjälpen.',
      'Sending a request costs nothing. You do not pay Cykelhjälpen.',
    ),
  },
  'customer-chooses': {
    id: 'customer-chooses',
    value: text('Du väljer', 'You choose'),
    title: text('Kunden väljer verkstad', 'The customer chooses the shop'),
    body: text(
      'Verkstaden väljs inne i Cykelhjälpen. Du jämför svaren och bestämmer själv.',
      'The shop is chosen inside Cykelhjälpen. You compare the replies and decide.',
    ),
  },
  'max-quotes': {
    id: 'max-quotes',
    value: `Max ${HONEST_TRUST_MAX_QUOTES}`,
    title: text('Offerter per ärende', 'Quotes per request'),
    body: text(
      'Högst tre prisförslag per ärende. Därefter stängs ärendet för fler svar.',
      'At most three quotes per request. After that the request closes for further replies.',
    ),
  },
  'monthly-fee': {
    id: 'monthly-fee',
    value: `${HONEST_TRUST_MONTHLY_FEE_KR} kr/mån`,
    title: text('För verkstäder', 'For bike shops'),
    body: text(
      'Ingen månadsavgift. Det kostar 0 kr/månad att vara med.',
      'No monthly fee. It costs 0 SEK/month to take part.',
    ),
  },
  'win-fee': {
    id: 'win-fee',
    value: `${HONEST_TRUST_WIN_FEE_KR} kr`,
    title: text('Bara när kunden väljer er', 'Only when the customer picks you'),
    body: text(
      `Verkstaden betalar ${HONEST_TRUST_WIN_FEE_KR} kr exkl. moms först när kunden väljer dem som vinnare.`,
      `The shop pays ${HONEST_TRUST_WIN_FEE_KR} SEK excl. VAT only when the customer picks them as the winner.`,
    ),
  },
  'free-wins': {
    id: 'free-wins',
    value: String(HONEST_TRUST_FREE_WINS),
    title: text('Första vinsterna gratis', 'First wins are free'),
    body: text(
      'De två första vinsterna är gratis för verkstaden.',
      'The first two wins are free for the shop.',
    ),
  },
})

export const honestTrustCopy = (variant: HonestTrustVariant, text: HonestText): HonestTrustCopy => {
  const cities = text(HONEST_TRUST_CITY_LIST_SV, HONEST_TRUST_CITY_LIST_EN)
  const factsById = buildHonestTrustFacts(text)
  const order = variant === 'workshop' ? WORKSHOP_ORDER : CYCLIST_ORDER

  const path = variant === 'workshop'
    ? [
        { value: `${HONEST_TRUST_MONTHLY_FEE_KR} kr/mån`, label: text('Ingen månadsavgift', 'No monthly fee') },
        { value: text(`${HONEST_TRUST_FREE_WINS} första`, `First ${HONEST_TRUST_FREE_WINS}`), label: text('vinsterna gratis', 'wins are free') },
        { value: `${HONEST_TRUST_WIN_FEE_KR} kr`, label: text('exkl. moms när kunden väljer er', 'excl. VAT when the customer picks you') },
      ]
    : [
        { value: '0 kr', label: text('Gratis för cyklisten', 'Free for the cyclist') },
        { value: `Max ${HONEST_TRUST_MAX_QUOTES}`, label: text('offerter per ärende', 'quotes per request') },
        { value: text('Du väljer', 'You choose'), label: text('verkstad i Cykelhjälpen', 'the shop in Cykelhjälpen') },
      ]

  return {
    eyebrow: text('Öppet och konkret', 'Open and concrete'),
    title: variant === 'workshop'
      ? text('Vad det kostar – och när det tas ut', 'What it costs — and when it is charged')
      : text('Så här är Cykelhjälpen upplagt', 'This is how Cykelhjälpen is set up'),
    intro: variant === 'workshop'
      ? text(
          '0 kr/månad. De två första vinsterna är gratis. Därefter 50 kr exkl. moms när kunden väljer er inne i Cykelhjälpen.',
          '0 SEK/month. The first two wins are free. After that 50 SEK excl. VAT when the customer picks you inside Cykelhjälpen.',
        )
      : text(
          'Gratis för cyklisten. Kunden väljer verkstad inne i Cykelhjälpen. Högst tre offerter per ärende.',
          'Free for the cyclist. The customer chooses the shop inside Cykelhjälpen. At most three quotes per request.',
        ),
    facts: order.map((id) => factsById[id]),
    pathLabel: variant === 'workshop'
      ? text('Så tas avgiften ut', 'How the fee is charged')
      : text('Så går det till för dig', 'How it works for you'),
    path,
    companyTitle: text('Bolag', 'Company'),
    companyBody: text(
      `${HONEST_TRUST_COMPANY}, ${HONEST_TRUST_COMPANY_CITY}`,
      `${HONEST_TRUST_COMPANY}, ${HONEST_TRUST_COMPANY_CITY}`,
    ),
    citiesTitle: text('Städer', 'Cities'),
    citiesBody: cities,
  }
}

export const honestTrustPrerender = {
  homeSv: 'Gratis för cyklisten. Kunden väljer verkstad inne i Cykelhjälpen. Högst tre offerter per ärende. Cykelhjälpen drivs av Aurora Media AB i Linköping och finns i Linköping, Norrköping, Uppsala och Lund.',
  homeEn: 'Free for the cyclist. The customer chooses the shop inside Cykelhjälpen. At most three quotes per request. Cykelhjälpen is run by Aurora Media AB in Linköping and is available in Linköping, Norrköping, Uppsala and Lund.',
  workshopSv: '0 kr/månad. Verkstaden betalar 50 kr exkl. moms först när kunden väljer dem som vinnare. De två första vinsterna är gratis. Kunden väljer verkstad inne i Cykelhjälpen.',
  workshopEn: '0 SEK/month. The shop pays 50 SEK excl. VAT only when the customer picks them as the winner. The first two wins are free. The customer chooses the shop inside Cykelhjälpen.',
}
