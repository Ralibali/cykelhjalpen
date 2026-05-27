const ALLOWED_ORIGINS = [
  'https://cykelhjalpen.se',
  'https://www.cykelhjalpen.se',
  'https://cykelhjalpen.lovable.app',
];

const LOVABLE_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.lovable\.app$/i;

export function corsFor(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) || LOVABLE_PREVIEW_RE.test(origin);

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://cykelhjalpen.se',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}
