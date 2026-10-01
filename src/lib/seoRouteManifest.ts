import manifest from 'virtual:seo-route-manifest'
import type { SiteHost } from './hostConfig'

/** Paths that must stay noindex on the given host (computed at build time). */
export const getNoindexPaths = (host: SiteHost): string[] => manifest.noindexPaths[host]

/** Slugs of the Updro comparison pages (computed at build time). */
export const COMPARISON_SLUGS: string[] = manifest.comparisonSlugs
