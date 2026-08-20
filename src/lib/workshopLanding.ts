import { getCykelCity, resolveCykelCityParam, type CykelCity } from './cykelCities'

export type WorkshopLandingMarket = {
  selected: CykelCity | null
  registerHref: string
}

/** City-specific only when ?stad= is a real market. Otherwise all four cities equally. */
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
  const four = text('Linköping, Norrköping, Uppsala och Lund', 'Linköping, Norrköping, Uppsala and Lund')

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
        `Bli Founding Partner i Cykelhjälpen i ${four}. Ingen månadsavgift, två första vunna kunderna gratis och full frihet att välja vilka jobb ni vill svara på.`,
        `Become a Founding Partner with Cykelhjälpen in ${four}. No monthly fee, your first two won customers are free, and you choose which jobs to respond to.`,
      ),
    badge: city ? `Founding Partner · ${city}` : 'Founding Partner',
    h1Lead: city
      ? text(`Få in fler lokala cykeljobb i ${city}`, `Get more local bike jobs in ${city}`)
      : text('Få in fler lokala cykeljobb', 'Get more local bike jobs'),
    networkTitle: city
      ? text(`Vi bygger partnernätverket i ${city}`, `We are building the partner network in ${city}`)
      : text(`Vi bygger partnernätverket i ${four}`, `We are building the partner network in ${four}`),
    networkBody: city
      ? text(
        `Målet är ett litet, starkt nätverk av aktiva verkstäder i ${city}, så att kundärenden får relevanta lokala chanser till svar.`,
        `The goal is a small, strong network of active bike shops in ${city}, giving customer requests relevant local chances of a response.`,
      )
      : text(
        `Målet är ett litet, starkt nätverk av aktiva verkstäder i ${four}, så att kundärenden får relevanta lokala chanser till svar.`,
        `The goal is a small, strong network of active bike shops in ${four}, giving customer requests relevant local chances of a response.`,
      ),
    heroCta: city
      ? text(`Bli Founding Partner i ${city}`, `Become a Founding Partner in ${city}`)
      : text('Bli Founding Partner', 'Become a Founding Partner'),
    bottomTitle: city
      ? text(`Var med från början i ${city}`, `Join from the start in ${city}`)
      : text('Var med från början i fyra städer', 'Join from the start in four cities'),
    bottomCta: city
      ? text(`Registrera verkstaden i ${city}`, `Register your shop in ${city}`)
      : text('Registrera verkstaden gratis', 'Register your shop for free'),
  }
}
