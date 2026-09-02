import * as base from './seoStaticBase'
import type { StaticSeoRoute, SitemapSection } from './seoStaticBase'
import type { SiteHost } from './hostConfig'
import { CYKEL_CITIES, cityLandingPath } from './cykelCities'
import { honestTrustPrerender } from './honestTrust'

export type { StaticSeoRoute, SitemapSection } from './seoStaticBase'
export const SITE_URL = base.SITE_URL
export const UPDRO_SITE_URL = base.UPDRO_SITE_URL
export const SITEMAP_SECTIONS = base.SITEMAP_SECTIONS
export const LEGACY_ALIAS_ROUTES = base.LEGACY_ALIAS_ROUTES
export const generateSitemapXml = base.generateSitemapXml
export const generateSectionSitemapXml = base.generateSectionSitemapXml
export const generateSitemapIndexXml = base.generateSitemapIndexXml
export const renderAppShellHtml = base.renderAppShellHtml
export const renderNotFoundHtml = base.renderNotFoundHtml

const marketText = (city: string) => `Cykelhjälpen finns i ${city}. Tillgängligheten beror på vilka partnerverkstäder som är aktiva när ärendet skickas.`

const polish = (route: StaticSeoRoute, host: SiteHost): StaticSeoRoute => {
  if (host !== 'cykelhjalpen') return route

  if (route.path === '/') return {
    ...route,
    city: undefined,
    description: 'Beskriv felet på din cykel och jämför svar från anslutna verkstäder i Linköping, Norrköping, Uppsala och Lund.',
    sections: [
      { h2: 'Så fungerar Cykelhjälpen', body: 'Beskriv cykeln och problemet en gång. Anslutna verkstäder kan svara med pris och möjlig tid när jobbet passar deras kapacitet.' },
      { h2: 'Välj din stad', body: 'Cykelhjälpen har lokala sidor för Linköping, Norrköping, Uppsala och Lund. Välj stad för guider och för att skicka ett kostnadsfritt ärende.' },
      { h2: 'Så är det upplagt', body: honestTrustPrerender.homeSv },
    ],
  }

  if (route.path === '/en') return {
    ...route,
    city: undefined,
    description: 'Describe your bike problem for free and compare replies from partnered shops in Linköping, Norrköping, Uppsala and Lund.',
    faq: [
      { q: 'What does it cost?', a: 'It is free for you as a cyclist and there is no obligation to buy.' },
      { q: 'Do I need an account?', a: 'No. You send the request and receive a personal link by email.' },
      { q: 'How many replies can I get?', a: 'Up to three partnered bike shops can reply when there is matching capacity. The actual number of replies varies.' },
    ],
    sections: [
      { h2: 'How it works', body: 'Choose your city, describe your bike and the problem, and leave your contact details. Local bike shops reply with a price and how long the repair takes.' },
      { h2: 'Free, no account needed', body: 'Sending a request is free and you never have to accept a quote. You get a personal link to your request by email.' },
      { h2: 'Made for students and newcomers', body: 'You can write your request in English. The bike shop sees that you want the answer in English.' },
      { h2: 'How it is set up', body: honestTrustPrerender.homeEn },
    ],
  }

  if (route.path === '/for-cykelverkstader') return {
    ...route,
    description: 'Anslut din cykelverkstad utan månadsavgift. De två första vunna kunderna är gratis; därefter tas avgiften ut först när kunden väljer er offert.',
    sections: [
      { h2: 'Lokala förfrågningar', body: 'Ni väljer själva vilka cykeljobb ni vill svara på.' },
      { h2: 'Två första vinsterna gratis', body: 'Registreringen har ingen månadsavgift. De två första vunna kunderna är gratis. Därefter tas avgiften ut först när kunden väljer verkstadens offert.' },
      { h2: 'Fyra marknader', body: 'Partnerverkstäder rekryteras i Linköping, Norrköping, Uppsala och Lund.' },
      { h2: 'Vad det kostar', body: honestTrustPrerender.workshopSv },
    ],
  }

  if (route.path === '/en/for-bike-shops') return {
    ...route,
    description: 'Join Cykelhjälpen with no monthly fee. Your first two won customers are free; after that the fee is charged only when the customer chooses your quote.',
    sections: [
      { h2: 'Choose the jobs you want', body: 'You decide which local bike-repair requests you want to answer.' },
      { h2: 'First two wins are free', body: 'There is no monthly fee. Your first two won customers are free. After that the fee is charged only when the customer chooses your quote.' },
      { h2: 'Four markets', body: 'Partner bike shops are being recruited in Linköping, Norrköping, Uppsala and Lund.' },
      { h2: 'What it costs', body: honestTrustPrerender.workshopEn },
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
    if (city && route.path === cityLandingPath(city.name)) {
      // Norrköping has 0 quotes. Do not promise jämförelse/prisförslag in first-byte title.
      const title = city.name === 'Norrköping'
        ? 'Cykelverkstad Norrköping – tillgänglighet beror på aktiva partners'
        : route.title
      return {
        ...route,
        title,
        description: `Behöver du cykelverkstad i ${city.name}? Beskriv problemet gratis. Anslutna verkstäder kan svara med pris och möjlig tid när de har kapacitet.`,
        sections: [
          { h2: `Cykelhjälp i ${city.name}`, body: `${city.localIntro} Ange område eller postnummer så kan verkstaden själv bedöma avstånd och möjlig tid.` },
          { h2: 'Aktuell tillgänglighet', body: marketText(city.name) },
          { h2: 'Vanliga cykeljobb', body: 'Punktering, däck, bromsar, växlar, kedja, hjul, service och elcykelproblem är exempel på jobb du kan beskriva.' },
        ],
      }
    }
  }

  return route
}

export const getAllStaticSeoRoutes = (host: SiteHost = 'cykelhjalpen') => base.getAllStaticSeoRoutes(host).map((route) => polish(route, host))
export const getIndexableSeoRoutes = (host: SiteHost = 'cykelhjalpen') => getAllStaticSeoRoutes(host).filter((route) => !route.noindex)
export const getNoindexSeoRoutes = (host: SiteHost = 'cykelhjalpen') => getAllStaticSeoRoutes(host).filter((route) => route.noindex)
export const renderStaticHtml = (template: string, route: StaticSeoRoute, host: SiteHost = 'cykelhjalpen') => base.renderStaticHtml(template, polish(route, host), host)
