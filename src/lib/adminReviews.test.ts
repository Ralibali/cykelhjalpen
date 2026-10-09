import { describe, expect, it, vi } from 'vitest'
import { loadAdminReviews } from './adminReviews'

function client(results: unknown[]) {
  const from = vi.fn(() => { const result = results.shift(); return { select: () => ({ order: () => ({ limit: () => Promise.resolve(result) }) }) } })
  return { from }
}

describe('review schema compatibility', () => {
  it('reads deployed legacy reviews only when the optional table is missing', async () => {
    const db = client([{ error: { code: 'PGRST205', message: "public.v2_reviews" } }, { data: [{ id: 'r', rating: 5, comment: 'Bra', created_at: null, profiles: null }], error: null }])
    const result = await loadAdminReviews(db as never)
    expect(db.from.mock.calls).toEqual([['v2_reviews'], ['reviews']])
    expect(result.canModerate).toBe(false)
    expect(result.reviews[0]).toMatchObject({ body: 'Bra', state: 'published', rating: 5 })
  })
  it('does not turn denied access into an empty legacy list', async () => {
    const error = { code: '42501', message: 'denied' }
    const db = client([{ error }])
    await expect(loadAdminReviews(db as never)).rejects.toEqual(error)
    expect(db.from).toHaveBeenCalledTimes(1)
  })
  it('preserves moderation when the deployed schema supports it', async () => {
    const db = client([{ data: [], error: null }])
    expect(await loadAdminReviews(db as never)).toEqual({ canModerate: true, reviews: [] })
  })
})
