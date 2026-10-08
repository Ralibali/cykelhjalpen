import { describe, expect, it } from 'vitest'
import { loginErrorMessage } from '@/lib/authErrors'

describe('login error messages', () => {
  it('explains an unconfirmed account', () => {
    expect(loginErrorMessage({ code: 'email_not_confirmed' })).toContain('bekräftelsemejlet')
  })
  it('explains invalid credentials without revealing whether an account exists', () => {
    expect(loginErrorMessage({ code: 'invalid_credentials' })).toContain('Fel e-postadress eller lösenord')
  })
  it('explains rate limiting', () => {
    expect(loginErrorMessage({ status: 429 })).toContain('För många försök')
  })
  it('does not expose backend errors to the user', () => {
    expect(loginErrorMessage(new Error('private backend detail'))).toContain('internetanslutning')
    expect(loginErrorMessage(new Error('private backend detail'))).not.toContain('private')
  })
})
