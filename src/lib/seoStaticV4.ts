import * as base from './seoStaticBase'
import type { StaticSeoRoute, SitemapSection } from './seoStaticBase'
import type { SiteHost } from './hostConfig'
import { CYKEL_CITIES, cityLandingPath } from './cykelCities'

export type { StaticSeoRoute, SitemapSection } from './seoStaticBase'
export const SITE_URL = base.SITE_URL
export const UPDRO_SITE_URL = base.UPDRO_SITE_URL
export const SITEMAP_SECTIONS = base.SITEMAP_SECTIONS
export const LEGACY_ALIAS_ROUTES = base.LEGACY_ALIAS_ROUTES
export const generateSitemapXml = base.generateSitemapXml
export const generateSectionSitemapXml = base.generateSectionSitemapXml
export const generateSitemapIndexXml = base.generateSitemapIndexXml

const statusText = (city: string) => city === 'Linköping'
  ? 'Linköping är Cykelhjälpens fokusstad just nu.'
  : `Cykelhjälpen bygger just nu ut nätverket av partnerverkstäder i ${city}.`

const polish = (route: StaticSeoRoute, host: SiteHost): StaticSeoRoute => {
  if (host !== 'cykelhjalpen') return route

  if (route.path === '/') return {
    ...route,
    city: 'Linköping',
    description: 'Beskriv felet på din cykel och jämför svar från anslutna verkstäder. Linköping är fokusstad; nätverket byggs ut i Norrköping, Uppsala och Lund.',
    sections: [
      { h2: 'Så fungerar Cykelhjälpen', body: 'Beskriv cykeln och problemet en gång. Anslutna verkstäder kan svara med pris och möjlig tid när jobbet passar deras kapacitet.' },
      { h2: 'Linköping först', body: 'Linköping är aktiv fokusmarknad. Norrköping, Uppsala och Lund ligger kvar som lokala guider medan partnernätverket byggs ut.' },
    ],
  }

  if (route.path === '/en') return {
    ...route,
    city: 'Linköping',
    description: 'Describe your bike problem for free and compare replies from partnered shops. Linköping is the focus city while the network expands in Norrköping, Uppsala and Lund.',
    faq: [
      { q: 'What does it cost?', a: 'It is free for you as a cyclist and there is no obligation to buy.' },
      { q: 'Do I need an account?', a: 'No. You send the request and receive a personal link by email.' },
      { q: 'How many replies can I get?', a: 'Up to three partnered bike shops can reply when there is matching capacity. The actual number of replies varies.' },
    ],
  }

  if (route.path === '/for-cykelverkstader') return {
    ...route,
    description: 'Anslut din cykelverkstad utan månadsavgift. De två första vunna kunderna är gratis; därefter tas avgiften ut först när kunden väljer er offert.',
    sections: [
      { h2: 'Lokala förfrågningar', body: 'Ni väljer själva vilka cykeljobb ni vill svara på.' },
      { h2: 'Två första vinsterna gratis', body: 'Registreringen har ingen månadsavgift. De två första vunna kunderna är gratis. Därefter tas avgiften ut först när kunden väljer verkstadens offert.' },
      { h2: 'Linköping prioriteras', body: 'Linköping är fokusstad, men partnerverkstäder rekryteras även i Norrköping, Uppsala och Lund.' },
    ],
  }

  if (route.path === '/en/for-bike-shops') return {
    ...route,
    description: 'Join Cykelhjälpen with no monthly fee. Your first two won customers are free; after that the fee is charged only when the customer chooses your quote.',
    sections: [
      { h2: 'Choose the jobs you want', body: 'You decide which local bike-repair requests you want to answer.' },
      { h2: 'First two wins are free', body: 'There is no monthly fee. Your first two won customers are free. After that the fee is charged only when the customer chooses your quote.' },
      { h2: 'Linköping is the priority', body: 'Linköping is the focus city while partner shops are also being recruited in Norrköping, Uppsala and Lund.' },
    ],
  }

  if (route.path === '/skicka-arende') return {
    ...route,
    description: 'Beskriv cykeln och problemet kostnadsfritt. Upp till tre anslutna verkstäder kan svara när det finns matchande kapacitet. Inget konto krävs.',
    faq: [
      { q: 'Vad kostar det?', a: 'Det är gratis för dig som cyklist.' },
      { q: 'Hur många svar kan jag få?', a: 'Upp till tre anslutna verkstäder kan svara när det finns matchande kapacitet. Det faktiska antalet svar varierar.' },
    ],
  }

  if (route.path === '/en/submit-request') return {
    ...route,
    description: 'Describe your bike problem for free. Up to three partnered bike shops can reply when there is matching capacity. No account needed.',
    sections: [
      { h2: 'Compare replies when they arrive', body: 'Up to three partnered shops can reply with price and available time when the job fits their capacity. The actual number of replies varies.' },
      { h2: 'Free, no account needed', body: 'Sending a request is free and there is no obligation to accept a reply.' },
    ],
  }

  if (route.city) {
    const city = CYKEL_CITIES.find((item) => item.name === route.city)
    if (city && route.path === cityLandingPath(city.name)) return {
      ...route,
      description: `Behöver du cykelverkstad i ${city.name}? Beskriv problemet gratis. Anslutna verkstäder kan svara med pris och möjlig tid när de har kapacitet.`,
      sections: [
        { h2: `Cykelhjälp i ${city.name}`, body: `${city.localIntro} Ange område eller postnummer så kan verkstaden själv bedöma avstånd och möjlig tid.` },
        { h2: 'Aktuell tillgänglighet', body: `${statusText(city.name)} Antalet svar och svarstiden beror på vilka partnerverkstäder som är aktiva när ärendet skickas.` },
        { h2: 'Vanliga cykeljobb', body: 'Punktering, däck, bromsar, växlar, kedja, hjul, service och elcykelproblem är exempel på jobb du kan beskriva.' },
      ],
    }
  }

  return route
}

export const getAllStaticSeoRoutes = (host: SiteHost = 'cykelhjalpen') => base.getAllStaticSeoRoutes(host).map((route) => polish(route, host))
export const getIndexableSeoRoutes = (host: SiteHost = 'cykelhjalpen') => getAllStaticSeoRoutes(host).filter((route) => !route.noindex)
export const getNoindexSeoRoutes = (host: SiteHost = 'cykelhjalpen') => getAllStaticSeoRoutes(host).filter((route) => route.noindex)
export const renderStaticHtml = (template: string, route: StaticSeoRoute, host: SiteHost = 'cykelhjalpen') => base.renderStaticHtml(template, polish(route, host), host)
