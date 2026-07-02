export const CYKEL_CITIES = [
  {
    name: 'Linköping',
    slug: 'linkoping',
    exampleArea: 'Ryd, Vasastaden eller Vallastaden',
    areas: 'Innerstaden, Ryd, Vallastaden, Lambohov och Ekholmen',
    localIntro: 'Campus Valla, stora arbetsplatser och tydliga cykelstråk gör cykeln viktig för både studenter och pendlare.',
    districts: ['Innerstaden', 'Ryd', 'Vallastaden', 'Lambohov', 'Ekholmen', 'Skäggetorp', 'Tannefors', 'Berga', 'Tallboda', 'Ljungsbro', 'Sturefors', 'Malmslätt'],
  },
  {
    name: 'Norrköping',
    slug: 'norrkoping',
    exampleArea: 'Centrum, Hageby eller Kneippen',
    areas: 'Centrum, Hageby, Kneippen, Vilbergen och Ingelsta',
    localIntro: 'Campus Norrköping, Resecentrum och de täta stadsdelarna gör cykeln till ett naturligt transportmedel.',
    districts: ['Centrum', 'Hageby', 'Kneippen', 'Vilbergen', 'Ingelsta'],
  },
  {
    name: 'Uppsala',
    slug: 'uppsala',
    exampleArea: 'Flogsta, Luthagen eller Sala backe',
    areas: 'Flogsta, Luthagen, Sala backe, Kåbo och Årsta',
    localIntro: 'Uppsala är en av Sveriges största cykel- och studentstäder, där många är beroende av en fungerande vardagscykel.',
    districts: ['Flogsta', 'Luthagen', 'Sala backe', 'Kåbo', 'Årsta'],
  },
  {
    name: 'Lund',
    slug: 'lund',
    exampleArea: 'Delphi, Vildanden eller Klostergården',
    areas: 'Delphi, Vildanden, Klostergården, Norra Fäladen och Centrum',
    localIntro: 'Lunds kompakta centrum och stora studentliv gör cykeln central för resor mellan bostad, universitet och station.',
    districts: ['Delphi', 'Vildanden', 'Klostergården', 'Norra Fäladen', 'Centrum'],
  },
] as const

export type CykelCity = typeof CYKEL_CITIES[number]
export type CykelCityName = CykelCity['name']

export const DEFAULT_CYKEL_CITY: CykelCityName = 'Linköping'

export const isCykelCity = (value: unknown): value is CykelCityName => (
  typeof value === 'string' && CYKEL_CITIES.some((city) => city.name === value)
)

export const getCykelCity = (value: unknown): CykelCity => (
  CYKEL_CITIES.find((city) => city.name === value || city.slug === value) || CYKEL_CITIES[0]
)

export const cityQuery = (city: CykelCityName) => `/skicka-arende?stad=${encodeURIComponent(city)}`

export const slugify = (value: string) =>
  value.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/\s+/g, '-')

export const cityLandingPath = (city: CykelCityName) => {
  const match = getCykelCity(city)
  return `/cykelverkstad-${match.slug}`
}
