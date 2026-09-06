// Public POST: submit a quote via a workshop magic-quote token.
// Reuses the same workshop_responses + notify path as submit-bike-response.
// Flag OFF → reject. Token binds workshop_id; cannot quote as another shop.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import {
  isWorkshopMagicQuoteEnabled,
  json,
  loadBoardRequest,
  markQuoteTokenUsed,
  requestAccessReason,
  resolveQuoteToken,
} from '../_shared/workshop-quote-link.ts'
import {
  validateQuoteForm,
  WORKSHOP_QUOTE_TOKEN_ERROR_SV,
} from '../_shared/workshop-quote-core.ts'
import {
  friendlyDatabaseError,
  upsertAndSendWorkshopQuote,
} from '../_shared/send-workshop-quote.ts'

const BodySchema = z.object({
  token: z.string().min(16).max(128),
  message: z.string(),
  estimated_price_min: z.union([z.number(), z.string(), z.null()]).optional(),
  estimated_price_max: z.union([z.number(), z.string(), z.null()]).optional(),
  estimated_time: z.string().max(120).optional().nullable(),
  can_pickup: z.boolean().optional(),
})

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405, corsHeaders)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('backend configuration missing')

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    if (!(await isWorkshopMagicQuoteEnabled(admin))) {
      return json({
        error: WORKSHOP_QUOTE_TOKEN_ERROR_SV.flag_off,
        reason: 'flag_off',
        disabled: true,
      }, 403, corsHeaders)
    }

    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return json({ error: 'Ogiltiga uppgifter.' }, 400, corsHeaders)
    }

    const form = validateQuoteForm(parsed.data)
    if (!form.ok) return json({ error: form.error }, 400, corsHeaders)

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
      .select('id, approved, company_name, city, user_id')
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

    // Token already binds workshop + request. Do not re-check city here so an
    // admin-chosen pair still works; never allow quoting as another workshop.
    const result = await upsertAndSendWorkshopQuote({
      admin,
      supabaseUrl,
      serviceRoleKey,
      workshop,
      request,
      actorUserId: workshop.user_id,
      requireSameCity: false,
      message: form.message,
      estimated_price_min: form.estimated_price_min,
      estimated_price_max: form.estimated_price_max,
      estimated_time: parsed.data.estimated_time?.trim() || null,
      can_pickup: parsed.data.can_pickup,
    })

    await markQuoteTokenUsed(admin, resolved.record.token_hash)

    return json({
      ok: true,
      already_sent: result.already_sent ?? false,
    }, 200, corsHeaders)
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Okänt fel'
    const message = friendlyDatabaseError(rawMessage)
    console.error('submit-workshop-quote-link', rawMessage)
    return json({ error: message }, 400, corsHeaders)
  }
})
