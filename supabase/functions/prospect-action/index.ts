// Admin-only: åtgärder på prospects.
// action: 'approve' | 'reject' | 'do_not_contact' | 'convert' | 'prepare_draft' | 'update_draft' | 'approve_draft'
// SKICKAR INGET externt. Alla utkast är inaktiva tills admin uttryckligen anropar prospect-send-outreach.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { buildEmailDraft, unsubscribeUrl } from '../_shared/outreach.ts'
import { looksLikeBusinessEmail } from '../_shared/prospect.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

type Action =
  | 'approve'
  | 'reject'
  | 'do_not_contact'
  | 'convert'
  | 'prepare_draft'
  | 'update_draft'
  | 'approve_draft'

interface Body {
  prospect_id?: string
  activity_id?: string
  action: Action
  channel?: 'email' | 'sms'
  note?: string
  subject?: string
  message?: string
}

const buildSmsDraft = (prospect: { company_name: string; city: string; unsubscribe_token: string }) => {
  const first = prospect.company_name.split(/\s+/)[0] || 'ni'
  return {
    subject: null as string | null,
    message: `Hej ${first}! Christoffer på Cykelhjalpen.se – vi kopplar cykelägare i ${prospect.city} med lokala verkstäder. Vill ni testa? Fem första kundförfrågningarna är gratis. Läs mer: https://cykelhjalpen.se/for-verkstader. Avreg: ${unsubscribeUrl(prospect.unsubscribe_token)}`,
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
    if (!body?.action) throw new Error('action krävs')

    // Åtgärder som verkar direkt på ett utkast
    if (body.action === 'update_draft' || body.action === 'approve_draft') {
      if (!body.activity_id) throw new Error('activity_id krävs')
      const { data: activity, error: actErr } = await admin
        .from('outreach_activities').select('*').eq('id', body.activity_id).maybeSingle()
      if (actErr) throw actErr
      if (!activity) throw new Error('Utkastet hittades inte')
      if (!['draft', 'pending_approval', 'approved', 'failed'].includes(activity.status)) {
        throw new Error(`Utkastet är låst (status: ${activity.status})`)
      }
      if (body.action === 'update_draft') {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (typeof body.subject === 'string') patch.subject = body.subject
        if (typeof body.message === 'string') patch.message = body.message
        // Redigering återställer till draft så det tydligt måste godkännas igen
        patch.status = 'draft'
        patch.approved_at = null
        patch.approved_by = null
        const { error } = await admin.from('outreach_activities').update(patch).eq('id', activity.id)
        if (error) throw error
      } else {
        const { error } = await admin.from('outreach_activities').update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userData.user.id,
        }).eq('id', activity.id)
        if (error) throw error
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!body.prospect_id) throw new Error('prospect_id krävs')
    const { data: prospect, error: prospectError } = await admin
      .from('workshop_prospects')
      .select('*')
      .eq('id', body.prospect_id)
      .maybeSingle()
    if (prospectError) throw prospectError
    if (!prospect) throw new Error('Prospekt hittades inte')
    if (prospect.do_not_contact && body.action !== 'do_not_contact') {
      throw new Error('Prospektet är markerat som do-not-contact.')
    }

    if (body.action === 'approve') {
      await admin.from('workshop_prospects').update({ status: 'approved_for_contact' }).eq('id', prospect.id)
    } else if (body.action === 'reject') {
      await admin.from('workshop_prospects').update({ status: 'rejected', notes: body.note ?? prospect.notes }).eq('id', prospect.id)
    } else if (body.action === 'do_not_contact') {
      await admin.from('workshop_prospects').update({ do_not_contact: true, notes: body.note ?? prospect.notes }).eq('id', prospect.id)
    } else if (body.action === 'convert') {
      await admin.from('workshop_prospects').update({ status: 'converted' }).eq('id', prospect.id)
    } else if (body.action === 'prepare_draft') {
      const channel = body.channel || 'email'
      const recipient = channel === 'email' ? prospect.email : prospect.phone
      if (!recipient) throw new Error(`Saknar ${channel === 'email' ? 'e-post' : 'telefonnummer'} för utkast`)
      if (channel === 'email' && !looksLikeBusinessEmail(prospect.normalized_email)) {
        throw new Error('E-postadressen ser inte ut som ett publikt företagsmejl – utkast blockerat.')
      }
      const { data: blocked } = await admin
        .from('contact_suppression')
        .select('id')
        .eq('contact_type', channel === 'email' ? 'email' : 'phone')
        .eq('value', channel === 'email' ? prospect.normalized_email : prospect.normalized_phone)
        .maybeSingle()
      if (blocked) throw new Error('Kontakten finns i suppression-listan')

      const draft = channel === 'email'
        ? buildEmailDraft({
            company_name: prospect.company_name,
            city: prospect.city,
            website: prospect.website,
            ai_summary: prospect.ai_summary,
            services: prospect.services,
            unsubscribe_token: prospect.unsubscribe_token,
          })
        : buildSmsDraft({ company_name: prospect.company_name, city: prospect.city, unsubscribe_token: prospect.unsubscribe_token })

      const { data: activity, error: activityError } = await admin
        .from('outreach_activities')
        .insert({
          prospect_id: prospect.id,
          channel,
          direction: 'outbound',
          status: 'draft',
          subject: draft.subject,
          message: channel === 'email' ? (draft as { text: string }).text : (draft as { message: string }).message,
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
    const err = error as { message?: string; details?: string; hint?: string; code?: string }
    const message = err?.message || err?.details || err?.hint || 'Okänt fel'
    console.error('prospect-action failed:', JSON.stringify({
      message: err?.message, details: err?.details, hint: err?.hint, code: err?.code,
    }))
    const status = message === 'unauthenticated' ? 401 : message === 'forbidden' ? 403 : 400
    return new Response(JSON.stringify({ error: message, code: err?.code, details: err?.details }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
