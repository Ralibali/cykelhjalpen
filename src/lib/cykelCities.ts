export const CYKEL_CITIES = [
  { name: 'Linköping', slug: 'linkoping', exampleArea: 'Ryd, Vasastaden eller Vallastaden' },
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

export const cityLandingPath = (city: CykelCityName) => {
  const match = getCykelCity(city)
  return `/cykelverkstad-${match.slug}`
}
