import { describe, expect, it } from 'vitest'
import { bikeRequestSchema, makeDefaultBikeRequest, resolveWizardCity } from './bikeRequestForm'

const validRequest = () => ({
  ...makeDefaultBikeRequest('Linköping'),
  bike_type: 'Elcykel',
  repair_category: 'Bromsar',
  description: 'Frambromsen tar ojämnt och behöver kontrolleras.',
  postcode: '585 65',
  customer_name: 'Anna Andersson',
  customer_email: 'anna@example.com',
  customer_phone: '070-123 45 67',
  consent: true,
})

describe('bikeRequestSchema', () => {
  it('accepts a complete supported request', () => {
    const result = bikeRequestSchema.safeParse(validRequest())
    expect(result.success).toBe(true)
  })

  it('requires either drop-off or pickup', () => {
    const result = bikeRequestSchema.safeParse({
      ...validRequest(),
      can_drop_off: false,
      wants_pickup: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects manipulated option values', () => {
    const result = bikeRequestSchema.safeParse({
      ...validRequest(),
      bike_type: 'Påhittad cykeltyp',
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed postcodes', () => {
    const result = bikeRequestSchema.safeParse({
      ...validRequest(),
      postcode: 'ABC',
    })
    expect(result.success).toBe(false)
  })

  it('does not assume Linköping when no city was chosen', () => {
    expect(makeDefaultBikeRequest().city).toBe('')
    expect(bikeRequestSchema.safeParse(makeDefaultBikeRequest()).success).toBe(false)
    expect(bikeRequestSchema.safeParse({
      ...validRequest(),
      city: '',
    }).success).toBe(false)
  })
})

describe('resolveWizardCity', () => {
  it('prefers ?stad= over a stored draft', () => {
    expect(resolveWizardCity('uppsala', 'Lund')).toBe('Uppsala')
    expect(resolveWizardCity('Lund', 'Linköping')).toBe('Lund')
  })

  it('keeps a valid draft city when no query city exists', () => {
    expect(resolveWizardCity(null, 'Norrköping')).toBe('Norrköping')
  })

  it('stays empty instead of inventing Linköping', () => {
    expect(resolveWizardCity(null)).toBe('')
    expect(resolveWizardCity('stockholm', 'Göteborg')).toBe('')
    expect(resolveWizardCity('')).toBe('')
  })
})
