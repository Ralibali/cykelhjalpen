// Public GET/POST: resolve a workshop magic-quote token for /offert/:token.
// Returns the same request fields workshops see on the board — never customer
// email/phone. Flag OFF → friendly "funktionen är avstängd", no request data.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import {
  isWorkshopMagicQuoteEnabled,
  json,
  loadBoardRequest,
  loadRequestImages,
  requestAccessReason,
  resolveQuoteToken,
} from '../_shared/workshop-quote-link.ts'
import { WORKSHOP_QUOTE_TOKEN_ERROR_SV } from '../_shared/workshop-quote-core.ts'

const TokenSchema = z.object({ token: z.string().min(16).max(128) })

const readToken = async (req: Request): Promise<string | null> => {
  const url = new URL(req.url)
  const fromQuery = url.searchParams.get('token')
  if (fromQuery) return fromQuery
  if (req.method === 'GET') return null
  try {
    const body = await req.json()
    return typeof body?.token === 'string' ? body.token : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)
  }

  try {
    const parsed = TokenSchema.safeParse({ token: await readToken(req) })
    if (!parsed.success) {
      return json({ error: WORKSHOP_QUOTE_TOKEN_ERROR_SV.invalid, reason: 'invalid' }, 400, corsHeaders)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('backend configuration missing')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const flagOn = await isWorkshopMagicQuoteEnabled(admin)
    if (!flagOn) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV.flag_off,
        reason: 'flag_off',
        disabled: true,
      }, 403, corsHeaders)
    }

    const resolved = await resolveQuoteToken({
      admin,
      rawToken: parsed.data.token,
      flagOn: true,
    })
    if (!resolved.ok) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV[resolved.reason],
        reason: resolved.reason,
      }, 400, corsHeaders)
    }

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved, company_name, city')
      .eq('id', resolved.record.workshop_id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop?.approved) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV.workshop_not_approved,
        reason: 'workshop_not_approved',
      }, 400, corsHeaders)
    }

    const request = await loadBoardRequest(admin, resolved.record.request_id)
    const requestReason = requestAccessReason(request)
    if (!request || requestReason) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV[requestReason ?? 'invalid'],
        reason: requestReason ?? 'invalid',
      }, 400, corsHeaders)
    }

    const [{ data: existing }, images] = await Promise.all([
      admin
        .from('workshop_responses')
        .select('id, status')
        .eq('request_id', request.id)
        .eq('workshop_id', workshop.id)
        .maybeSingle(),
      loadRequestImages(admin, request.id),
    ])

    const alreadyQuoted = existing?.status === 'sent' || existing?.status === 'won'

    return json({
      ok: true,
      expires_at: resolved.record.expires_at,
      already_quoted: Boolean(alreadyQuoted),
      workshop: {
        company_name: workshop.company_name,
        city: workshop.city,
      },
      request: {
        bike_type: request.bike_type,
        repair_category: request.repair_category,
        description: request.description,
        area: request.area,
        postcode: request.postcode,
        urgency: request.urgency,
        can_drop_off: request.can_drop_off,
        wants_pickup: request.wants_pickup,
        status: request.status,
        created_at: request.created_at,
        customer_language: request.customer_language,
        city: request.city,
        images,
      },
    }, 200, corsHeaders)
  } catch (error) {
    console.error('get-workshop-quote-link', error)
    return json({ error: 'Kunde inte läsa länken just nu.' }, 500, corsHeaders)
  }
})
