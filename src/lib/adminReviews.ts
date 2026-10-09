import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

export type ReviewState = 'submitted' | 'verified' | 'published' | 'flagged' | 'rejected' | 'removed'
export type OutcomeState = 'pending' | 'reported_by_workshop' | 'confirmed_by_customer' | 'completed' | 'no_show' | 'cancelled' | 'disputed' | 'expired'
export interface AdminReview {
  id: string
  rating: number
  body: string | null
  state: ReviewState
  workshop_response: string | null
  created_at: string | null
  moderated_at: string | null
  moderation_note: string | null
  workshops: { company_name: string; city: string } | null
  v2_job_outcomes: { state: OutcomeState; final_price_sek: number | null } | null
}

export async function loadAdminReviews(client: SupabaseClient<Database>): Promise<{ reviews: AdminReview[]; canModerate: boolean }> {
  const result = await client.from('v2_reviews')
    .select('id, rating, body, state, workshop_response, created_at, moderated_at, moderation_note, workshops(company_name, city), v2_job_outcomes(state, final_price_sek)')
    .order('created_at', { ascending: false }).limit(200)
  if (!result.error) return { reviews: (result.data ?? []) as unknown as AdminReview[], canModerate: true }
  // Missing optional schema is different from authorization/network failure.
  if (!['PGRST205', '42P01'].includes(result.error.code)) throw result.error
  const legacy = await client.from('reviews')
    .select('id, rating, comment, created_at, profiles!reviews_supplier_id_fkey(company_name, city)')
    .order('created_at', { ascending: false }).limit(200)
  if (legacy.error) throw legacy.error
  return {
    canModerate: false,
    reviews: (legacy.data ?? []).map(row => ({
      id: row.id, rating: row.rating, body: row.comment, created_at: row.created_at,
      state: 'published', workshop_response: null, moderated_at: null, moderation_note: null,
      workshops: row.profiles ? { company_name: row.profiles.company_name || 'Kundrecension', city: row.profiles.city || '' } : null,
      v2_job_outcomes: null,
    })),
  }
}
