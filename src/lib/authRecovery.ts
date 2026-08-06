/** Pure helpers for the password recovery flow (kept separate so they can be unit tested). */

export type RecoveryLinkState =
  | { kind: 'ok' }
  | { kind: 'expired'; message: string }
  | { kind: 'invalid'; message: string }

const EXPIRED_MESSAGE = 'Länken har gått ut. Begär en ny återställningslänk.'
const INVALID_MESSAGE = 'Länken är ogiltig eller redan använd. Begär en ny återställningslänk.'

/**
 * Reads the error information Supabase puts in the URL hash (or query) after a
 * failed recovery redirect.
 */
export function parseRecoveryLink(hash: string, search = ''): RecoveryLinkState {
  const params = new URLSearchParams(`${hash.replace(/^#/, '')}&${search.replace(/^\?/, '')}`)
  const error = params.get('error')
  const errorCode = params.get('error_code')
  const description = params.get('error_description') || ''

  if (!error && !errorCode) return { kind: 'ok' }

  if (errorCode === 'otp_expired' || /expired/i.test(description)) {
    return { kind: 'expired', message: EXPIRED_MESSAGE }
  }

  return { kind: 'invalid', message: INVALID_MESSAGE }
}

/** Validates a new password pair. Returns an error message, or null when valid. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Lösenordet måste vara minst åtta tecken.'
  if (password !== confirmation) return 'Lösenorden matchar inte.'
  return null
}
