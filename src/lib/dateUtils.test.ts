import { afterEach, expect, it, vi } from 'vitest'
import { timeAgo } from './dateUtils'
afterEach(() => vi.useRealTimers())
it('interpolates Swedish relative dates without an explicit translator', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-08T12:00:00Z'))
  expect(timeAgo('2026-08-08T12:00:00Z')).toBe('2 månader sedan')
  expect(timeAgo('2026-10-07T12:00:00Z')).toBe('1 dag sedan')
  expect(timeAgo('invalid')).toBe('–')
})
