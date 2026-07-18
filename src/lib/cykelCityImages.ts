import linkopingLarge from '@/assets/cities/cykel-stad-linkoping-1200.webp'
import linkopingSmall from '@/assets/cities/cykel-stad-linkoping-640.webp'
import norrkopingLarge from '@/assets/cities/cykel-stad-norrkoping-1200.webp'
import norrkopingSmall from '@/assets/cities/cykel-stad-norrkoping-640.webp'
import uppsalaLarge from '@/assets/cities/cykel-stad-uppsala-1200.webp'
import uppsalaSmall from '@/assets/cities/cykel-stad-uppsala-640.webp'
import lundLarge from '@/assets/cities/cykel-stad-lund-1200.webp'
import lundSmall from '@/assets/cities/cykel-stad-lund-640.webp'
import { getCykelCity } from './cykelCities'

export interface CityImage {
  large: string
  small: string
  alt: string
}

const CITY_IMAGES: Record<string, CityImage> = {
  linkoping: {
    large: linkopingLarge,
    small: linkopingSmall,
    alt: 'Cyklist på stenbro med Linköpings domkyrka i bakgrunden',
  },
  norrkoping: {
    large: norrkopingLarge,
    small: norrkopingSmall,
    alt: 'Cyklist längs Motala ström med Norrköpings industrilandskap i bakgrunden',
  },
  uppsala: {
    large: uppsalaLarge,
    small: uppsalaSmall,
    alt: 'Cyklist vid Fyrisån med Uppsala domkyrka och slott i bakgrunden',
  },
  lund: {
    large: lundLarge,
    small: lundSmall,
    alt: 'Cyklist på kullerstensgata med Lunds domkyrka i bakgrunden',
  },
}

export const getCityImage = (cityOrSlug: string): CityImage => {
  const city = getCykelCity(cityOrSlug)
  return CITY_IMAGES[city.slug] || CITY_IMAGES.linkoping
}
