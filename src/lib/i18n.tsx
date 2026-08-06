import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { EN } from '../locales/en'

export type Lang = 'sv' | 'en'

/** Path prefix used for the English version of the site. */
export const EN_PREFIX = '/en'

/** Reads the active language from the raw browser pathname (before router basename strips it). */
export function getLangFromLocation(): Lang {
  if (typeof window === 'undefined') return 'sv'
  const p = window.location.pathname
  return p === EN_PREFIX || p.startsWith(`${EN_PREFIX}/`) ? 'en' : 'sv'
}

/** Router basename for the active language. */
export function getRouterBasename(): string {
  return getLangFromLocation() === 'en' ? EN_PREFIX : '/'
}

/** Full (non-basename) path for a route in a given language. */
export function localizedHref(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return lang === 'en' ? `${EN_PREFIX}${clean === '/' ? '' : clean}` || EN_PREFIX : clean
}

type Vars = Record<string, string | number>

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m))
}

export type TFunction = (sv: string, vars?: Vars) => string

const LanguageContext = createContext<{ lang: Lang; t: TFunction }>({
  lang: 'sv',
  t: (sv, vars) => interpolate(sv, vars),
})

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const lang = getLangFromLocation()

  const value = useMemo(() => {
    const t: TFunction = (sv, vars) => interpolate(lang === 'en' ? EN[sv] ?? sv : sv, vars)
    return { lang, t }
  }, [lang])

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Convenience hook: const t = useT() */
export function useT(): TFunction {
  return useContext(LanguageContext).t
}

/** Pick between a Swedish and an English value (for non-string content). */
export function useLocalized() {
  const { lang } = useContext(LanguageContext)
  return <T,>(sv: T, en: T): T => (lang === 'en' ? en : sv)
}
