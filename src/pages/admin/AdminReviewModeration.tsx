// V2 S3: modereringskö för recensioner + outcome-översikt.
// Visar väntande (submitted/flagged) recensioner överst; publicering kräver
// completion evidence — v2-moderate-review avvisar publish utan completed
// outcome (I5), UI:t speglar det genom att visa outcome-statet.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import CykelAdminLayout from '@/components/cykelhjalpen/CykelAdminLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { V2ModerateReviewRequest } from '@/lib/v2/contracts'

type ReviewState = 'submitted' | 'verified' | 'published' | 'flagged' | 'rejected' | 'removed'
type OutcomeState = 'pending' | 'reported_by_workshop' | 'confirmed_by_customer' | 'completed' | 'no_show' | 'cancelled' | 'disputed' | 'expired'

interface ReviewRow {
  id: string
  rating: number
  body: string | null
  state: ReviewState
  workshop_response: string | null
  created_at: string
  moderated_at: string | null
  moderation_note: string | null
  workshops: { company_name: string; city: string } | null
  v2_job_outcomes: { state: OutcomeState; final_price_sek: number | null } | null
}

const REVIEW_STATE_STYLE: Record<ReviewState, string> = {
  submitted: 'bg-amber-100 text-amber-800',
  verified: 'bg-blue-100 text-blue-800',
  published: 'bg-emerald-100 text-emerald-800',
  flagged: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
  removed: 'bg-muted text-muted-foreground',
}

const OUTCOME_LABEL: Record<OutcomeState, string> = {
  pending: 'Väntar',
  reported_by_workshop: 'Rapporterat av verkstad',
  confirmed_by_customer: 'Bekräftat av kund',
  completed: 'Genomfört',
  no_show: 'Uteblev',
  cancelled: 'Avbokat',
  disputed: 'Tvist',
  expired: 'Utgånget',
}

const ACTIONS: { action: V2ModerateReviewRequest['action']; label: string; variant: 'default' | 'outline' | 'destructive' }[] = [
  { action: 'publish', label: 'Publicera', variant: 'default' },
  { action: 'flag', label: 'Flagga', variant: 'outline' },
  { action: 'reject', label: 'Avvisa', variant: 'outline' },
  { action: 'remove', label: 'Ta bort', variant: 'destructive' },
]

const AdminReviewModeration = () => {
  const t = useT()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // v2-tabellerna finns ännu inte i genererade typer (S13 regen) — oktypad klient.
    const untyped = supabase as unknown as { from: (table: string) => any }
    const { data, error } = await untyped
      .from('v2_reviews')
      .select('id, rating, body, state, workshop_response, created_at, moderated_at, moderation_note, workshops(company_name, city), v2_job_outcomes(state, final_price_sek)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      toast.error(t('Kunde inte läsa recensioner'), { description: error.message })
    } else {
      const rows = (data as unknown as ReviewRow[]) || []
      const weight = (state: ReviewState) => (state === 'submitted' || state === 'flagged' ? 0 : 1)
      rows.sort((a, b) => weight(a.state) - weight(b.state))
      setReviews(rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const moderate = async (reviewId: string, action: V2ModerateReviewRequest['action']) => {
    setBusyId(reviewId)
    try {
      const note = action === 'reject' || action === 'remove'
        ? window.prompt(t('Anteckning (valfritt):')) || undefined
        : undefined
      const { data, error } = await supabase.functions.invoke('v2-moderate-review', {
        body: { review_id: reviewId, action, note } satisfies V2ModerateReviewRequest,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast.success(t('Recensionen uppdaterad'))
      await load()
    } catch (error) {
      toast.error(t('Kunde inte moderera recensionen'), {
        description: (error as Error)?.message,
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <CykelAdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl">{t('Recensioner')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('Väntande recensioner överst. Publicering kräver genomfört uppdrag (completion evidence).')}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {t('Uppdatera')}
        </Button>
      </div>

      {loading && reviews.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">{t('Inga recensioner ännu.')}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-0.5" aria-label={t('{rating} av 5', { rating: review.rating })}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={cn('h-3.5 w-3.5', star <= review.rating ? 'fill-[hsl(var(--brand-sun))] text-[hsl(var(--brand-sun))]' : 'text-muted-foreground/30')} />
                  ))}
                </span>
                <Badge className={cn('border-0', REVIEW_STATE_STYLE[review.state])}>{review.state}</Badge>
                <span className="text-xs text-muted-foreground">
                  {t('Utfall:')} {review.v2_job_outcomes ? OUTCOME_LABEL[review.v2_job_outcomes.state] : '—'}
                  {review.v2_job_outcomes?.final_price_sek != null && ` · ${review.v2_job_outcomes.final_price_sek} kr`}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {review.workshops?.company_name ?? '—'} · {new Date(review.created_at).toLocaleDateString('sv-SE')}
                </span>
              </div>
              {review.body && <p className="text-sm whitespace-pre-wrap mb-2">{review.body}</p>}
              {review.workshop_response && (
                <p className="text-sm text-muted-foreground border-l-2 pl-3 mb-2">
                  <strong>{t('Verkstadens svar:')}</strong> {review.workshop_response}
                </p>
              )}
              {review.moderation_note && (
                <p className="text-xs text-muted-foreground mb-2">{t('Anteckning:')} {review.moderation_note}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {ACTIONS.map(({ action, label, variant }) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={variant}
                    disabled={busyId === review.id}
                    onClick={() => moderate(review.id, action)}
                  >
                    {busyId === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t(label)}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </CykelAdminLayout>
  )
}

export default AdminReviewModeration
