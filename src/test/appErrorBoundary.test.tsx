import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppErrorBoundary from '@/components/AppErrorBoundary'

const reload = vi.hoisted(() => ({ tryReload: vi.fn() }))
vi.mock('@/lib/chunkReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/chunkReload')>()),
  tryReload: reload.tryReload,
}))

function Crash({ message }: { message: string }): never {
  throw new Error(message)
}

beforeEach(() => {
  vi.clearAllMocks()
  // React and the boundary both log the caught error; keep test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('app error boundary', () => {
  it('renders the app when nothing fails', () => {
    render(<AppErrorBoundary><h1>Cykelhjälpen</h1></AppErrorBoundary>)
    expect(screen.getByRole('heading', { name: 'Cykelhjälpen' })).toBeInTheDocument()
  })

  it('shows a way back instead of a blank page when a component crashes', () => {
    render(<AppErrorBoundary><Crash message="Cannot read properties of null" /></AppErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Något gick fel')
    expect(screen.getByRole('button', { name: 'Ladda om sidan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Till startsidan' })).toHaveAttribute('href', '/')
    expect(reload.tryReload).not.toHaveBeenCalled()
  })

  it('still reloads once when a lazy page chunk vanished after a deploy', () => {
    reload.tryReload.mockReturnValueOnce(true)
    render(<AppErrorBoundary><Crash message="Failed to fetch dynamically imported module: /assets/x.js" /></AppErrorBoundary>)
    expect(reload.tryReload).toHaveBeenCalledOnce()
  })
})
