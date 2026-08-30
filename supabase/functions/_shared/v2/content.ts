// V2 content engine — pure, dependency-free logic shared by the edge function
// v2-content-publish (imports with .ts extension) and the frontend/tests
// (src/lib/v2/content.ts re-exports). Contract: docs/v2/CONTRACTS.md §2.6/§3.7.
//
// Keep this file free of imports so both module systems can consume it.

export const V2_CONTENT_HOST = 'cykelhjalpen'
export const V2_GUIDE_PATH_PREFIX = '/guider/'

/** Scaled-content-abuse guard (CONTRACTS.md §7 G-C1): max published per 30 days. */
export const V2_CONTENT_PUBLISH_MONTHLY_CAP = 6

export const V2_CONTENT_ACTIONS = [
  'save_draft',
  'submit_review',
  'publish',
  'archive',
] as const
export type V2ContentAction = (typeof V2_CONTENT_ACTIONS)[number]

export const V2_CONTENT_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const
export type V2ContentStatus = (typeof V2_CONTENT_STATUSES)[number]

export const V2_CONTENT_PAGE_TYPES = ['guide', 'report', 'city_hub_extra', 'tool'] as const
export type V2ContentPageType = (typeof V2_CONTENT_PAGE_TYPES)[number]

/** Slug segment rules: lowercase ascii, digits, single hyphens between parts. */
export const V2_GUIDE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const V2_GUIDE_SLUG_MAX_LENGTH = 80

export function isValidGuideSlug(slug: string): boolean {
  return (
    typeof slug === 'string' &&
    slug.length > 0 &&
    slug.length <= V2_GUIDE_SLUG_MAX_LENGTH &&
    V2_GUIDE_SLUG_RE.test(slug)
  )
}

/**
 * Normalize admin input ("Guider/Byta-Däck/", "byta-dack", "/guider/byta-dack")
 * to the canonical path "/guider/byta-dack". Returns null when invalid.
 * Swedish å/ä/ö are transliterated like src/lib/cykelCities.ts slugify.
 */
export function normalizeGuidePath(input: string): string | null {
  if (typeof input !== 'string') return null
  let s = input.trim().toLowerCase()
  s = s.replace(/å|ä/g, 'a').replace(/ö/g, 'o')
  s = s.replace(/^\/+/, '').replace(/\/+$/, '')
  if (s === 'guider') return null // prefix without slug
  if (s.startsWith('guider/')) s = s.slice('guider/'.length)
  // Collapse whitespace and underscores into hyphens, drop other chars.
  s = s.replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-')
  if (!isValidGuideSlug(s)) return null
  return `${V2_GUIDE_PATH_PREFIX}${s}`
}

export function guideSlugFromPath(path: string): string | null {
  if (!path.startsWith(V2_GUIDE_PATH_PREFIX)) return null
  const slug = path.slice(V2_GUIDE_PATH_PREFIX.length)
  return isValidGuideSlug(slug) ? slug : null
}

/** Editorial gate (CONTRACTS.md §2.6): publishing requires reviewer + review date. */
export function contentPublishBlockers(page: {
  reviewer_name?: string | null
  reviewed_at?: string | null
  title?: string | null
  body_markdown?: string | null
}): string[] {
  const blockers: string[] = []
  if (!page.title || !page.title.trim()) blockers.push('missing_title')
  if (!page.body_markdown || !page.body_markdown.trim()) blockers.push('missing_body')
  if (!page.reviewer_name || !page.reviewer_name.trim()) blockers.push('missing_reviewer_name')
  if (!page.reviewed_at) blockers.push('missing_reviewed_at')
  return blockers
}

/**
 * Status transition for an action. Returns the next status, or the current
 * status when the action leaves it unchanged (save_draft on published edits
 * fields in place without unpublishing), or null when not allowed.
 * save_draft on an archived page revives it to draft.
 */
export function nextContentStatus(
  current: V2ContentStatus,
  action: V2ContentAction,
): V2ContentStatus | null {
  switch (action) {
    case 'save_draft':
      if (current === 'archived') return 'draft'
      if (current === 'draft' || current === 'in_review') return 'draft'
      return current // published: edit fields without unpublishing
    case 'submit_review':
      return current === 'draft' || current === 'in_review' ? 'in_review' : null
    case 'publish':
      return 'published'
    case 'archive':
      return 'archived'
    default:
      return null
  }
}

/**
 * Monthly publish-cadence check (G-C1). `recentlyPublishedCount` = rows with
 * status published and published_at within the trailing 30 days, EXCLUDING the
 * page being published (re-publishing an already-recent page is always allowed).
 */
export function publishCadenceExceeded(recentlyPublishedCount: number): boolean {
  return recentlyPublishedCount >= V2_CONTENT_PUBLISH_MONTHLY_CAP
}

/** Fields the publish function accepts in `fields` (whitelist, §3.7). */
export const V2_CONTENT_EDITABLE_FIELDS = [
  'page_type',
  'indexability',
  'title',
  'description',
  'body_markdown',
  'data_modules',
  'author_name',
  'author_title',
  'reviewer_name',
  'reviewer_title',
  'reviewed_at',
  'city_slugs',
  'service_categories',
  'related_paths',
] as const
export type V2ContentEditableField = (typeof V2_CONTENT_EDITABLE_FIELDS)[number]
