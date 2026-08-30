// V2 content engine — frontend surface for v2_content_pages (S7).
// Contract: docs/v2/CONTRACTS.md §2.6/§3.7/§5 (flag v2.seo.content_surface).
//
// Routing is DB-driven at RUNTIME (published-only via the RLS policy
// "V2 public reads published content pages"); build-time prerender has no DB
// access, so article pages rely on runtime Helmet — the documented pattern in
// the contract ("runtime Helmet + noindex-until-published is acceptable").
//
// Pure rules (slug validation, status transitions, publish gate) live in
// supabase/functions/_shared/v2/content.ts and are re-exported here so edge
// and frontend share ONE implementation.

import type { SupabaseClient } from '@supabase/supabase-js'

export {
  V2_CONTENT_HOST,
  V2_GUIDE_PATH_PREFIX,
  V2_CONTENT_PUBLISH_MONTHLY_CAP,
  V2_CONTENT_ACTIONS,
  V2_CONTENT_STATUSES,
  V2_CONTENT_PAGE_TYPES,
  V2_GUIDE_SLUG_RE,
  isValidGuideSlug,
  normalizeGuidePath,
  guideSlugFromPath,
  contentPublishBlockers,
  nextContentStatus,
  publishCadenceExceeded,
  type V2ContentAction,
  type V2ContentStatus,
  type V2ContentPageType,
} from '../../../supabase/functions/_shared/v2/content'

import {
  guideSlugFromPath,
  type V2ContentStatus,
  type V2ContentPageType,
} from '../../../supabase/functions/_shared/v2/content'

export const CYKEL_SITE_ORIGIN = 'https://cykelhjalpen.se'

// ---------------------------------------------------------------------------
// Row type (until supabase types are regenerated, S13)
// ---------------------------------------------------------------------------

export interface V2ContentPageRow {
  id: string
  host: string
  path: string
  page_type: V2ContentPageType
  status: V2ContentStatus
  indexability: 'index' | 'noindex' | 'auto'
  title: string
  description: string | null
  body_markdown: string | null
  data_modules: Record<string, unknown>[]
  author_name: string | null
  author_title: string | null
  reviewer_name: string | null
  reviewer_title: string | null
  reviewed_at: string | null
  published_at: string | null
  city_slugs: string[]
  service_categories: string[]
  related_paths: string[]
  created_at: string
  updated_at: string
}

const PUBLIC_COLUMNS =
  'id, host, path, page_type, status, indexability, title, description, body_markdown, ' +
  'data_modules, author_name, author_title, reviewer_name, reviewer_title, reviewed_at, ' +
  'published_at, city_slugs, service_categories, related_paths, created_at, updated_at'

type UntypedClient = SupabaseClient<any, 'public', any>

let defaultClient: UntypedClient | null = null
async function db(client?: UntypedClient): Promise<UntypedClient> {
  if (client) return client
  if (!defaultClient) {
    const mod = await import('@/integrations/supabase/client')
    defaultClient = mod.supabase as unknown as UntypedClient
  }
  return defaultClient
}

/** Published guide pages, newest first. RLS additionally enforces published-only. */
export async function fetchPublishedGuides(opts: { client?: UntypedClient } = {}): Promise<V2ContentPageRow[]> {
  const { data, error } = await (await db(opts.client))
    .from('v2_content_pages')
    .select(PUBLIC_COLUMNS)
    .eq('host', 'cykelhjalpen')
    .eq('page_type', 'guide')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as V2ContentPageRow[]
}

/** One published page by path, or null (drafts are invisible to anon via RLS). */
export async function fetchPublishedContentPage(
  path: string,
  opts: { client?: UntypedClient } = {},
): Promise<V2ContentPageRow | null> {
  const { data, error } = await (await db(opts.client))
    .from('v2_content_pages')
    .select(PUBLIC_COLUMNS)
    .eq('host', 'cykelhjalpen')
    .eq('path', path)
    .eq('status', 'published')
    .maybeSingle()
  if (error) throw error
  return (data as unknown as V2ContentPageRow | null) ?? null
}

// ---------------------------------------------------------------------------
// Reading time + table of contents (pure)
// ---------------------------------------------------------------------------

/** ~200 Swedish words/minute, minimum 1 minute. */
export function computeReadingTimeMinutes(markdown: string | null | undefined): number {
  if (!markdown) return 1
  const words = markdown.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

export interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

/** Stable anchor id for a heading (å/ä→a, ö→o, lowercase, hyphenated). */
export function headingAnchorId(text: string, used: Set<string> = new Set()): string {
  let id = text
    .toLowerCase()
    .replace(/å|ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!id) id = 'sektion'
  let candidate = id
  let n = 2
  while (used.has(candidate)) candidate = `${id}-${n++}`
  used.add(candidate)
  return candidate
}

/** Extract ## / ### headings from body markdown for the TOC. */
export function extractToc(markdown: string | null | undefined): TocItem[] {
  if (!markdown) return []
  const used = new Set<string>()
  const items: TocItem[] = []
  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*$/)
    if (!match) continue
    const text = match[2].replace(/\*\*/g, '')
    items.push({ id: headingAnchorId(text, used), text, level: match[1].length as 2 | 3 })
  }
  return items
}

// ---------------------------------------------------------------------------
// SEO metadata + JSON-LD (pure builders, unit-tested)
// ---------------------------------------------------------------------------

export interface ContentSeoMeta {
  title: string
  description: string
  canonical: string
  robots: string
}

const INDEX_DIRECTIVE = 'index, follow, max-image-preview:large, max-snippet:-1'
const NOINDEX_DIRECTIVE = 'noindex, follow'

/**
 * Robots resolution. 'auto' = "resolved from data thresholds at render"
 * (contract §2.6); no content thresholds exist yet, so auto fails SAFE to
 * noindex until a future contract revision defines them.
 */
export function resolveContentRobots(indexability: 'index' | 'noindex' | 'auto'): string {
  return indexability === 'index' ? INDEX_DIRECTIVE : NOINDEX_DIRECTIVE
}

export function buildContentSeoMeta(page: Pick<V2ContentPageRow, 'path' | 'title' | 'description' | 'indexability'>): ContentSeoMeta {
  return {
    title: `${page.title} | Cykelhjälpen`,
    description:
      page.description?.trim() ||
      'Guide från Cykelhjälpen – jämför lokala cykelverkstäder gratis och utan köpplikt.',
    canonical: `${CYKEL_SITE_ORIGIN}${page.path}`,
    robots: resolveContentRobots(page.indexability),
  }
}

/** Article + BreadcrumbList JSON-LD. Reviewer is exposed as `editor` (E-E-A-T). */
export function buildArticleJsonLd(page: V2ContentPageRow, readingTimeMinutes: number) {
  const canonical = `${CYKEL_SITE_ORIGIN}${page.path}`
  const author = page.author_name
    ? {
        '@type': page.author_title ? 'Person' : 'Organization',
        name: page.author_name,
        ...(page.author_title ? { jobTitle: page.author_title } : {}),
      }
    : { '@type': 'Organization', name: 'Cykelhjälpen' }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: page.title,
        description: page.description ?? undefined,
        inLanguage: 'sv-SE',
        mainEntityOfPage: canonical,
        isPartOf: { '@id': `${CYKEL_SITE_ORIGIN}/#website` },
        publisher: { '@type': 'Organization', name: 'Cykelhjälpen', url: CYKEL_SITE_ORIGIN },
        author,
        ...(page.reviewer_name
          ? {
              editor: {
                '@type': 'Person',
                name: page.reviewer_name,
                ...(page.reviewer_title ? { jobTitle: page.reviewer_title } : {}),
              },
            }
          : {}),
        ...(page.published_at ? { datePublished: page.published_at } : {}),
        dateModified: page.updated_at,
        wordCount: readingTimeMinutes > 0 ? readingTimeMinutes * 200 : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: `${CYKEL_SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Guider', item: `${CYKEL_SITE_ORIGIN}/guider` },
          { '@type': 'ListItem', position: 3, name: page.title, item: canonical },
        ],
      },
    ],
  }
}

/** Breadcrumb JSON-LD for the guides index. */
export function buildGuidesIndexJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Cykelhjälpen', item: `${CYKEL_SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Guider', item: `${CYKEL_SITE_ORIGIN}/guider` },
    ],
  }
}

// ---------------------------------------------------------------------------
// Related guides + city/service links (pure)
// ---------------------------------------------------------------------------

/**
 * Related guides: curated related_paths first (in given order), then pages
 * sharing city_slugs/service_categories (most overlap first, newest first).
 * Self and non-published rows are never returned. Cap = 3 by default.
 */
export function selectRelatedGuides(
  current: Pick<V2ContentPageRow, 'path' | 'related_paths' | 'city_slugs' | 'service_categories'>,
  candidates: Pick<V2ContentPageRow, 'path' | 'status' | 'title' | 'description' | 'published_at' | 'city_slugs' | 'service_categories'>[],
  max = 3,
) {
  const pool = candidates.filter((c) => c.status === 'published' && c.path !== current.path)
  const byPath = new Map(pool.map((c) => [c.path, c]))

  const curated: typeof pool = []
  for (const p of current.related_paths ?? []) {
    const hit = byPath.get(p)
    if (hit && !curated.includes(hit)) curated.push(hit)
  }

  const score = (c: (typeof pool)[number]) =>
    (c.city_slugs ?? []).filter((s) => (current.city_slugs ?? []).includes(s)).length * 2 +
    (c.service_categories ?? []).filter((s) => (current.service_categories ?? []).includes(s)).length * 3

  const rest = pool
    .filter((c) => !curated.includes(c))
    .sort((a, b) => {
      const diff = score(b) - score(a)
      if (diff !== 0) return diff
      return (b.published_at ?? '').localeCompare(a.published_at ?? '')
    })

  return [...curated, ...rest].slice(0, max)
}

/** Transactional service-page path for a category stem + city slug. */
export function servicePagePath(serviceCategoryStem: string, citySlug: string): string {
  return `/${serviceCategoryStem}-${citySlug}`
}

/** First city of an article, used to prefill the /skicka-arende CTA. */
export function primaryCitySlug(page: Pick<V2ContentPageRow, 'city_slugs'>): string | null {
  return page.city_slugs?.[0] ?? null
}

/** Human label for a /guider path (for breadcrumbs/logging). */
export function guideLabelFromPath(path: string): string {
  return guideSlugFromPath(path) ?? path
}
