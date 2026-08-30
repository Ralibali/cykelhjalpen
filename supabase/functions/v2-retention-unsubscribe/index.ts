// v2-retention-unsubscribe — publik avregistrering från påminnelsemejl (S8).
// Kontrakt: docs/v2/CONTRACTS.md §3.7. Publik token-länk (unsubscribe_token på
// v2_retention_contacts), ingen inloggning — kunder är kontolösa.
//
//   GET  ?token=<uuid>  → { ok, already_unsubscribed }   (status till sidan)
//   POST { token }       → { ok: true }                   (utför avregistrering)
//
// Effekt: unsubscribed_at sätts + alla schemalagda icke-transaktionella
// meddelanden för kontakten markeras 'suppressed' (kontrakt §2.7 hårda regel).
// Idempotent: samma POST två gånger ger samma slutstatus.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'

const TokenSchema = z.string().uuid()

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) throw new Error('backend configuration missing')
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const rawToken = req.method === 'GET'
      ? new URL(req.url).searchParams.get('token')
      : (await req.json().catch(() => ({})) as { token?: unknown })?.token
    const parsed = TokenSchema.safeParse(rawToken)
    if (!parsed.success) return json({ ok: false, error: 'invalid_token' }, 400)

    const { data: contact } = await admin.from('v2_retention_contacts')
      .select('id, consent_basis, unsubscribed_at')
      .eq('unsubscribe_token', parsed.data)
      .maybeSingle()
    if (!contact) return json({ ok: false, error: 'invalid_token' }, 404)

    if (req.method === 'GET') {
      return json({ ok: true, already_unsubscribed: Boolean(contact.unsubscribed_at) })
    }
    if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

    if (!contact.unsubscribed_at) {
      const nowIso = new Date().toISOString()
      const { error } = await admin.from('v2_retention_contacts')
        .update({ unsubscribed_at: nowIso, updated_at: nowIso })
        .eq('id', contact.id)
      if (error) throw error

      // Transaktionella meddelanden (t.ex. pågående ärendeinformation) rörs aldrig.
      if (contact.consent_basis !== 'transactional') {
        const { error: suppressError } = await admin.from('v2_lifecycle_messages')
          .update({ status: 'suppressed' })
          .eq('contact_id', contact.id)
          .eq('status', 'scheduled')
        if (suppressError) console.error('suppress scheduled failed', suppressError.message)
      }

      await emitDomainEvent(admin, {
        eventName: 'retention.unsubscribed',
        actorType: 'customer',
        payload: { channel: 'email' },
      })
    }

    return json({ ok: true, already_unsubscribed: true })
  } catch (error) {
    console.error('v2-retention-unsubscribe', error)
    return json({ ok: false, error: 'Kunde inte slutföra avregistreringen just nu.' }, 500)
  }
})
