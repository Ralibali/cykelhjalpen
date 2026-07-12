// Admin-only: åtgärder på prospects.
// action: 'approve' | 'reject' | 'do_not_contact' | 'convert' | 'prepare_draft'
// SKICKAR INTE något externt – förbereder endast utkast i outreach_activities som status='draft'.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

type Action = 'approve' | 'reject' | 'do_not_contact' | 'convert' | 'prepare_draft'

interface Body {
  prospect_id: string
  action: Action
  channel?: 'email' | 'sms'
  note?: string
}

const buildDraft = (channel: 'email' | 'sms', prospect: {
  company_name: string
  city: string
  ai_summary?: string | null
}) => {
  const first = prospect.company_name.split(/\s+/)[0] || 'ni'
  if (channel === 'sms') {
    return {
      subject: null as string | null,
      message: `Hej ${first}! Cykelhjälpen kopplar cykelägare i ${prospect.city} med lokala verkstäder. Vill ni ha en gratis introduktion? Läs mer på cykelhjalpen.se/for-verkstader eller svara på detta SMS.`,
    }
  }
  const summary = prospect.ai_summary ? `\n\nVi såg att ni ${prospect.ai_summary.slice(0, 220).trim()}.` : ''
  return {
    subject: `Nya cykelkunder i ${prospect.city} via Cykelhjälpen`,
    message: `Hej ${first},

Jag heter [DITT NAMN] från Cykelhjälpen – vi hjälper cykelägare i ${prospect.city} att hitta lokala verkstäder som er.${summary}

Vi tar inga fasta månadsavgifter – ni betalar enbart för ledtrådar ni väljer att svara på. De första fem är gratis så att ni kan testa flödet utan risk.

Hör gärna av er om ni vill veta mer eller boka en kort demo. All info finns även på https://cykelhjalpen.se/for-verkstader

Vänliga hälsningar,
Cykelhjälpen
info@cykelhjalpen.se`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('unauthenticated')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) throw new Error('unauthenticated')
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
    if (profile?.role !== 'admin') throw new Error('forbidden')

    const body = await req.json() as Body
    if (!body?.prospect_id || !body?.action) throw new Error('prospect_id och action krävs')

    const { data: prospect, error: prospectError } = await admin
      .from('workshop_prospects')
      .select('*')
      .eq('id', body.prospect_id)
      .maybeSingle()
    if (prospectError) throw prospectError
    if (!prospect) throw new Error('Prospekt hittades inte')

    if (body.action === 'approve') {
      await admin.from('workshop_prospects').update({ status: 'approved_for_contact' }).eq('id', prospect.id)
    } else if (body.action === 'reject') {
      await admin.from('workshop_prospects').update({ status: 'rejected', notes: body.note ?? prospect.notes }).eq('id', prospect.id)
    } else if (body.action === 'do_not_contact') {
      // Triggern sync_prospect_suppression sätter status och skriver till suppression.
      await admin.from('workshop_prospects').update({ do_not_contact: true, notes: body.note ?? prospect.notes }).eq('id', prospect.id)
    } else if (body.action === 'convert') {
      // Skapa endast en notis + markera – vi bjuder aldrig in externt automatiskt.
      await admin.from('workshop_prospects').update({ status: 'converted' }).eq('id', prospect.id)
    } else if (body.action === 'prepare_draft') {
      const channel = body.channel || 'email'
      if (prospect.do_not_contact) throw new Error('Prospekt är markerat som do-not-contact')
      const recipient = channel === 'email' ? prospect.email : prospect.phone
      if (!recipient) throw new Error(`Saknar ${channel === 'email' ? 'e-post' : 'telefonnummer'} för utkast`)
      // Kontrollera suppression
      const { data: blocked } = await admin
        .from('contact_suppression')
        .select('id')
        .eq('contact_type', channel === 'email' ? 'email' : 'phone')
        .eq('value', channel === 'email' ? prospect.normalized_email : prospect.normalized_phone)
        .maybeSingle()
      if (blocked) throw new Error('Kontakten finns i suppression-listan')

      const draft = buildDraft(channel, prospect)
      const { data: activity, error: activityError } = await admin
        .from('outreach_activities')
        .insert({
          prospect_id: prospect.id,
          channel,
          direction: 'outbound',
          status: 'draft',
          subject: draft.subject,
          message: draft.message,
          recipient,
          performed_by: userData.user.id,
        })
        .select('*')
        .maybeSingle()
      if (activityError) throw activityError
      return new Response(JSON.stringify({ ok: true, activity }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      throw new Error('Okänd action')
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Okänt fel'
    const status = message === 'unauthenticated' ? 401 : message === 'forbidden' ? 403 : 400
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
