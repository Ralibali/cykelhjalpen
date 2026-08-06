import { describe, it, expect } from 'vitest'
import { parseRecoveryLink, validateNewPassword } from '@/lib/authRecovery'

describe('parseRecoveryLink', () => {
  it('accepts a normal recovery link', () => {
    expect(parseRecoveryLink('#access_token=abc&type=recovery').kind).toBe('ok')
  })
  it('detects an expired token', () => {
    const r = parseRecoveryLink('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    expect(r.kind).toBe('expired')
  })
  it('detects an invalid token', () => {
    expect(parseRecoveryLink('#error=access_denied&error_code=bad_oauth_state').kind).toBe('invalid')
  })
  it('reads errors from the query string too', () => {
    expect(parseRecoveryLink('', '?error=server_error').kind).toBe('invalid')
  })
})

describe('validateNewPassword', () => {
  it('rejects short passwords', () => {
    expect(validateNewPassword('abc', 'abc')).toMatch(/åtta/)
  })
  it('rejects mismatches', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgi')).toMatch(/matchar/)
  })
  it('accepts a valid pair', () => {
    expect(validateNewPassword('abcdefgh', 'abcdefgh')).toBeNull()
  })
})
