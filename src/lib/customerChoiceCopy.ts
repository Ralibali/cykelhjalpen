/** Copy and timing rules for getting a quoted customer to pick a winner in-app. */

export const HAS_OFFERS_NUDGE_HOURS = 24

export const WAIT_FOR_MORE_PHRASES = [
  'Fler kan tillkomma',
  'tills tre verkstäder har svarat',
] as const

export type CustomerChoiceLang = 'sv' | 'en'

export type PublishedRequestStatus =
  | 'new'
  | 'has_offers'
  | 'closed_for_responses'
  | 'full'
  | 'expired'
  | 'choice_expired'
  | 'completed'
  | string

export type StatusCopy = {
  text: string
  vars?: Record<string, string | number>
}

const CONTACT_AFTER_PICK_SV =
  'du får verkstadens kontaktuppgifter först när du valt i Cykelhjälpen.'

export function shouldUseCompareCopy(quoteCount: number): boolean {
  return quoteCount >= 2
}

export function isHasOffersNudgeDue(
  latestQuoteAt: Date | string | null | undefined,
  now: Date = new Date(),
  minHours: number = HAS_OFFERS_NUDGE_HOURS,
): boolean {
  if (latestQuoteAt == null) return false
  const quoteMs = typeof latestQuoteAt === 'string'
    ? new Date(latestQuoteAt).getTime()
    : latestQuoteAt.getTime()
  if (!Number.isFinite(quoteMs)) return false
  return (now.getTime() - quoteMs) >= minHours * 60 * 60 * 1000
}

export function closedChoiceDaysLeft(closedAt: string | null | undefined, now: Date = new Date()): number {
  if (!closedAt) return 5
  return Math.max(0, Math.ceil(5 - (now.getTime() - new Date(closedAt).getTime()) / 86_400_000))
}

/** In-app status card once the request is published. Swedish source strings (i18n keys). */
export function publishedQuotesStatusCopy(args: {
  status: PublishedRequestStatus
  quoteCount: number
  city?: string
  daysLeft?: number
}): StatusCopy {
  if (args.status === 'expired') {
    return {
      text: 'Svarstiden på fem dagar har gått ut och ingen verkstad hann svara. Du kan lägga upp ett nytt ärende när du vill.',
    }
  }

  if (args.status === 'choice_expired') {
    return {
      text: 'Du hann inte välja verkstad inom fem dagar, så offerterna har gått ut. Du kan lägga upp ett nytt ärende när du vill.',
    }
  }

  const closed = args.status === 'closed_for_responses' || args.status === 'full'
  if (closed) {
    const daysLeft = args.daysLeft ?? 5
    if (!shouldUseCompareCopy(args.quoteCount)) {
      return daysLeft > 0
        ? {
          text: 'Ärendet är stängt för nya offerter. Välj redan nu – du har {days} dagar kvar. Du får verkstadens kontaktuppgifter först när du valt i Cykelhjälpen.',
          vars: { days: daysLeft },
        }
        : {
          text: 'Ärendet är stängt för nya offerter. Välj redan nu – du får verkstadens kontaktuppgifter först när du valt i Cykelhjälpen.',
        }
    }
    return daysLeft > 0
      ? {
        text: 'Ärendet är stängt för nya offerter. Du har {days} dagar kvar att jämföra prisförslagen nedan och välja den verkstad du vill gå vidare med.',
        vars: { days: daysLeft },
      }
      : {
        text: 'Ärendet är stängt för nya offerter. Jämför prisförslagen nedan och välj den verkstad du vill gå vidare med.',
      }
  }

  if (args.quoteCount === 1) {
    return {
      text: `Du har fått ett prisförslag. Välj redan nu – ${CONTACT_AFTER_PICK_SV}`,
    }
  }

  if (args.quoteCount >= 2) {
    return {
      text: `Du har fått prisförslag. Jämför och välj redan nu – ${CONTACT_AFTER_PICK_SV}`,
    }
  }

  return {
    text: 'Anslutna verkstäder i {city} kan nu se ärendet i fem dagar. Nya prisförslag visas här automatiskt.',
    vars: { city: args.city ?? '' },
  }
}

export function customerResponseSmsCopy(
  workshopName: string,
  requestUrl: string,
  lang: CustomerChoiceLang = 'sv',
  quoteCount = 1,
): string {
  if (lang === 'en') {
    const action = shouldUseCompareCopy(quoteCount)
      ? 'Compare and choose a workshop'
      : 'Choose now – you get contact details after you pick'
    return `Cykelhjalpen: ${workshopName} sent you a quote. ${action}: ${requestUrl}`
  }
  const action = shouldUseCompareCopy(quoteCount)
    ? 'Jämför och välj verkstad redan nu'
    : 'Välj redan nu – du får kontakten när du valt'
  return `Cykelhjälpen: ${workshopName} har lagt ett prisförslag. ${action}: ${requestUrl}`
}

export function customerResponseEmailBody(
  workshopName: string,
  lang: CustomerChoiceLang = 'sv',
  quoteCount = 1,
): string {
  if (lang === 'en') {
    return shouldUseCompareCopy(quoteCount)
      ? `${workshopName} has sent you a quote. Compare the quotes and choose the workshop you want to go ahead with – you get their contact details only after you have chosen in Cykelhjälpen.`
      : `${workshopName} has sent you a quote. You can choose already – you get their contact details only after you have chosen in Cykelhjälpen.`
  }
  return shouldUseCompareCopy(quoteCount)
    ? `${workshopName} har lämnat ett prisförslag på ditt cykelärende. Jämför förslagen och välj den verkstad du vill gå vidare med – du får kontaktuppgifterna först när du valt i Cykelhjälpen.`
    : `${workshopName} har lämnat ett prisförslag på ditt cykelärende. Välj redan nu – du får verkstadens kontaktuppgifter först när du valt i Cykelhjälpen.`
}

export function customerResponseEmailCta(lang: CustomerChoiceLang = 'sv', quoteCount = 1): string {
  if (lang === 'en') {
    return shouldUseCompareCopy(quoteCount) ? 'Compare the quotes and choose' : 'Choose the workshop now'
  }
  return shouldUseCompareCopy(quoteCount) ? 'Jämför och välj' : 'Välj verkstad redan nu'
}
