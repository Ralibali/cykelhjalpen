// Behörighet för interna verktyg (AI-generering m.m.) som anropas från
// adminpanelen med användarens JWT eller internt med service role-nyckeln.
//
// verify_jwt = true räcker inte: den publika anon-nyckeln är också en giltig
// JWT, så utan den här kontrollen kan vem som helst anropa funktionerna.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { timingSafeEqual } from './cron-auth.ts'

export async function isAdminOrServiceRequest(req: Request): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) return false

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  if (timingSafeEqual(token, serviceRoleKey)) return true

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: userData, error } = await admin.auth.getUser(token)
  if (error || !userData.user) return false
  const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userData.user.id })
  return isAdmin === true
}

export function forbiddenResponse(headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Åtkomst nekad.', code: 'forbidden' }), {
    status: 403,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
