import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { getFunctionErrorBody, getFunctionErrorMessage } from './functionErrors'

const httpError = (body: string, status = 400) => new FunctionsHttpError(new Response(body, { status }))
const jsonError = (body: unknown, status = 400) => httpError(JSON.stringify(body), status)

describe('getFunctionErrorBody', () => {
  it('returns the JSON body of a non-2xx response', async () => {
    const error = jsonError({ disabled: true, reason: 'flag_off', error: 'Funktionen är avstängd just nu.' }, 403)
    expect(await getFunctionErrorBody(error)).toEqual({ disabled: true, reason: 'flag_off', error: 'Funktionen är avstängd just nu.' })
  })

  it('can read the same error more than once', async () => {
    const error = jsonError({ error: 'Den här länken är redan använd.', reason: 'used' })
    await getFunctionErrorBody(error)
    expect(await getFunctionErrorBody(error)).toEqual({ error: 'Den här länken är redan använd.', reason: 'used' })
  })

  it('returns null when there is no JSON object body to read', async () => {
    expect(await getFunctionErrorBody(httpError('<html>Bad gateway</html>', 502))).toBeNull()
    expect(await getFunctionErrorBody(jsonError('bara text'))).toBeNull()
    expect(await getFunctionErrorBody(new FunctionsFetchError(new TypeError('Failed to fetch')))).toBeNull()
    expect(await getFunctionErrorBody(new Error('Ärendet hittades inte'))).toBeNull()
    expect(await getFunctionErrorBody(null)).toBeNull()
  })
})

describe('getFunctionErrorMessage', () => {
  it('prefers the server message over the generic English text', async () => {
    const error = jsonError({ error: 'Betalningen behandlas redan. Uppdatera sidan om några sekunder.' })
    expect(error.message).toBe('Edge Function returned a non-2xx status code')
    expect(await getFunctionErrorMessage(error, 'Försök igen om en stund.')).toBe('Betalningen behandlas redan. Uppdatera sidan om några sekunder.')
  })

  it('uses the first field message from a validation error object', async () => {
    const error = jsonError({ error: { customer_email: ['Ange en giltig e-postadress'], customer_name: ['Ange ditt namn'] } })
    expect(await getFunctionErrorMessage(error, 'fallback')).toBe('Ange en giltig e-postadress')
  })

  it('falls back to the error message, then to the fallback', async () => {
    expect(await getFunctionErrorMessage(httpError('not json', 500), 'fallback')).toBe('Edge Function returned a non-2xx status code')
    expect(await getFunctionErrorMessage(new Error('Ärendet hittades inte'), 'fallback')).toBe('Ärendet hittades inte')
    expect(await getFunctionErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
