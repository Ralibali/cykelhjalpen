// Error helpers for supabase.functions.invoke. A non-2xx edge-function
// response comes back as { data: null, error: FunctionsHttpError } whose
// message is a fixed English text; the server's JSON body ({ error, reason,
// disabled, … }) is only reachable through error.context (a Response).

/** The parsed JSON body of a FunctionsHttpError, or null. */
export const getFunctionErrorBody = async (error: unknown): Promise<Record<string, unknown> | null> => {
  const context = (error as { context?: unknown } | null)?.context
  if (!(context instanceof Response)) return null
  try {
    const payload = await context.clone().json()
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    // Edge-funktionen returnerade inte JSON.
    return null
  }
}

/** The server's error message, else the error's own message, else fallback. */
export const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  const payload = await getFunctionErrorBody(error)
  if (typeof payload?.error === 'string') return payload.error
  if (payload?.error && typeof payload.error === 'object') {
    const firstMessage = Object.values(payload.error).flat().find((value) => typeof value === 'string')
    if (typeof firstMessage === 'string') return firstMessage
  }
  return (error as { message?: string } | null)?.message || fallback
}
