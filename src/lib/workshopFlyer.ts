// Utskriftsblad (A5) för att rekrytera verkstäder i en stad.
// QR-koden leder till /for-cykelverkstader?stad=<slug> med UTM-taggar så att
// registreringar från bladet går att följa per stad i GA4/Plausible.

import { CYKELHJALPENS_SITE_ORIGIN } from '../../supabase/functions/_shared/cors'

export type FlyerCity = { name: string; slug: string }

/** Kampanjlänk för QR-koden. `placement` skiljer t.ex. besök från utskick. */
export function workshopFlyerUrl(city: FlyerCity, placement = 'a5'): string {
  const url = new URL('/for-cykelverkstader', CYKELHJALPENS_SITE_ORIGIN)
  url.searchParams.set('stad', city.slug)
  url.searchParams.set('utm_source', 'print')
  url.searchParams.set('utm_medium', 'qr')
  url.searchParams.set('utm_campaign', `workshop_recruit_${city.slug}`)
  url.searchParams.set('utm_content', placement)
  return url.toString()
}

/** Kort, läsbar adress att skriva ut under QR-koden. */
export function workshopFlyerShortUrl(city: FlyerCity): string {
  return `cykelhjalpen.se/for-cykelverkstader?stad=${city.slug}`
}
