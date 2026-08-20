import { describe, expect, it } from 'vitest'
import { isActiveWorkshop, quoteWindowStart, quotedWorkshopIdsSince } from './cykelMarketplaceHealth'
import {
  APPROVED_ADMIN_STATUS,
  PENDING_ADMIN_STATUS,
  cityHasActiveWorkshop,
  decideCreatedRequestAdminStatus,
  isRequestVisibleToWorkshops,
  selectPendingRequestsToAutoApprove,
  type AutoApproveQuote,
  type AutoApproveWorkshop,
} from './cityAutoApprove'

const NOW = new Date('2026-08-20T12:00:00.000Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString()

const jojos: AutoApproveWorkshop = {
  id: 'ws-jojos',
  city: 'Linköping',
  approved: true,
}

const silentLinkoping: AutoApproveWorkshop = {
  id: 'ws-nisses',
  city: 'Linköping',
  approved: true,
}

const silentNorrkoping: AutoApproveWorkshop = {
  id: 'ws-nr-silent',
  city: 'Norrköping',
  approved: true,
}

const unapprovedUppsala: AutoApproveWorkshop = {
  id: 'ws-up-pending',
  city: 'Uppsala',
  approved: false,
}

const recentJojosQuote: AutoApproveQuote = {
  workshop_id: 'ws-jojos',
  created_at: daysAgo(10),
}

const staleNissesQuote: AutoApproveQuote = {
  workshop_id: 'ws-nisses',
  created_at: daysAgo(45),
}

const staleNorrkopingQuote: AutoApproveQuote = {
  workshop_id: 'ws-nr-silent',
  created_at: daysAgo(40),
}

const recentUnapprovedQuote: AutoApproveQuote = {
  workshop_id: 'ws-up-pending',
  created_at: daysAgo(2),
}

const existingNorrkopingPending = {
  id: 'req-nr-existing',
  admin_status: PENDING_ADMIN_STATUS,
  city: 'Norrköping',
  status: 'new',
}

describe('city auto-approve eligibility (admin-health active definition)', () => {
  it('auto-approves a request in a city with a workshop that quoted in the last 30d, and workshops can see it', () => {
    const workshops = [jojos, silentLinkoping]
    const quotes = [recentJojosQuote, staleNissesQuote]
    const quoted = quotedWorkshopIdsSince(quotes, quoteWindowStart(NOW))

    expect(isActiveWorkshop(jojos, quoted)).toBe(true)
    expect(cityHasActiveWorkshop('Linköping', workshops, quotes, NOW)).toBe(true)

    const decision = decideCreatedRequestAdminStatus('Linköping', workshops, quotes, NOW)
    expect(decision).toEqual({
      admin_status: APPROVED_ADMIN_STATUS,
      approved_at: NOW.toISOString(),
    })

    const created = {
      admin_status: decision.admin_status,
      status: 'new',
      city: 'Linköping',
    }
    expect(isRequestVisibleToWorkshops(created, 'Linköping')).toBe(true)
    expect(isRequestVisibleToWorkshops(created, 'Norrköping')).toBe(false)
  })

  it('keeps a request pending when the city has approved workshops but no quotes in 30d', () => {
    const workshops = [silentNorrkoping]
    const quotes = [staleNorrkopingQuote]
    const quoted = quotedWorkshopIdsSince(quotes, quoteWindowStart(NOW))

    expect(isActiveWorkshop(silentNorrkoping, quoted)).toBe(false)
    expect(cityHasActiveWorkshop('Norrköping', workshops, quotes, NOW)).toBe(false)

    const decision = decideCreatedRequestAdminStatus('Norrköping', workshops, quotes, NOW)
    expect(decision).toEqual({
      admin_status: PENDING_ADMIN_STATUS,
      approved_at: null,
    })
    expect(isRequestVisibleToWorkshops({
      admin_status: decision.admin_status,
      status: 'new',
      city: 'Norrköping',
    }, 'Norrköping')).toBe(false)
  })

  it('keeps a request pending when the city has zero workshops', () => {
    const decision = decideCreatedRequestAdminStatus('Lund', [], [], NOW)
    expect(cityHasActiveWorkshop('Lund', [], [], NOW)).toBe(false)
    expect(decision).toEqual({
      admin_status: PENDING_ADMIN_STATUS,
      approved_at: null,
    })
    expect(isRequestVisibleToWorkshops({
      admin_status: decision.admin_status,
      status: 'new',
      city: 'Lund',
    }, 'Lund')).toBe(false)
  })

  it('does not flip existing pending fixtures for an ineligible city', () => {
    const workshops = [jojos, silentNorrkoping]
    const quotes = [recentJojosQuote, staleNorrkopingQuote]
    const ids = selectPendingRequestsToAutoApprove(
      [
        existingNorrkopingPending,
        { id: 'req-li-pending', admin_status: PENDING_ADMIN_STATUS, city: 'Linköping' },
        { id: 'req-nr-rejected', admin_status: 'rejected', city: 'Norrköping' },
      ],
      workshops,
      quotes,
      NOW,
    )

    expect(ids).toEqual(['req-li-pending'])
    expect(ids).not.toContain(existingNorrkopingPending.id)
    expect(existingNorrkopingPending.admin_status).toBe(PENDING_ADMIN_STATUS)
  })

  it('does not treat unapproved shops or loose city substrings as coverage', () => {
    const workshops = [unapprovedUppsala, jojos]
    const quotes = [recentUnapprovedQuote, recentJojosQuote]

    expect(cityHasActiveWorkshop('Uppsala', workshops, quotes, NOW)).toBe(false)
    expect(cityHasActiveWorkshop('linkoping', workshops, quotes, NOW)).toBe(false)
    expect(cityHasActiveWorkshop('Linköping-Norrköping', workshops, quotes, NOW)).toBe(false)
    expect(cityHasActiveWorkshop('Norrköping', workshops, quotes, NOW)).toBe(false)
    expect(isRequestVisibleToWorkshops({
      admin_status: APPROVED_ADMIN_STATUS,
      status: 'new',
      city: 'Linköping',
    }, 'Linköping Centrum')).toBe(false)
  })
})
