// Publik edge function för klickspårning i rekryteringsmejl. verify_jwt = false.
//
// GET ?a=<activity_id>&t=<unsubscribe_token>
//   • loggar klicket i outreach_clicks (om tokenet stämmer mot prospektet)
//   • 302-vidarebefordrar ALLTID till /for-cykelverkstader – även vid fel, så att
//     mottagaren aldrig fastnar på en felsida
//
// Token-kravet gör att activity-id inte kan gissas för att fabricera statistik.
// Dubbelklick och automatiska skanningar inom en minut räknas bara en gång.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { CLICK_REDIRECT_URL } from '../_shared/outreach.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Klick på samma utskick inom det här fönstret dedupliceras (skannrar i
// mejlfilter öppnar ofta länken direkt vid leverans).
const DEDUPE_WINDOW_MS = 60_000

const redirect = (): Response =>
  new Response(null, {
    status: 302,
    headers: {
      Location: CLICK_REDIRECT_URL,
      'Cache-Control': 'no-store',
    },
  })

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // Versionsmärke – gör det möjligt att utifrån verifiera att rätt kod är deployad.
    return new Response(JSON.stringify({ error: 'method not allowed', version: '2026-07-30-clicktrack' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const activityId = url.searchParams.get('a') ?? ''
    const token = url.searchParams.get('t') ?? ''
    if (!UUID_RE.test(activityId) || !UUID_RE.test(token)) return redirect()

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: activity } = await admin
      .from('outreach_activities')
      .select('id, prospect_id')
      .eq('id', activityId)
      .maybeSingle()
    if (!activity) return redirect()

    const { data: prospect } = await admin
      .from('workshop_prospects')
      .select('id, unsubscribe_token')
      .eq('id', activity.prospect_id)
      .maybeSingle()
    if (!prospect || prospect.unsubscribe_token !== token) return redirect()

    // Dedup: räkna bara första klicket per utskick inom en minut.
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
    const { data: recent } = await admin
      .from('outreach_clicks')
      .select('id')
      .eq('activity_id', activity.id)
      .gte('clicked_at', since)
      .limit(1)
    if (!recent || recent.length === 0) {
      const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 300)
      await admin.from('outreach_clicks').insert({
        activity_id: activity.id,
        prospect_id: prospect.id,
        user_agent: userAgent || null,
      })
    }
  } catch (error) {
    // Logga men svälj – mottagaren ska alltid landa på registreringssidan.
    console.error('outreach-click error', error)
  }

  return redirect()
})
