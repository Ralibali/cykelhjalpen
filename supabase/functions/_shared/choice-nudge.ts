// 24h-after-latest-quote rule for has_offers nudges.
// Keep in sync with src/lib/customerChoiceCopy.ts (isHasOffersNudgeDue).

export const HAS_OFFERS_NUDGE_HOURS = 24

export const isHasOffersNudgeDue = (
  latestQuoteAt: Date | string | null | undefined,
  now: Date = new Date(),
  minHours: number = HAS_OFFERS_NUDGE_HOURS,
): boolean => {
  if (latestQuoteAt == null) return false
  const quoteMs = typeof latestQuoteAt === 'string'
    ? new Date(latestQuoteAt).getTime()
    : latestQuoteAt.getTime()
  if (!Number.isFinite(quoteMs)) return false
  return (now.getTime() - quoteMs) >= minHours * 60 * 60 * 1000
}
