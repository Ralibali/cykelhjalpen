// V2 S8 retention — frontend-hjälpare för kundens token-sida.
// Kontrakt: docs/v2/CONTRACTS.md §2.7/§3.7. Speglar edge-logiken i
// supabase/functions/_shared/v2/retention.ts (paritet testas i retention.test.ts).

import { getCykelCity, isCykelCity } from '../cykelCities'
import type { V2OutcomeState } from './contracts'

// ---------------------------------------------------------------------------
// Typer (svar från get-bike-request-by-token / v2-customer-preferences)
// ---------------------------------------------------------------------------

export interface V2OutcomeSummary {
  state: V2OutcomeState
  final_price_sek: number | null
}

export interface V2ServiceHistoryItem {
  id: string
  bike_type: string
  repair_category: string
  city: string
  status: string
  created_at: string
  view_token: string
  outcome: V2OutcomeSummary | null
}

export interface V2RetentionState {
  reminder_opt_in: boolean
}

export const RETENTION_LIFECYCLE_FLAG = 'v2.retention.lifecycle'

// ---------------------------------------------------------------------------
// Upprepa-ärende-länkar (prefill stöds av BikeRequestWizard: ?stad&cykel&problem)
// ---------------------------------------------------------------------------

/** Relativ länk till förifylld wizard — samma prefix-matchning som matchParam. */
export function buildRepeatRequestUrl(args: {
  city?: string | null
  bikeType?: string | null
  repairCategory?: string | null
}): string {
  const params = new URLSearchParams()
  // Endast kända cykelstäder får en slug (getCykelCity faller annars tillbaka
  // på Linköping, vilket skulle förifylla fel stad).
  const slug = args.city && isCykelCity(args.city) ? getCykelCity(args.city).slug : null
  if (slug) params.set('stad', slug)
  if (args.bikeType) params.set('cykel', args.bikeType)
  if (args.repairCategory) params.set('problem', args.repairCategory)
  const query = params.toString()
  return `/skicka-arende${query ? `?${query}` : ''}`
}

// ---------------------------------------------------------------------------
// Visningsetiketter
// ---------------------------------------------------------------------------

export function historyStatusLabel(item: V2ServiceHistoryItem, t: (s: string) => string): string {
  if (item.outcome?.state === 'completed' || item.outcome?.state === 'confirmed_by_customer') {
    return t('Utfört')
  }
  switch (item.status) {
    case 'completed': return t('Verkstad vald')
    case 'expired':
    case 'choice_expired': return t('Avslutat utan val')
    case 'closed_for_responses':
    case 'full': return t('Stängt för svar')
    default: return t('Pågående')
  }
}
