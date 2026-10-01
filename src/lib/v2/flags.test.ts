import { beforeEach, describe, expect, it } from 'vitest'
import { __resetV2FlagClientCache, fetchV2Flags, setV2FlagEnabled, type V2Client } from './flags'

type Result = { data: unknown; error: unknown }

/** Minimal chainable stand-in for the Supabase query builder. */
function fakeClient(opts: { selectRows: unknown[]; updateResult: Result }) {
  const calls: { update?: unknown; eq?: [string, unknown] } = {}
  const client = {
    from: () => ({
      select: () => Promise.resolve({ data: opts.selectRows, error: null }),
      update: (values: unknown) => {
        calls.update = values
        return {
          eq: (column: string, value: unknown) => {
            calls.eq = [column, value]
            return { select: () => Promise.resolve(opts.updateResult) }
          },
        }
      },
    }),
  }
  return { client: client as unknown as V2Client, calls }
}

const row = (enabled: boolean) => ({
  key: 'workshop_magic_quote', enabled, rollout: {}, description: '', updated_at: '2026-10-01T00:00:00Z',
})

describe('setV2FlagEnabled', () => {
  beforeEach(() => __resetV2FlagClientCache())

  it('updates the flag row and clears the cache', async () => {
    const before = fakeClient({ selectRows: [row(false)], updateResult: { data: null, error: null } })
    expect((await fetchV2Flags({ client: before.client })).get('workshop_magic_quote')?.enabled).toBe(false)

    const writer = fakeClient({ selectRows: [], updateResult: { data: [{ key: 'workshop_magic_quote' }], error: null } })
    await setV2FlagEnabled('workshop_magic_quote', true, writer.client)
    expect(writer.calls.eq).toEqual(['key', 'workshop_magic_quote'])
    expect(writer.calls.update).toMatchObject({ enabled: true })

    const after = fakeClient({ selectRows: [row(true)], updateResult: { data: null, error: null } })
    expect((await fetchV2Flags({ client: after.client })).get('workshop_magic_quote')?.enabled).toBe(true)
  })

  it('throws when RLS filters the update to zero rows (non-admin)', async () => {
    const { client } = fakeClient({ selectRows: [], updateResult: { data: [], error: null } })
    await expect(setV2FlagEnabled('workshop_magic_quote', true, client)).rejects.toThrow(/not updated/)
  })

  it('throws on a database error', async () => {
    const { client } = fakeClient({ selectRows: [], updateResult: { data: null, error: new Error('boom') } })
    await expect(setV2FlagEnabled('workshop_magic_quote', true, client)).rejects.toThrow('boom')
  })
})
