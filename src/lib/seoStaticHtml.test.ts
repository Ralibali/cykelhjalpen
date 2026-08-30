import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getAllStaticSeoRoutes,
  renderAppShellHtml,
  renderNotFoundHtml,
  renderStaticHtml,
  type StaticSeoRoute,
} from './seoStatic'

const template = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

const routeFor = (path: string): StaticSeoRoute => {
  const route = getAllStaticSeoRoutes('cykelhjalpen').find((item) => item.path === path)
  expect(route, `saknar statisk SEO-route: ${path}`).toBeDefined()
  return route!
}

const count = (html: string, pattern: RegExp) => (html.match(pattern) || []).length

describe('renderStaticHtml – head-hygien (inga dubletter)', () => {
  const sampled = ['/', '/cykelverkstad-linkoping', '/en/bike-repair-linkoping', '/punktering-lund', '/for-verkstader']

  for (const path of sampled) {
    it(`${path}: exakt en title, robots, description och canonical`, () => {
      const html = renderStaticHtml(template, routeFor(path), 'cykelhjalpen')
      expect(count(html, /<title>/g), 'title').toBe(1)
      expect(count(html, /<meta name="robots"/g), 'robots').toBe(1)
      expect(count(html, /<meta name="description"/g), 'description').toBe(1)
      expect(count(html, /<link rel="canonical"/g), 'canonical').toBe(1)
      expect(count(html, /application\/ld\+json/g), 'json-ld').toBe(1)
    })

    it(`${path}: statiska head-taggar bär data-rh så Helmet kan överta dem`, () => {
      const html = renderStaticHtml(template, routeFor(path), 'cykelhjalpen')
      expect(html).toMatch(/<link rel="canonical" href="[^"]+" data-rh="true"/)
      expect(html).toMatch(/<meta name="robots" content="[^"]+" data-rh="true"/)
      expect(html).toMatch(/<script type="application\/ld\+json" id="static-seo-jsonld" data-rh="true">/)
    })
  }

  it('noindex-route får noindex, follow + canonical mot live-sidan (legacy-alias)', () => {
    const html = renderStaticHtml(template, routeFor('/for-verkstader'), 'cykelhjalpen')
    expect(html).toContain('<meta name="robots" content="noindex, follow"')
    expect(html).toContain('<link rel="canonical" href="https://cykelhjalpen.se/for-cykelverkstader"')
  })
})

describe('OG-bilder – dedikerade bilder per route', () => {
  it('stadshubben Linköping använder sin dedikerade bild, inte hem.jpg', () => {
    const html = renderStaticHtml(template, routeFor('/cykelverkstad-linkoping'), 'cykelhjalpen')
    expect(html).toContain('<meta property="og:image" content="https://cykelhjalpen.se/og/cykelverkstad-linkoping.jpg"')
    expect(html).not.toContain('/og/hem.jpg')
  })

  it('distriktssida med dedikerad bild använder den', () => {
    const html = renderStaticHtml(template, routeFor('/cykelverkstad-ryd-linkoping'), 'cykelhjalpen')
    expect(html).toContain('https://cykelhjalpen.se/og/cykelverkstad-ryd-linkoping.jpg')
  })

  it('engelsk twin ärver den svenska sidans dedikerade bild', () => {
    const html = renderStaticHtml(template, routeFor('/en/bike-shop-ryd-linkoping'), 'cykelhjalpen')
    expect(html).toContain('https://cykelhjalpen.se/og/cykelverkstad-ryd-linkoping.jpg')
  })

  it('övriga städers hubbar får stadsbild, inte generisk default', () => {
    const html = renderStaticHtml(template, routeFor('/cykelverkstad-norrkoping'), 'cykelhjalpen')
    expect(html).toContain('https://cykelhjalpen.se/og/stad-norrkoping.jpg')
  })
})

describe('renderAppShellHtml – SPA-skalet för dynamiska/gated routes', () => {
  it('innehåller ingen startsides-kanonik, inget og och ingen startsidesbody', () => {
    const html = renderAppShellHtml(template, 'cykelhjalpen')
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('property="og:')
    expect(html).not.toContain('static-seo-content')
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('<title>Cykelhjälpen</title>')
  })

  it('sätter ingen robots-meta (gated routes noindex:as via X-Robots-Tag-headern)', () => {
    const html = renderAppShellHtml(template, 'cykelhjalpen')
    expect(html).not.toContain('name="robots"')
  })
})

describe('renderNotFoundHtml – riktig 404-sida', () => {
  it('är noindex, saknar canonical och visar 404-innehåll (inte startsidan)', () => {
    const html = renderNotFoundHtml(template, 'cykelhjalpen')
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"')
    expect(html).not.toContain('rel="canonical"')
    expect(html).toContain('404 – sidan hittades inte')
    expect(html).toContain('data-static-route="/__404__"')
    expect(html).not.toContain('Jämför lokala cykelverkstäder</h1>')
  })

  it('normaliserar versalvarianter till lowercase client-side', () => {
    const html = renderNotFoundHtml(template, 'cykelhjalpen')
    expect(html).toContain('toLowerCase()')
  })

  it('laddar fortfarande app-bundlen så React catch-all kan ta över', () => {
    const html = renderNotFoundHtml(template, 'cykelhjalpen')
    expect(html).toContain('<script type="module"')
  })
})
