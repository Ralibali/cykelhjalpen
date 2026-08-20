import { describe, expect, it } from 'vitest'
import {
  ACTIVE_WORKSHOP_QUOTE_WINDOW_DAYS,
  CYKEL_ANALYTICS_SELECT,
  CYKEL_MARKETPLACE_TABLES,
  UPDRO_MARKETPLACE_TABLES,
  assertCykelMarketplaceTable,
  buildCykelMarketplaceSnapshot,
  cityHealthStatus,
  classifyWorkshopLiquidity,
  formatHoursToQuote,
  hoursToFirstQuote,
  isActiveWorkshop,
  loadCykelMarketplaceRows,
  quoteBucket,
  quoteWindowStart,
  quotedWorkshopIdsSince,
  rollupCityName,
  type CykelMarketplaceClient,
  type CykelRequestRow,
  type CykelWorkshopRow,
} from './cykelMarketplaceHealth'

const NOW = new Date('2026-08-20T12:00:00.000Z')

const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()
const daysAgo = (days: number) => hoursAgo(days * 24)

const nisses: CykelWorkshopRow = {
  id: 'ws-nisses',
  company_name: 'Nisses',
  city: 'Linköping',
  approved: true,
}

const activeLinkoping: CykelWorkshopRow = {
  id: 'ws-active-li',
  company_name: 'Cykelservice Linköping',
  city: 'Linköping',
  approved: true,
}

const pendingWorkshop: CykelWorkshopRow = {
  id: 'ws-pending',
  company_name: 'Ny verkstad',
  city: 'Uppsala',
  approved: false,
}

const request = (partial: Partial<CykelRequestRow> & Pick<CykelRequestRow, 'id' | 'city'>): CykelRequestRow => ({
  created_at: daysAgo(5),
  approved_at: daysAgo(4),
  admin_status: 'approved',
  status: 'open',
  repair_category: 'Bromsar',
  workshop_responses: [],
  ...partial,
})

describe('Cykel marketplace query mapping', () => {
  it('only reads bike_* / workshops tables', () => {
    expect(CYKEL_MARKETPLACE_TABLES).toEqual([
      'bike_repair_requests',
      'workshop_responses',
      'workshops',
    ])
    expect(CYKEL_ANALYTICS_SELECT.bike_repair_requests).toContain('workshop_responses(')
    expect(CYKEL_ANALYTICS_SELECT.bike_repair_requests).toContain('admin_status')
    expect(CYKEL_ANALYTICS_SELECT.workshops).toContain('approved')

    for (const leftover of UPDRO_MARKETPLACE_TABLES) {
      expect(CYKEL_MARKETPLACE_TABLES).not.toContain(leftover)
      expect(JSON.stringify(CYKEL_ANALYTICS_SELECT)).not.toContain(leftover)
    }
  })

  it('rejects leftover Updro tables at the query guard', () => {
    expect(() => assertCykelMarketplaceTable('projects')).toThrow(/Updro table/)
    expect(() => assertCykelMarketplaceTable('offers')).toThrow(/Updro table/)
    expect(() => assertCykelMarketplaceTable('supplier_profiles')).toThrow(/Updro table/)
    expect(() => assertCykelMarketplaceTable('marketplace_category_health')).toThrow(/Updro table/)
    expect(() => assertCykelMarketplaceTable('bike_repair_requests')).not.toThrow()
    expect(() => assertCykelMarketplaceTable('workshops')).not.toThrow()
  })

  it('loadCykelMarketplaceRows queries only Cykel tables', async () => {
    const seen: string[] = []
    const client: CykelMarketplaceClient = {
      from(table) {
        seen.push(table)
        return {
          select: async () => ({ data: [], error: null }),
        }
      },
    }

    await loadCykelMarketplaceRows(client)

    expect(seen).toEqual(['bike_repair_requests', 'workshops'])
    expect(seen.some((table) => (UPDRO_MARKETPLACE_TABLES as readonly string[]).includes(table))).toBe(false)
  })
})

describe('active workshop definition', () => {
  it('does not treat approved-but-silent shops as active', () => {
    const quoted = new Set<string>()
    expect(classifyWorkshopLiquidity(nisses, quoted)).toBe('silent')
    expect(isActiveWorkshop(nisses, quoted)).toBe(false)
  })

  it('requires approved AND a quote in the last 30 days', () => {
    const quoted = quotedWorkshopIdsSince(
      [
        { workshop_id: 'ws-active-li', created_at: daysAgo(10) },
        { workshop_id: 'ws-nisses', created_at: daysAgo(45) },
        { workshop_id: 'ws-pending', created_at: daysAgo(2) },
      ],
      quoteWindowStart(NOW),
    )

    expect(quoted.has('ws-active-li')).toBe(true)
    expect(quoted.has('ws-nisses')).toBe(false)
    expect(isActiveWorkshop(activeLinkoping, quoted)).toBe(true)
    expect(isActiveWorkshop(nisses, quoted)).toBe(false)
    expect(isActiveWorkshop(pendingWorkshop, quoted)).toBe(false)
    expect(classifyWorkshopLiquidity(pendingWorkshop, quoted)).toBe('unapproved')
    expect(ACTIVE_WORKSHOP_QUOTE_WINDOW_DAYS).toBe(30)
  })
})

describe('quote buckets and time-to-first-quote', () => {
  it('buckets 0 / 1 / 2 / 3+', () => {
    expect(quoteBucket(0)).toBe('0')
    expect(quoteBucket(1)).toBe('1')
    expect(quoteBucket(2)).toBe('2')
    expect(quoteBucket(3)).toBe('3+')
    expect(quoteBucket(7)).toBe('3+')
  })

  it('measures hours from approval (or created_at) to first quote', () => {
    expect(hoursToFirstQuote(
      { created_at: daysAgo(5), approved_at: daysAgo(4) },
      daysAgo(3),
    )).toBe(24)

    expect(hoursToFirstQuote(
      { created_at: daysAgo(2), approved_at: null },
      daysAgo(1),
    )).toBe(24)

    expect(hoursToFirstQuote({ created_at: daysAgo(1), approved_at: daysAgo(1) }, null)).toBeNull()
    expect(formatHoursToQuote(0.5)).toBe('30 min')
    expect(formatHoursToQuote(6)).toBe('6.0 h')
    expect(formatHoursToQuote(72)).toBe('3.0 d')
    expect(formatHoursToQuote(null)).toBe('–')
  })
})

describe('city rollup and health', () => {
  it('rolls up Linköping / Norrköping / Uppsala / Lund and keeps silent shops visible', () => {
    const snapshot = buildCykelMarketplaceSnapshot(
      [
        request({
          id: 'req-li-0',
          city: 'Linköping',
          workshop_responses: [],
        }),
        request({
          id: 'req-li-1',
          city: 'Linköping',
          approved_at: daysAgo(2),
          workshop_responses: [
            { id: 'q1', workshop_id: 'ws-active-li', created_at: daysAgo(1), status: 'sent' },
          ],
        }),
        request({
          id: 'req-li-3',
          city: 'Linköping',
          workshop_responses: [
            { id: 'q2', workshop_id: 'ws-active-li', created_at: daysAgo(1), status: 'sent' },
            { id: 'q3', workshop_id: 'ws-other', created_at: daysAgo(1), status: 'sent' },
            { id: 'q4', workshop_id: 'ws-third', created_at: daysAgo(1), status: 'won', paid: true },
          ],
        }),
        request({
          id: 'req-nr-pending',
          city: 'Norrköping',
          admin_status: 'pending_approval',
          approved_at: null,
        }),
        request({
          id: 'req-up-rejected',
          city: 'Uppsala',
          admin_status: 'rejected',
        }),
        request({
          id: 'req-lund',
          city: 'Lund',
          workshop_responses: [
            { id: 'q5', workshop_id: 'ws-lund', created_at: hoursAgo(6), status: 'sent' },
            { id: 'q6', workshop_id: 'ws-lund-2', created_at: hoursAgo(5), status: 'sent' },
          ],
        }),
      ],
      [
        nisses,
        activeLinkoping,
        pendingWorkshop,
        { id: 'ws-lund', company_name: 'Lunds Cykel', city: 'Lund', approved: true },
        { id: 'ws-lund-2', company_name: 'Lund 2', city: 'Lund', approved: true },
      ],
      NOW,
    )

    expect(snapshot.cityRollup.map((row) => row.city)).toEqual([
      'Linköping',
      'Norrköping',
      'Uppsala',
      'Lund',
    ])

    const linkoping = snapshot.cityRollup[0]
    expect(linkoping.requests).toBe(3)
    expect(linkoping.approved).toBe(3)
    expect(linkoping.quotes0).toBe(1)
    expect(linkoping.quotes1).toBe(1)
    expect(linkoping.quotes3plus).toBe(1)
    expect(linkoping.approvedWorkshops).toBe(2)
    expect(linkoping.activeWorkshops).toBe(1)
    expect(linkoping.silentWorkshops).toBe(1)
    expect(linkoping.medianHoursToFirstQuote).toBe(48)

    expect(snapshot.cityRollup.find((row) => row.city === 'Norrköping')?.pending).toBe(1)
    expect(snapshot.cityRollup.find((row) => row.city === 'Uppsala')?.rejected).toBe(1)

    const lund = snapshot.cityRollup.find((row) => row.city === 'Lund')
    expect(lund?.quotes2).toBe(1)
    expect(lund?.activeWorkshops).toBe(2)
    expect(lund?.healthStatus).toBe('healthy')

    expect(snapshot.totals.activeWorkshops).toBe(3)
    expect(snapshot.totals.silentWorkshops).toBe(1)
    expect(snapshot.silentWorkshops.map((workshop) => workshop.company_name)).toEqual(['Nisses'])
    expect(snapshot.totals.wonQuotes).toBe(1)
    expect(rollupCityName('Stockholm')).toBe('Övrigt')
  })

  it('flags Linköping as pause_or_recruit when demand exists but no shop has quoted', () => {
    expect(cityHealthStatus({
      openApprovedRequests: 2,
      requestsWithoutQuotes: 2,
      activeWorkshops: 0,
    })).toBe('pause_or_recruit')

    const snapshot = buildCykelMarketplaceSnapshot(
      [request({ id: 'lonely', city: 'Linköping' })],
      [nisses],
      NOW,
    )

    expect(snapshot.cityRollup[0].healthStatus).toBe('pause_or_recruit')
    expect(snapshot.cityRollup[0].activeWorkshops).toBe(0)
    expect(snapshot.cityRollup[0].silentWorkshops).toBe(1)
  })
})
