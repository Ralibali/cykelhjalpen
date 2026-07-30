// Delad Turnstile-verifiering för publika endpoints (cykelärenden & verkstadsregistrering).
// OBS 2026-07-30: hostname avvisas inte längre – allowlistan falsk-positivt
// blockerade äkta användare på förhandsvisnings- och tunneldomäner. Funktionen
// finns kvar för kompatibilitet och loggning men är alltid tillåtande; skyddet
// vilar på Cloudflares tokenvalidering (single-use, kortlivad) + action-kollen.

export const allowedTurnstileHostname = (_hostname: unknown): boolean => true

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
  if (payload.hostname && !allowedTurnstileHostname(payload.hostname)) {
    console.warn(`Turnstile-token utfärdad på ovanlig domän: ${payload.hostname}`)
  }
  return { ok: true }
}
