// Delad Turnstile-verifiering för publika endpoints (cykelärenden & verkstadsregistrering).
// Håller listan över tillåtna hostnames identisk mellan endpoints så att vi inte
// avvisar giltiga token från cykelhjalpen.se, previewer eller localhost.

export const allowedTurnstileHostname = (hostname: unknown): boolean => {
  if (typeof hostname !== 'string' || !hostname) return true
  const normalized = hostname.toLowerCase()
  return normalized === 'cykelhjalpen.se'
    || normalized === 'www.cykelhjalpen.se'
    || normalized === 'localhost'
    || normalized.endsWith('.lovable.app')
}

export interface TurnstileVerifyOptions {
  secret: string
  token: string
  expectedAction?: string
  remoteip?: string
  fetchImpl?: typeof fetch
}

export type TurnstileVerifyResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

const FAILURE_MESSAGE = 'Säkerhetskontrollen gick ut eller misslyckades. Bekräfta den igen och försök på nytt.'
const UNAVAILABLE_MESSAGE = 'Säkerhetskontrollen är inte tillgänglig just nu. Vänta en stund och försök igen.'

export const verifyTurnstile = async (opts: TurnstileVerifyOptions): Promise<TurnstileVerifyResult> => {
  const doFetch = opts.fetchImpl ?? fetch
  let response: Response
  try {
    response = await doFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: opts.secret,
        response: opts.token,
        remoteip: opts.remoteip ?? '',
      }),
    })
  } catch {
    return { ok: false, status: 503, error: UNAVAILABLE_MESSAGE }
  }
  if (!response.ok) return { ok: false, status: 503, error: UNAVAILABLE_MESSAGE }

  let payload: { success?: boolean; action?: string; hostname?: string } = {}
  try {
    payload = await response.json()
  } catch {
    return { ok: false, status: 503, error: UNAVAILABLE_MESSAGE }
  }

  if (!payload.success) return { ok: false, status: 403, error: FAILURE_MESSAGE }
  if (opts.expectedAction && payload.action && payload.action !== opts.expectedAction) {
    return { ok: false, status: 403, error: FAILURE_MESSAGE }
  }
  if (!allowedTurnstileHostname(payload.hostname)) {
    return { ok: false, status: 403, error: FAILURE_MESSAGE }
  }
  return { ok: true }
}
