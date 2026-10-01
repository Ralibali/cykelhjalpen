// Skydd för schemalagda funktioner som körs med verify_jwt = false.
//
// pg_cron skickar `x-cron-secret` (se public.edge_cron_headers() i
// migrationen 20261001_cron_secret_header.sql); interna anrop kan i stället
// skicka `Authorization: Bearer <service role key>`.
//
// Utrullning: så länge CRON_SECRET inte är satt i Edge Function-secrets är
// skyddet öppet (resultatet blir 'unconfigured' och en varning loggas), så att
// befintliga scheman fortsätter fungera. Sätt samma värde i
// `supabase secrets set CRON_SECRET=...` och i Vault (namn: edge_cron_secret)
// för att stänga funktionerna för anonyma anrop.

export type CronAuthEnv = {
  cronSecret?: string
  serviceRoleKey?: string
}

export type CronAuthResult = 'authorized' | 'unconfigured' | 'unauthorized'

/** Jämför två strängar utan att läcka längden på gemensamt prefix via tidsåtgång. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const len = Math.max(ab.length, bb.length)
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  return diff === 0
}

export function checkCronAuth(req: Request, env: CronAuthEnv): CronAuthResult {
  const cronSecret = env.cronSecret ?? ''
  const serviceRoleKey = env.serviceRoleKey ?? ''

  const sentSecret = req.headers.get('x-cron-secret') ?? ''
  if (cronSecret && sentSecret && timingSafeEqual(sentSecret, cronSecret)) return 'authorized'

  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (serviceRoleKey && bearer && timingSafeEqual(bearer, serviceRoleKey)) return 'authorized'

  return cronSecret ? 'unauthorized' : 'unconfigured'
}

/**
 * Returnerar ett 401-svar om anropet inte får köra cron-jobbet, annars null.
 * Läser CRON_SECRET och SUPABASE_SERVICE_ROLE_KEY från miljön.
 */
export function requireCronAuth(req: Request, headers: Record<string, string>, fnName: string): Response | null {
  const result = checkCronAuth(req, {
    cronSecret: Deno.env.get('CRON_SECRET') ?? '',
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  })
  if (result === 'unconfigured') {
    console.warn(`[${fnName}] CRON_SECRET saknas – funktionen kan anropas utan autentisering.`)
    return null
  }
  if (result === 'authorized') return null
  return new Response(JSON.stringify({ error: 'unauthorized', code: 'unauthorized' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
