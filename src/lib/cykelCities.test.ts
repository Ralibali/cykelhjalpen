import { describe, expect, it } from 'vitest'
import { cityQuery, getCykelCity, isCykelCity, requestPath, resolveCykelCityParam } from './cykelCities'
import { bikeRequestSchema } from './bikeRequestForm'
import { cityNameFromSlug, citySlugFromName } from '../../supabase/functions/_shared/v2/config-schema'
import { z } from 'zod'
import { SERVICE_CITY_NAMES } from '../../supabase/functions/_shared/service-cities'

describe('requestPath', () => {
  it('does not lock a city on generic entry points', () => {
    expect(requestPath()).toBe('/skicka-arende')
    expect(requestPath({ problem: 'Punktering' })).toBe('/skicka-arende?problem=Punktering')
    expect(requestPath({ problem: 'Punktering' })).not.toMatch(/stad=/)
    expect(requestPath({ city: null, problem: 'Bromsar' })).not.toMatch(/linkoping/i)
  })

  it('prefills only when a city was already chosen', () => {
    expect(requestPath({ city: 'uppsala', problem: 'Punktering' })).toBe(
      '/skicka-arende?stad=uppsala&problem=Punktering',
    )
    expect(cityQuery('Linköping')).toBe('/skicka-arende?stad=linkoping')
    expect(cityQuery('Norrköping')).toBe('/skicka-arende?stad=norrkoping')
    expect(cityQuery('Uppsala')).toBe('/skicka-arende?stad=uppsala')
    expect(cityQuery('Lund')).toBe('/skicka-arende?stad=lund')
    expect(resolveCykelCityParam('lund')).toBe('Lund')
  })
})

describe('recruitment cities', () => {
  it.each([
    ['Västerås', 'vasteras'], ['Örebro', 'orebro'], ['Göteborg', 'goteborg'],
    ['Stockholm', 'stockholm'], ['Malmö', 'malmo'], ['Umeå', 'umea'], ['Jönköping', 'jonkoping'],
  ])('keeps %s through signup links, request validation and backend matching', (name, slug) => {
    expect(resolveCykelCityParam(slug)).toBe(name)
    expect(isCykelCity(name)).toBe(true)
    expect(getCykelCity(name).slug).toBe(slug)
    expect(requestPath({ city: name })).toBe(`/skicka-arende?stad=${slug}`)
    expect(z.enum(SERVICE_CITY_NAMES).parse(name)).toBe(name)
    expect(bikeRequestSchema.innerType().shape.city.parse(name)).toBe(name)
    expect(citySlugFromName(name)).toBe(slug)
    expect(cityNameFromSlug(slug)).toBe(name)
  })

  it('rejects cities that have not opened', () => {
    expect(resolveCykelCityParam('kiruna')).toBeNull()
    expect(isCykelCity('Kiruna')).toBe(false)
    expect(z.enum(SERVICE_CITY_NAMES).safeParse('Kiruna').success).toBe(false)
  })
})
