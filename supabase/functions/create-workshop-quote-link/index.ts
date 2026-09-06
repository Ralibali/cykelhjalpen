// Admin-only: mint a workshop magic-quote token and return SMS copy.
// Zero outbound — the function never sends SMS. Flag default OFF.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import {
  createQuoteToken,
  isWorkshopMagicQuoteEnabled,
  json,
  loadBoardRequest,
  requestAccessReason,
} from '../_shared/workshop-quote-link.ts'
import { buildWorkshopQuoteSms, WORKSHOP_QUOTE_TOKEN_ERROR_SV } from '../_shared/workshop-quote-core.ts'

const BodySchema = z.object({
  workshop_id: z.string().uuid(),
  request_id: z.string().uuid(),
})

const CREATE_RATE_LIMIT = 30
const CREATE_RATE_WINDOW_MS = 60 * 60 * 1000

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Backend konfiguration saknas.' }, 500, corsHeaders)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Ingen auktorisation' }, 401, corsHeaders)

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) return json({ error: 'Ogiltig token' }, 401, corsHeaders)

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()
    if (profile?.role !== 'admin') {
      return json({ error: 'Endast admin kan skapa offertlänkar.' }, 403, corsHeaders)
    }

    if (!(await isWorkshopMagicQuoteEnabled(admin))) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV.flag_off,
        disabled: true,
      }, 403, corsHeaders)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message || 'Ogiltig data.' }, 400, corsHeaders)
    }

    const since = new Date(Date.now() - CREATE_RATE_WINDOW_MS).toISOString()
    const { count } = await admin
      .from('workshop_quote_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userData.user.id)
      .gte('created_at', since)
    if ((count ?? 0) >= CREATE_RATE_LIMIT) {
      return json({ error: 'För många länkar skapade den här timmen. Vänta lite och försök igen.' }, 429, corsHeaders)
    }

    const { data: workshop, error: workshopError } = await admin
      .from('workshops')
      .select('id, approved, company_name, city, phone')
      .eq('id', parsed.data.workshop_id)
      .maybeSingle()
    if (workshopError) throw workshopError
    if (!workshop) return json({ error: 'Verkstaden hittades inte.' }, 404, corsHeaders)
    if (!workshop.approved) {
      return json({ error: WORKSHOP_QUOTE_TOKEN_ERROR_SV.workshop_not_approved }, 400, corsHeaders)
    }

    const request = await loadBoardRequest(admin, parsed.data.request_id)
    const requestReason = requestAccessReason(request)
    if (!request || requestReason) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV[requestReason ?? 'invalid'],
      }, 400, corsHeaders)
    }

    const { rawToken, expiresAt } = await createQuoteToken({
      admin,
      workshopId: workshop.id,
      requestId: request.id,
      createdBy: userData.user.id,
    })

    const sms = buildWorkshopQuoteSms({
      city: request.city,
      category: request.repair_category,
      token: rawToken,
    })

    return json({
      ok: true,
      token: rawToken,
      url: `https://cykelhjalpen.se/offert/${rawToken}`,
      sms,
      expires_at: expiresAt.toISOString(),
      workshop_name: workshop.company_name,
      workshop_phone: workshop.phone,
      city: request.city,
      category: request.repair_category,
      same_city: request.city === workshop.city,
    }, 200, corsHeaders)
  } catch (error) {
    console.error('create-workshop-quote-link', error)
    return json({ error: 'Kunde inte skapa offertlänken just nu.' }, 500, corsHeaders)
  }
})
