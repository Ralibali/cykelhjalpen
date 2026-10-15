import { Component, type ErrorInfo, type ReactNode } from 'react'
import { getLangFromLocation } from '@/lib/i18n'
import { isChunkLoadError, tryReload } from '@/lib/chunkReload'

interface State { error: Error | null }

/**
 * Last line of defence: a render error anywhere used to unmount the whole app
 * and leave a blank page. Shows a way back instead. Sits outside every provider,
 * so the fallback depends on nothing that may itself have failed.
 */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // A lazy route whose chunk vanished after a redeploy: fetch the new build.
    if (isChunkLoadError(error?.message || String(error)) && tryReload()) return
    console.error('App crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const en = getLangFromLocation() === 'en'
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div role="alert" className="max-w-md rounded-xl border border-destructive/40 bg-card p-5 space-y-3">
          <h1 className="font-display text-xl">{en ? 'Something went wrong' : 'Något gick fel'}</h1>
          <p>{en
            ? 'The page could not be shown. Reload to try again. If you were signed in, you still are.'
            : 'Sidan kunde inte visas. Ladda om för att försöka igen. Var du inloggad är du fortfarande det.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {en ? 'Reload page' : 'Ladda om sidan'}
          </button>
          <a href={en ? '/en' : '/'} className="block text-sm underline">{en ? 'Go to the home page' : 'Till startsidan'}</a>
          <a href="mailto:info@auroramedia.se" className="block text-sm underline">
            {en ? 'Need help? Contact us' : 'Behöver du hjälp? Kontakta oss'}
          </a>
        </div>
      </main>
    )
  }
}
