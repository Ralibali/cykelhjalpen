import { getLangFromPathname } from './index'
import { EN_PREFIX, toEnglishPath } from './routes'

export const SITE_ORIGIN = 'https://cykelhjalpen.se'

/**
 * Language-aware canonical/og data for a page, based on its Swedish route path.
 * The English version always self-references — never the Swedish URL.
 */
export function usePageSeo(svPath: string) {
  const lang = getLangFromPathname()
  const enMapped = toEnglishPath(svPath)
  const enPath = enMapped ? (enMapped === '/' ? EN_PREFIX : `${EN_PREFIX}${enMapped}`) : null

  const svUrl = `${SITE_ORIGIN}${svPath === '/' ? '/' : svPath}`
  const enUrl = enPath ? `${SITE_ORIGIN}${enPath}` : null
  const canonical = lang === 'en' && enUrl ? enUrl : svUrl

  return {
    lang,
    canonical,
    svUrl,
    enUrl,
    ogLocale: lang === 'en' ? 'en_US' : 'sv_SE',
    ogLocaleAlternate: lang === 'en' ? 'sv_SE' : 'en_US',
  }
}
