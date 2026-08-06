import { useCallback, useMemo } from 'react'
import { sv, type Dictionary } from './sv'
import { en } from './en'
import { EN_PREFIX, englishHref, toSwedishPath, toEnglishPath } from './routes'

export type Lang = 'sv' | 'en'
export { EN_PREFIX, englishHref, toSwedishPath, toEnglishPath }
export type { Dictionary }

const DICTIONARIES: Record<Lang, Dictionary> = { sv, en }
const STORAGE_KEY = 'cykelhjalpen.lang'

/** Language is derived from the URL prefix only — never from navigator.language. */
export function getLangFromPathname(pathname?: string): Lang {
  const p = pathname ?? (typeof window === 'undefined' ? '/' : window.location.pathname)
  return p === EN_PREFIX || p.startsWith(`${EN_PREFIX}/`) ? 'en' : 'sv'
}

/** Remembers the visitor's choice. Used for UI only — we never auto-redirect. */
export function rememberLang(lang: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* ignore private-mode failures */
  }
}

export function getRememberedLang(): Lang | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'en' || value === 'sv' ? value : null
  } catch {
    return null
  }
}

type Vars = Record<string, string | number>

const interpolate = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m)) : text

const lookup = (dict: Dictionary, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, dict)
  return typeof value === 'string' ? value : undefined
}

/** Simple key-based translation hook. Language comes from the URL prefix. */
export function useTranslation() {
  const lang = getLangFromPathname()
  const dict = DICTIONARIES[lang]

  const tr = useCallback(
    (key: string, vars?: Vars) => interpolate(lookup(dict, key) ?? lookup(sv, key) ?? key, vars),
    [dict],
  )

  return useMemo(() => ({ lang, tr, dict }), [lang, tr, dict])
}
