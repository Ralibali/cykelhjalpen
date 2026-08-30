// Stänger cykelärenden som är äldre än fem dagar.
//
// Verkstäder har fem dagar på sig att lämna offert. Därefter stängs ärendet
// för nya svar och kunden får ett mejl med en sammanställning av de offerter
// som kommit in (eller besked om att inga offerter kom in).
//
// Kan köras schemalagt (utan JWT) eller manuellt av admin.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsFor } from '../_shared/cors.ts'
import { buildRepostUrl, shouldCloseRequest, HOUR_MS } from '../_shared/v2/lifecycle.ts'
import { citySlugFromName } from '../_shared/v2/config-schema.ts'

const RESPONSE_WINDOW_DAYS = 5

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

interface ResponseRow {
  id: string
  estimated_price_min: number | null
  estimated_price_max: number | null
  estimated_time: string | null
  status: string
  workshops: { company_name: string | null } | null
}

const priceLabel = (row: ResponseRow, lang: 'sv' | 'en') => {
  if (row.estimated_price_min == null && row.estimated_price_max == null) {
    return lang === 'en' ? 'Price on inspection' : 'Pris efter besiktning'
  }
  if (row.estimated_price_min != null && row.estimated_price_max != null && row.estimated_price_min !== row.estimated_price_max) {
    return `${row.estimated_price_min}–${row.estimated_price_max} kr`
  }
  return `${row.estimated_price_max ?? row.estimated_price_min} kr`
}

Deno.serve(async (req) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  if (req.method !== 'POST') return json({ error: 'Metoden stöds inte.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Backend-konfiguration saknas.' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const cutoff = new Date(Date.now() - RESPONSE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: stale, error } = await admin
      .from('bike_repair_requests')
      .select('id, view_token, customer_name, customer_email, customer_language, city, bike_type, repair_category, created_at, status')
      .eq('admin_status', 'approved')
      .in('status', ['new', 'has_offers'])
      .lt('created_at', cutoff)
      .limit(100)

    if (error) throw error

    // V2: ärenden med en utförd extend_window-räddningsåtgärd (v2_rescue_actions)
    // får sju dygn i stället för fem. Utan räddningsrader ändras inget.
    const staleIds = (stale || []).map((row) => row.id as string)
    const extendedIds = new Set<string>()
    if (staleIds.length > 0) {
      const { data: extensions } = await admin
        .from('v2_rescue_actions')
        .select('request_id')
        .in('request_id', staleIds)
        .eq('action_type', 'extend_window')
        .eq('status', 'executed')
      for (const row of extensions || []) extendedIds.add(row.request_id as string)
    }

    const closed: string[] = []
    let emailsSent = 0

    for (const request of stale || []) {
      const ageHours = (Date.now() - new Date(request.created_at as string).getTime()) / HOUR_MS
      if (!shouldCloseRequest(ageHours, extendedIds.has(request.id))) continue

      const { data: responses } = await admin
        .from('workshop_responses')
        .select('id, estimated_price_min, estimated_price_max, estimated_time, status, workshops(company_name)')
        .eq('request_id', request.id)
        .in('status', ['sent', 'won'])

      const offers = (responses || []) as unknown as ResponseRow[]
      const nextStatus = offers.length > 0 ? 'closed_for_responses' : 'expired'

      const { error: updateError } = await admin
        .from('bike_repair_requests')
        .update({ status: nextStatus, updated_at: new Date().toISOString(), closed_at: nextStatus === 'closed_for_responses' ? new Date().toISOString() : null })
        .eq('id', request.id)
        .in('status', ['new', 'has_offers'])

      if (updateError) {
        console.error('close-stale-bike-requests update', request.id, updateError.message)
        continue
      }
      closed.push(request.id)

      const lang = request.customer_language === 'en' ? 'en' : 'sv'
      const link = `https://cykelhjalpen.se/mitt-arende/${request.view_token}`

      const rows = offers.map((offer) => `
        <tr>
          <td style="padding:8px 12px 8px 0;border-bottom:1px solid #E5E7EB"><strong>${escapeHtml(offer.workshops?.company_name || (lang === 'en' ? 'Workshop' : 'Verkstad'))}</strong></td>
          <td style="padding:8px 12px 8px 0;border-bottom:1px solid #E5E7EB">${escapeHtml(priceLabel(offer, lang))}</td>
          <td style="padding:8px 0;border-bottom:1px solid #E5E7EB">${escapeHtml(offer.estimated_time || '—')}</td>
        </tr>`).join('')

      const subject = offers.length > 0
        ? (lang === 'en'
          ? `Your bike request is closed – ${offers.length} quote${offers.length > 1 ? 's' : ''} to compare`
          : `Ditt cykelärende är stängt – ${offers.length} offert${offers.length > 1 ? 'er' : ''} att jämföra`)
        : (lang === 'en' ? 'Your bike request has expired' : 'Ditt cykelärende har gått ut')

      const html = offers.length > 0
        ? (lang === 'en'
          ? `
            <h2 style="margin:0 0 16px">Time is up – here are your quotes</h2>
            <p>Hi ${escapeHtml(request.customer_name)}, workshops had five days to reply to your request (${escapeHtml(request.repair_category)}, ${escapeHtml(request.city)}). The request is now closed for new quotes.</p>
            <table style="border-collapse:collapse;margin:16px 0;width:100%">${rows}</table>
            <p>Pick the workshop you want to go with – you get their contact details straight away.</p>
            <p style="margin-top:24px"><a href="${link}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Compare and choose</a></p>`
          : `
            <h2 style="margin:0 0 16px">Tiden är ute – här är dina offerter</h2>
            <p>Hej ${escapeHtml(request.customer_name)}, verkstäderna hade fem dagar på sig att svara på ditt ärende (${escapeHtml(request.repair_category)}, ${escapeHtml(request.city)}). Ärendet är nu stängt för nya offerter.</p>
            <table style="border-collapse:collapse;margin:16px 0;width:100%">${rows}</table>
            <p>Välj den verkstad du vill gå vidare med – du får kontaktuppgifterna direkt.</p>
            <p style="margin-top:24px"><a href="${link}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Jämför och välj</a></p>`)
        : (lang === 'en'
          ? `
            <h2 style="margin:0 0 16px">No quotes this time</h2>
            <p>Hi ${escapeHtml(request.customer_name)}, unfortunately no workshop in ${escapeHtml(request.city)} replied within five days, so your request is now closed.</p>
            <p>You are welcome to post a new request – it is free and often gets a reply within a day.</p>
            <p style="margin-top:24px"><a href="${buildRepostUrl(citySlugFromName(request.city))}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Post a new request</a></p>`
          : `
            <h2 style="margin:0 0 16px">Inga offerter den här gången</h2>
            <p>Hej ${escapeHtml(request.customer_name)}, tyvärr svarade ingen verkstad i ${escapeHtml(request.city)} inom fem dagar, så ditt ärende är nu stängt.</p>
            <p>Du är varmt välkommen att lägga upp ett nytt ärende – det är gratis och får oftast svar inom ett dygn.</p>
            <p style="margin-top:24px"><a href="${buildRepostUrl(citySlugFromName(request.city))}" style="display:inline-block;background:#4338CA;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">Lägg upp nytt ärende</a></p>`)

      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({ to: request.customer_email, subject, html }),
        })
        if (emailResponse.ok) emailsSent += 1
        else console.error('close-stale-bike-requests email', request.id, emailResponse.status)
      } catch (emailError) {
        console.error('close-stale-bike-requests email', request.id, emailError)
      }
    }

    return json({ ok: true, checked: (stale || []).length, closed: closed.length, emails_sent: emailsSent })
  } catch (error) {
    console.error('close-stale-bike-requests', error)
    return json({ error: error instanceof Error ? error.message : 'Något gick fel.' }, 500)
  }
})
