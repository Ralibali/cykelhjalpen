// V2 S3: aggregerad betygsvisning. Konsumerar ENBART denormaliserade
// aggregat från v2_workshop_review_stats (published-only) — aldrig
// recensionsrader, hashar eller annan icke-aggregerad data (I3).
//
// Används på offertkort (CustomerResponses) och som placeholder-props för
// S4:s publika verkstadsprofil. Renderar inget när count = 0 (ärlighetsgate,
// samma princip som CykelHomeTrust:s minimumtrösklar).

import { Star } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export interface WorkshopRatingBadgeProps {
  /** Medelbetyg 1–5 (avrundat till 2 decimaler i databasen). */
  avgRating: number | null
  /** Antal publicerade recensioner. */
  publishedCount: number
  className?: string
}

const WorkshopRatingBadge = ({ avgRating, publishedCount, className }: WorkshopRatingBadgeProps) => {
  const t = useT()
  if (!publishedCount || publishedCount <= 0 || avgRating === null) return null

  const rounded = Math.round(avgRating)

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-medium text-muted-foreground', className)}
      aria-label={t('Betyg {rating} av 5 baserat på {count} recensioner', {
        rating: avgRating.toFixed(1),
        count: publishedCount,
      })}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-3.5 w-3.5',
              star <= rounded ? 'fill-[hsl(var(--brand-sun))] text-[hsl(var(--brand-sun))]' : 'text-muted-foreground/40',
            )}
          />
        ))}
      </span>
      <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
      <span>({publishedCount})</span>
    </span>
  )
}

export default WorkshopRatingBadge
