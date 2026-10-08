export const AUTH_TIMEOUT_MS = 15_000

/** Bound auth waits even when a network request or the session lock never settles. */
export async function withAuthTimeout<T>(request: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('auth_timeout')), AUTH_TIMEOUT_MS)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export function loginErrorMessage(error: unknown): string {
  const details = error as { code?: string; status?: number; message?: string } | null
  if (details?.code === 'email_not_confirmed') {
    return 'Bekräfta din e-postadress via länken i bekräftelsemejlet innan du loggar in. Kontrollera även skräpposten.'
  }
  if (details?.code === 'invalid_credentials') {
    return 'Fel e-postadress eller lösenord. Försök igen eller välj Glömt lösenord.'
  }
  if (details?.status === 429) return 'För många försök. Vänta en stund och prova igen.'
  return 'Kunde inte ansluta till inloggningen. Kontrollera din internetanslutning och försök igen.'
}
