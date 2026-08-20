export const CYKELHJALPENS_SITE_ORIGIN = 'https://cykelhjalpen.se'

const ALLOWED_ORIGINS = [
  CYKELHJALPENS_SITE_ORIGIN,
  'https://www.cykelhjalpen.se',
] as const

const LOCAL_DEV_ORIGIN_RE = /^http:\/\/localhost(:\d+)?$/i

export function isAllowedPublicOrigin(origin: string): boolean {
  return (ALLOWED_ORIGINS as readonly string[]).includes(origin)
    || LOCAL_DEV_ORIGIN_RE.test(origin)
}

export function corsFor(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = isAllowedPublicOrigin(origin)

  return {
    'Access-Control-Allow-Origin': allowed ? origin : CYKELHJALPENS_SITE_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  }
}
