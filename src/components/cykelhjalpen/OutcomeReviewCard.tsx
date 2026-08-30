// V2 S3: utfalls- och recensionskort på kundens ärendesida (/mitt-arende/:token).
// Feature-flaggat (v2.reviews.outcome_lifecycle / v2.reviews.verified_reviews):
// flagga AV = kortet renderas inte alls, men backend samlar fortfarande data.
//
// Flöde: kunden bekräftar hur det gick (v2-confirm-outcome) → när uppdraget
// är genomfört kan en recension lämnas (v2-submit-review). Recensionen
// markeras som verifierad först när utfallet har completion evidence —
// aldrig bara för att en vinnare valts (dim12 trust audit).

import { useState } from 'react'
import { CheckCircle2, Loader2, MessageSquareHeart, Star } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import { useV2Flag } from '@/lib/v2/useV2Flag'
import type { V2ConfirmOutcomeRequest, V2OutcomeResponse, V2SubmitReviewRequest, V2SubmitReviewResponse } from '@/lib/v2/contracts'
import { cn } from '@/lib/utils'

interface OutcomeReviewCardProps {
  token: string
  workshopName: string
}

type Step = 'confirm' | 'review' | 'done'

const OutcomeReviewCard = ({ token, workshopName }: OutcomeReviewCardProps) => {
  const t = useT()
  const outcomeFlag = useV2Flag('v2.reviews.outcome_lifecycle')
  const reviewFlag = useV2Flag('v2.reviews.verified_reviews')

  const [step, setStep] = useState<Step>(reviewFlag && !outcomeFlag ? 'review' : 'confirm')
  const [busy, setBusy] = useState(false)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [body, setBody] = useState('')

  if (!outcomeFlag && !reviewFlag) return null
  if (step === 'done') {
    return (
      <section className="sticker rounded-3xl bg-[hsl(var(--brand-mint)/0.12)] p-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-2xl bg-[hsl(var(--brand-mint)/0.2)] p-2.5">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brand-mint))]" />
          </span>
          <div>
            <h2 className="font-display text-lg">{t('Tack för din återkoppling!')}</h2>
            <p className="text-sm">{t('Den hjälper andra cyklister att välja rätt verkstad.')}</p>
          </div>
        </div>
      </section>
    )
  }

  const confirmOutcome = async (outcome: V2ConfirmOutcomeRequest['outcome']) => {
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('v2-confirm-outcome', {
        body: { token, outcome } satisfies V2ConfirmOutcomeRequest,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const result = data as V2OutcomeResponse
      if (outcome === 'completed' && reviewFlag && result.review_invited) {
        setStep('review')
      } else {
        toast.success(t('Tack! Vi har noterat hur det gick.'))
        setStep('done')
      }
    } catch (error) {
      toast.error(t('Kunde inte spara ditt svar.'), {
        description: (error as Error)?.message || t('Försök igen om en stund.'),
      })
    } finally {
      setBusy(false)
    }
  }

  const submitReview = async () => {
    if (rating < 1 || rating > 5) return
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('v2-submit-review', {
        body: { token, rating: rating as 1 | 2 | 3 | 4 | 5, body: body.trim() || undefined } satisfies V2SubmitReviewRequest,
      })
      if (error) throw error
      if (data?.error) {
        if (data?.code === 'duplicate_review') {
          toast.info(t('Du har redan lämnat en recension – tack!'))
          setStep('done')
          return
        }
        throw new Error(data.error)
      }
      const result = data as V2SubmitReviewResponse
      toast.success(t('Tack för din recension!'), {
        description: result.published
          ? t('Den är verifierad och publicerad.')
          : t('Den publiceras när uppdraget är bekräftat som klart.'),
      })
      setStep('done')
    } catch (error) {
      toast.error(t('Kunde inte skicka recensionen.'), {
        description: (error as Error)?.message || t('Försök igen om en stund.'),
      })
    } finally {
      setBusy(false)
    }
  }

  if (step === 'confirm' && outcomeFlag) {
    return (
      <section className="sticker rounded-3xl bg-card p-6 mb-8" aria-labelledby="outcome-heading">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-2.5">
            <MessageSquareHeart className="h-5 w-5 text-primary" />
          </span>
          <h2 id="outcome-heading" className="font-display text-lg">{t('Hur gick det med cykeln?')}</h2>
        </div>
        <p className="text-sm mb-4">
          {t('Berätta gärna om {name} fixade cykeln – det hjälper andra cyklister.', { name: workshopName })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => confirmOutcome('completed')} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {t('Ja, allt är klart')}
          </Button>
          <Button variant="outline" onClick={() => confirmOutcome('cancelled')} disabled={busy}>
            {t('Det blev inte av')}
          </Button>
          <Button variant="ghost" onClick={() => confirmOutcome('disputed')} disabled={busy}>
            {t('Det uppstod ett problem')}
          </Button>
        </div>
      </section>
    )
  }

  if (!reviewFlag) return null

  return (
    <section className="sticker rounded-3xl bg-card p-6 mb-8" aria-labelledby="review-heading">
      <h2 id="review-heading" className="font-display text-lg mb-2">
        {t('Betygsätt {name}', { name: workshopName })}
      </h2>
      <p className="text-sm mb-4">
        {t('Din recension verifieras mot det genomförda uppdraget och publiceras efter granskning.')}
      </p>
      <div className="flex items-center gap-1 mb-4" role="radiogroup" aria-label={t('Betyg 1 till 5')}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t('{value} av 5 stjärnor', { value })}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                'h-7 w-7 transition-colors',
                value <= (hovered || rating) ? 'fill-[hsl(var(--brand-sun))] text-[hsl(var(--brand-sun))]' : 'text-muted-foreground/40',
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, 2000))}
        placeholder={t('Berätta gärna hur det gick (valfritt)')}
        rows={3}
        className="mb-4"
        maxLength={2000}
      />
      <Button onClick={submitReview} disabled={busy || rating === 0}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {t('Skicka recension')}
      </Button>
    </section>
  )
}

export default OutcomeReviewCard
