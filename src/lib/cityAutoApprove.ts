import { isCykelCity } from './cykelCities'
import {
  isActiveWorkshop,
  isPendingAdminStatus,
  quoteWindowStart,
  quotedWorkshopIdsSince,
  type CykelQuoteRow,
  type CykelWorkshopRow,
} from './cykelMarketplaceHealth'

/** Same approved value the admin UI writes today. */
export const APPROVED_ADMIN_STATUS = 'approved'
export const PENDING_ADMIN_STATUS = 'pending_approval'

/** Open statuses exposed by `list-open-bike-requests` / `bike_requests_for_workshops`. */
export const WORKSHOP_BOARD_OPEN_STATUSES = ['new', 'has_offers'] as const

export type AutoApproveWorkshop = Pick<CykelWorkshopRow, 'id' | 'approved' | 'city'>
export type AutoApproveQuote = Pick<CykelQuoteRow, 'workshop_id' | 'created_at'>

export type CreatedRequestAdminDecision = {
  admin_status: typeof APPROVED_ADMIN_STATUS | typeof PENDING_ADMIN_STATUS
  approved_at: string | null
}

/**
 * A city is eligible for auto-approve iff it has at least one active workshop.
 * Active uses the admin-health helper: approved AND a quote in the last 30 days.
 * City match is the canonical name (Linköping / Norrköping / Uppsala / Lund), not a substring.
 */
export function cityHasActiveWorkshop(
  city: string,
  workshops: AutoApproveWorkshop[],
  responses: Iterable<AutoApproveQuote>,
  now: Date = new Date(),
): boolean {
  if (!isCykelCity(city)) return false
  const quotedIds = quotedWorkshopIdsSince(responses, quoteWindowStart(now))
  return workshops.some((workshop) => workshop.city === city && isActiveWorkshop(workshop, quotedIds))
}

export function decideCreatedRequestAdminStatus(
  city: string,
  workshops: AutoApproveWorkshop[],
  responses: Iterable<AutoApproveQuote>,
  now: Date = new Date(),
): CreatedRequestAdminDecision {
  if (cityHasActiveWorkshop(city, workshops, responses, now)) {
    return { admin_status: APPROVED_ADMIN_STATUS, approved_at: now.toISOString() }
  }
  return { admin_status: PENDING_ADMIN_STATUS, approved_at: null }
}

/** Mirrors `list-open-bike-requests`: approved + open status + exact workshop city. */
export function isRequestVisibleToWorkshops(
  request: { admin_status: string; status: string; city: string },
  workshopCity: string,
): boolean {
  return request.admin_status === APPROVED_ADMIN_STATUS
    && (WORKSHOP_BOARD_OPEN_STATUSES as readonly string[]).includes(request.status)
    && request.city === workshopCity
}

/** One-time backfill selector. Skips any city without an active workshop. */
export function selectPendingRequestsToAutoApprove(
  requests: Array<{ id: string; admin_status: string; city: string }>,
  workshops: AutoApproveWorkshop[],
  responses: Iterable<AutoApproveQuote>,
  now: Date = new Date(),
): string[] {
  return requests
    .filter((request) => isPendingAdminStatus(request.admin_status))
    .filter((request) => cityHasActiveWorkshop(request.city, workshops, responses, now))
    .map((request) => request.id)
}
