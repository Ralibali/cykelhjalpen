// Cities open for workshop registration and customer requests.
// Pure data shared by the browser and Edge Functions; no local supply claims.
export const SERVICE_CITIES = [
  { name: 'Linköping', slug: 'linkoping' },
  { name: 'Norrköping', slug: 'norrkoping' },
  { name: 'Uppsala', slug: 'uppsala' },
  { name: 'Lund', slug: 'lund' },
  { name: 'Västerås', slug: 'vasteras' },
  { name: 'Örebro', slug: 'orebro' },
  { name: 'Göteborg', slug: 'goteborg' },
  { name: 'Stockholm', slug: 'stockholm' },
  { name: 'Malmö', slug: 'malmo' },
  { name: 'Umeå', slug: 'umea' },
  { name: 'Jönköping', slug: 'jonkoping' },
] as const

export type ServiceCityName = typeof SERVICE_CITIES[number]['name']
export const SERVICE_CITY_NAMES = SERVICE_CITIES.map((city) => city.name) as [ServiceCityName, ...ServiceCityName[]]
