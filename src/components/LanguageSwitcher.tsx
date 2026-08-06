import { Globe } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useLanguage, type Lang } from '@/lib/i18n'
import { EN_PREFIX, toEnglishPath, toSwedishPath } from '@/i18n/routes'

/**
 * Switches between the Swedish (/) and English (/en/...) version of the *current* page.
 * Falls back to the start page when the current page has no translation.
 * The choice is stored in localStorage, but we never auto-redirect on browser language.
 */
export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang } = useLanguage()
  const location = useLocation()

  const go = (next: Lang) => {
    if (next === lang) return
    try {
      window.localStorage.setItem('cykelhjalpen.lang', next)
    } catch {
      /* ignore */
    }
    const path = location.pathname || '/'
    const suffix = `${location.search}${location.hash}`

    let target: string
    if (next === 'en') {
      const mapped = toEnglishPath(path)
      target = mapped ? (mapped === '/' ? EN_PREFIX : `${EN_PREFIX}${mapped}`) : EN_PREFIX
    } else {
      target = toSwedishPath(path) || '/'
    }
    window.location.assign(`${target}${suffix}`)
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border-2 border-[hsl(var(--ink))] bg-card px-1 h-9 ${className}`}
      role="group"
      aria-label="Språk / Language"
    >
      <Globe className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" aria-hidden="true" />
      {(['sv', 'en'] as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => go(code)}
          aria-current={lang === code ? 'true' : undefined}
          className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-colors ${
            lang === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
