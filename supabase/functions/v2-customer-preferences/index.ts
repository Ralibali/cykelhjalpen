// v2-customer-preferences — token-gated samtyckeshantering för kunder (S8).
// Kunder är kontolösa: åtkomst sker via ärendets view_token (samma mönster som
// get-bike-request-by-token). Opt-in lagras som v2_retention_contacts-rad med
// consent_basis='marketing_consent'; opt-out sätter unsubscribed_at och
// suppressar schemalagda meddelanden (samma hårda regel som §2.7).
//
//   POST { token, action: 'get' }
//     → { ok: true, reminder_opt_in: boolean }
//   POST { token, action: 'set', reminder_opt_in: boolean }
//     → { ok: true, reminder_opt_in: boolean }

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'

const BodySchema = z.discriminatedUnion('action', [
  z.object({ token: z.string().uuid(), action: z.literal('get') }),
  z.object({ token: z.string().uuid(), action: z.literal('set'), reminder_opt_in: z.boolean() }),
])

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

  try {
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return json({ ok: false, error: 'invalid_request' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('backend configuration missing')
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Token validerar ärendet; e-post hämtas server-side och lämnar aldrig svaret.
    const { data: request } = await admin.from('bike_repair_requests')
      .select('id, customer_email')
      .eq('view_token', parsed.data.token)
      .maybeSingle()
    if (!request) return json({ ok: false, error: 'invalid_token' }, 404)

    const subjectKey = await sha256Hex(request.customer_email.trim().toLowerCase())
    const { data: contact } = await admin.from('v2_retention_contacts')
      .select('id, consent_basis, unsubscribed_at')
      .eq('subject_type', 'customer')
      .eq('subject_key', subjectKey)
      .maybeSingle()

    if (parsed.data.action === 'get') {
      const optedIn = Boolean(
        contact && contact.consent_basis === 'marketing_consent' && !contact.unsubscribed_at,
      )
      return json({ ok: true, reminder_opt_in: optedIn })
    }

    const nowIso = new Date().toISOString()
    if (parsed.data.reminder_opt_in) {
      // Explicit opt-in: skapa/återaktivera kontakten med marknadssamtycke.
      const { error } = await admin.from('v2_retention_contacts').upsert({
        subject_type: 'customer',
        subject_key: subjectKey,
        consent_basis: 'marketing_consent',
        consent_at: nowIso,
        unsubscribed_at: null,
        lifecycle_stage: 'active',
        updated_at: nowIso,
      }, { onConflict: 'subject_type,subject_key' })
      if (error) throw error
      return json({ ok: true, reminder_opt_in: true })
    }

    // Opt-out på token-sidan = samma verkning som avregistreringslänken.
    if (contact) {
      const { error } = await admin.from('v2_retention_contacts')
        .update({ unsubscribed_at: nowIso, updated_at: nowIso })
        .eq('id', contact.id)
      if (error) throw error
      if (contact.consent_basis !== 'transactional') {
        await admin.from('v2_lifecycle_messages')
          .update({ status: 'suppressed' })
          .eq('contact_id', contact.id)
          .eq('status', 'scheduled')
      }
    }
    return json({ ok: true, reminder_opt_in: false })
  } catch (error) {
    console.error('v2-customer-preferences', error)
    return json({ ok: false, error: 'Kunde inte spara inställningen just nu.' }, 500)
  }
})
