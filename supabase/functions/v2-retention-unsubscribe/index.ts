// v2-retention-unsubscribe — EN publik avregistrering för HELA S8 (kund +
// verkstad). Kontrakt: docs/v2/CONTRACTS.md §3.7.
//
// Sammanslagning (merge v2/customer-retention + v2/workshop-retention):
// båda sidorna använder SAMMA tokenformat (uuid `unsubscribe_token` på den
// delade tabellen v2_retention_contacts) och samma suppressionseffekt, så ett
// klick avregistrerar kontakten från ALLA retention-utskick (kundpåminnelser
// + verkstadscadences) — schemalagda meddelanden markeras 'suppressed'.
//
// Två klientytor på samma endpoint:
//   GET  ?token=<uuid>  + Accept: text/html  → bekräftelsesida (HTML) med
//        knapp (verkstadsmejl länkar hit direkt; ?confirm=1 utför direkt).
//   GET  ?token=<uuid>  (API/fetch)          → { ok, already_unsubscribed }
//        (status till frontend-sidan /avsluta-paminnelser/:token).
//   POST { token }       → { ok: true }       (utför avregistreringen,
//        idempotent: samma POST två gånger ger samma slutstatus).
//
// Token läcker ingen data: HTML-flödet visar en generisk felsida vid okänd
// token och inga namn/e-post returneras någonsin.
// Transaktionella meddelanden (pågående ärendeinformation) rörs ALDRIG.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ContactRow {
  id: string
  workshop_id: string | null
  consent_basis: string
  unsubscribed_at: string | null
}

async function findContact(admin: ReturnType<typeof createClient>, token: string): Promise<ContactRow | null> {
  const { data } = await admin.from('v2_retention_contacts')
    .select('id, workshop_id, consent_basis, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle()
  return (data as ContactRow | null) ?? null
}

/** Avregistrera kontakten + suppressa alla schemalagda meddelanden (båda lanorna). */
async function unsubscribe(admin: ReturnType<typeof createClient>, contact: ContactRow): Promise<void> {
  const nowIso = new Date().toISOString()
  const { data: updated, error } = await admin.from('v2_retention_contacts')
    .update({ unsubscribed_at: nowIso, updated_at: nowIso })
    .eq('id', contact.id)
    .is('unsubscribed_at', null)
    .select('id')
  if (error) throw error
  const firstUnsubscribe = (updated?.length ?? 0) > 0

  // Transaktionella meddelanden rörs aldrig (kontrakt §2.7 hårda regel).
  if (contact.consent_basis !== 'transactional') {
    const { error: suppressError } = await admin.from('v2_lifecycle_messages')
      .update({ status: 'suppressed', updated_at: nowIso })
      .eq('contact_id', contact.id)
      .eq('status', 'scheduled')
    if (suppressError) console.error('suppress scheduled failed', suppressError.message)
  }

  if (firstUnsubscribe) {
    await emitDomainEvent(admin, {
      eventName: 'retention.unsubscribed',
      actorType: contact.workshop_id ? 'workshop' : 'customer',
      workshopId: contact.workshop_id,
      payload: { kind: 'all', channel: 'email' },
    })
  }
}

const page = (title: string, body: string): Response =>
  new Response(
    `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
     <body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#F5F5F7;display:flex;justify-content:center;padding:48px 16px">
       <div style="max-width:480px;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:32px">
         <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
         <p style="font-size:15px;line-height:1.6;color:#374151;margin:0">${body}</p>
       </div>
     </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )

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
    if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: 'config' }, 500)
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    const url = new URL(req.url)
    const rawToken = req.method === 'GET'
      ? url.searchParams.get('token')
      : (await req.json().catch(() => ({})) as { token?: unknown })?.token
    const token = typeof rawToken === 'string' ? rawToken : ''

    const wantsHtml = req.method === 'GET'
      && (req.headers.get('Accept') ?? '').includes('text/html')

    if (!TOKEN_RE.test(token)) {
      if (wantsHtml) {
        return page('Ogiltig länk', 'Länken verkar inte vara hel. Kopiera hela länken från mejlet och försök igen.')
      }
      return json({ ok: false, error: 'invalid_token' }, 400)
    }

    if (req.method === 'GET' && wantsHtml) {
      // Bekräftelsesteg skyddar mot att mejlklienters länk-skanning avregistrerar.
      if (url.searchParams.get('confirm') === '1') {
        const contact = await findContact(admin, token)
        if (!contact) {
          return page('Något gick fel', 'Vi kunde inte hitta din registrering. Kontakta info@cykelhjalpen.se så hjälper vi dig.')
        }
        await unsubscribe(admin, contact)
        return page('Avregistrerad', 'Du får inte längre den här typen av mejl från Cykelhjälpen. Transaktionella mejl om dina pågående ärenden påverkas inte.')
      }
      return new Response(
        `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Avregistrera</title></head>
         <body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#F5F5F7;display:flex;justify-content:center;padding:48px 16px">
           <div style="max-width:480px;background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:32px">
             <h1 style="font-size:20px;margin:0 0 12px">Avregistrera mejl</h1>
             <p style="font-size:15px;line-height:1.6;color:#374151">Vill du sluta ta emot påminnelser, veckosammanfattningar och tips från Cykelhjälpen?</p>
             <button id="stop" style="margin-top:16px;background:#4338CA;color:#fff;border:0;padding:12px 20px;border-radius:8px;font-size:15px;cursor:pointer">Ja, avregistrera mig</button>
             <p id="done" style="display:none;font-size:15px;color:#374151">Klart – du är avregistrerad.</p>
           </div>
           <script>
             document.getElementById('stop').addEventListener('click', async () => {
               const res = await fetch(location.pathname, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ token: ${JSON.stringify(token)} }),
               })
               if (res.ok) {
                 document.getElementById('stop').style.display = 'none'
                 document.getElementById('done').style.display = 'block'
               }
             })
           </script>
         </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }

    // API-flöde (frontend-sidan + POST från bekräftelseknappen).
    const contact = await findContact(admin, token)
    if (!contact) return json({ ok: false, error: 'invalid_token' }, 404)

    if (req.method === 'GET') {
      return json({ ok: true, already_unsubscribed: Boolean(contact.unsubscribed_at) })
    }
    if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)

    await unsubscribe(admin, contact)
    return json({ ok: true, already_unsubscribed: true })
  } catch (error) {
    console.error('v2-retention-unsubscribe', error)
    return json({ ok: false, error: 'Kunde inte slutföra avregistreringen just nu.' }, 500)
  }
})
