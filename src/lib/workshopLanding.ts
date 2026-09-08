import { getCykelCity, resolveCykelCityParam, SERVICE_CITIES, type CykelCity } from './cykelCities'

export type WorkshopLandingMarket = {
  selected: CykelCity | null
  registerHref: string
}

/** City-specific only when ?stad= is a real market. Otherwise all open cities equally. */
export const resolveWorkshopLandingMarket = (stadParam: string | null | undefined): WorkshopLandingMarket => {
  const name = resolveCykelCityParam(stadParam)
  const selected = name ? getCykelCity(name) : null
  return {
    selected,
    registerHref: selected ? `/registrera/verkstad?stad=${selected.slug}` : '/registrera/verkstad',
  }
}

type Text = (sv: string, en: string) => string

export const workshopLandingCopy = (selected: CykelCity | null, text: Text) => {
  const city = selected?.name
  const markets = text(`${SERVICE_CITIES.length} öppna städer`, `${SERVICE_CITIES.length} open cities`)

  return {
    title: city
      ? text(`Få fler cykelkunder i ${city} | Cykelhjälpen`, `Get more bike customers in ${city} | Cykelhjälpen`)
      : text('Få fler cykelkunder | Cykelhjälpen', 'Get more bike customers | Cykelhjälpen'),
    description: city
      ? text(
        `Bli Founding Partner i Cykelhjälpen i ${city}. Ingen månadsavgift, två första vunna kunderna gratis och full frihet att välja vilka jobb ni vill svara på.`,
        `Become a Founding Partner with Cykelhjälpen in ${city}. No monthly fee, your first two won customers are free, and you choose which jobs to respond to.`,
      )
      : text(
        `Bli Founding Partner i Cykelhjälpen i ${markets}. Ingen månadsavgift, två första vunna kunderna gratis och full frihet att välja vilka jobb ni vill svara på.`,
        `Become a Founding Partner with Cykelhjälpen in ${markets}. No monthly fee, your first two won customers are free, and you choose which jobs to respond to.`,
      ),
    badge: city ? `Founding Partner · ${city}` : 'Founding Partner',
    h1Lead: city
      ? text(`Få in fler lokala cykeljobb i ${city}`, `Get more local bike jobs in ${city}`)
      : text('Få in fler lokala cykeljobb', 'Get more local bike jobs'),
    networkTitle: city
      ? text(`Vi bygger partnernätverket i ${city}`, `We are building the partner network in ${city}`)
      : text(`Vi bygger partnernätverket i ${markets}`, `We are building the partner network in ${markets}`),
    networkBody: city
      ? text(
        `Målet är ett litet, starkt nätverk av aktiva verkstäder i ${city}, så att kundärenden får relevanta lokala chanser till svar.`,
        `The goal is a small, strong network of active bike shops in ${city}, giving customer requests relevant local chances of a response.`,
      )
      : text(
        `Målet är ett litet, starkt nätverk av aktiva verkstäder i ${markets}, så att kundärenden får relevanta lokala chanser till svar.`,
        `The goal is a small, strong network of active bike shops in ${markets}, giving customer requests relevant local chances of a response.`,
      ),
    heroCta: city
      ? text(`Bli Founding Partner i ${city}`, `Become a Founding Partner in ${city}`)
      : text('Bli Founding Partner', 'Become a Founding Partner'),
    bottomTitle: city
      ? text(`Var med från början i ${city}`, `Join from the start in ${city}`)
      : text(`Var med från början i ${markets}`, `Join from the start in ${markets}`),
    bottomCta: city
      ? text(`Registrera verkstaden i ${city}`, `Register your shop in ${city}`)
      : text('Registrera verkstaden gratis', 'Register your shop for free'),
  }
}
