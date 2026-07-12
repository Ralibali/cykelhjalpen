import { describe, expect, it } from 'vitest'
import { bikeRequestSchema, makeDefaultBikeRequest } from './bikeRequestForm'

const validRequest = () => ({
  ...makeDefaultBikeRequest('Linköping'),
  bike_type: 'Elcykel',
  repair_category: 'Bromsar',
  description: 'Frambromsen tar ojämnt och behöver kontrolleras.',
  postcode: '585 65',
  customer_name: 'Anna Andersson',
  customer_email: 'anna@example.com',
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
})
