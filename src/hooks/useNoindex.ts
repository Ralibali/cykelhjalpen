import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Enforce noindex,nofollow on private/app/admin pages.
 * Idempotent: safe to call from layouts that wrap many routes.
 *
 * Behavior:
 *  - Always sets <meta name="robots" content="noindex, nofollow">
 *  - Sets a self-referential canonical so the page never inherits the
 *    home/canonical of a previous indexable page.
 *  - Strips og:url drift (sets it to current path).
 */
export function useNoindex() {
  const location = useLocation()

  useEffect(() => {
    if (typeof document === 'undefined') return

    // robots
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = 'noindex, nofollow'

    // canonical → self
    const selfUrl = `https://updro.se${location.pathname}`
    let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canon) {
      canon = document.createElement('link')
      canon.rel = 'canonical'
      document.head.appendChild(canon)
    }
    canon.href = selfUrl

    // og:url drift
    const ogUrl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null
    if (ogUrl) ogUrl.setAttribute('content', selfUrl)
  }, [location.pathname])
}
