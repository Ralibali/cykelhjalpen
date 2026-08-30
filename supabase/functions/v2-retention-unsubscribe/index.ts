// v2-retention-unsubscribe (S8) — publik token-endpoint för avregistrering.
// Contract: docs/v2/CONTRACTS.md §3.7.
//   POST { "token": uuid } → { "ok": true } — sätter unsubscribed_at och
//     undertrycker alla schemalagda icke-transaktionella meddelanden.
//   GET ?token=uuid → minimal HTML-sida med bekräftelseknapp (mejllänkar kan
//     inte POST:a; sidan anropar POST via fetch). ?confirm=1 utför direkt
//     (engångslänk i mejl) och visar en bekräftelse.
// Token läcker ingen data: inga namn/e-post returneras, bara ok/fel.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { emitDomainEvent } from '../_shared/v2/events.ts'

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function unsubscribe(supabaseUrl: string, serviceRoleKey: string, token: string): Promise<boolean> {
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const nowIso = new Date().toISOString()

  const { data: contact, error } = await admin
    .from('v2_retention_contacts')
    .select('id, workshop_id, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle()
  if (error || !contact) return false

  const { data: updated } = await admin
    .from('v2_retention_contacts')
    .update({ unsubscribed_at: nowIso, updated_at: nowIso })
    .eq('id', contact.id)
    .is('unsubscribed_at', null)
    .select('id')
  const firstUnsubscribe = (updated?.length ?? 0) > 0

  // Undertryck allt schemalagt som inte redan gått ut. Transaktionella mejl
  // planeras aldrig via retention-pipelinen, så alla scheduled-rader ryker.
  await admin
    .from('v2_lifecycle_messages')
    .update({ status: 'suppressed', updated_at: nowIso })
    .eq('contact_id', contact.id)
    .eq('status', 'scheduled')

  // Eventkatalog §4: retention.unsubscribed (best-effort, flagg-gated internt).
  if (firstUnsubscribe) {
    await emitDomainEvent(admin, {
      eventName: 'retention.unsubscribed',
      actorType: contact.workshop_id ? 'workshop' : 'customer',
      workshopId: contact.workshop_id,
      payload: { kind: 'all', channel: 'email' },
    })
  }

  return true
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.', code: 'config' }, 500)

  const url = new URL(req.url)

  if (req.method === 'GET') {
    const token = url.searchParams.get('token') ?? ''
    if (!TOKEN_RE.test(token)) {
      return page('Ogiltig länk', 'Länken verkar inte vara hel. Kopiera hela länken från mejlet och försök igen.')
    }
    if (url.searchParams.get('confirm') === '1') {
      const ok = await unsubscribe(supabaseUrl, serviceRoleKey, token)
      return ok
        ? page('Avregistrerad', 'Du får inte längre den här typen av mejl från Cykelhjälpen. Transaktionella mejl om dina pågående ärenden påverkas inte.')
        : page('Något gick fel', 'Vi kunde inte hitta din registrering. Kontakta info@cykelhjalpen.se så hjälper vi dig.')
    }
    // Bekräftelsesteg: skyddar mot att mejlklienters länk-skanning avregistrerar.
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

  if (req.method === 'POST') {
    let token = ''
    try {
      const body = await req.json()
      token = typeof body?.token === 'string' ? body.token : ''
    } catch {
      return json({ error: 'Ogiltig begäran.', code: 'bad_request' }, 400)
    }
    if (!TOKEN_RE.test(token)) return json({ error: 'Ogiltig token.', code: 'bad_token' }, 400)

    await unsubscribe(supabaseUrl, serviceRoleKey, token)
    // Svara ok även vid okänd token: endpointen ska inte avslöja vilka token
    // som finns. Contract: { "ok": true }.
    return json({ ok: true })
  }

  return json({ error: 'Metoden stöds inte.', code: 'method_not_allowed' }, 405)
})
