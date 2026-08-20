import { describe, expect, it } from 'vitest'
import { cityQuery, requestPath, resolveCykelCityParam } from './cykelCities'

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
