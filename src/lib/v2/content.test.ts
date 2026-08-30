// Tests for the V2 content engine pure logic (S7).
// The rules are shared with the edge function v2-content-publish via
// supabase/functions/_shared/v2/content.ts (re-exported by ./content).

import { describe, expect, it } from 'vitest'

import {
  V2_CONTENT_PUBLISH_MONTHLY_CAP,
  buildArticleJsonLd,
  buildContentSeoMeta,
  computeReadingTimeMinutes,
  contentPublishBlockers,
  extractToc,
  guideSlugFromPath,
  headingAnchorId,
  isValidGuideSlug,
  nextContentStatus,
  normalizeGuidePath,
  publishCadenceExceeded,
  resolveContentRobots,
  selectRelatedGuides,
  servicePagePath,
  V2_CONTENT_STATUSES,
  V2_CONTENT_ACTIONS,
  type V2ContentPageRow,
  type V2ContentStatus,
} from './content'

// ---------------------------------------------------------------------------
// Slug / path rules
// ---------------------------------------------------------------------------

describe('guide slug rules', () => {
  it('accepts lowercase ascii slugs with hyphens', () => {
    expect(isValidGuideSlug('sa-valjer-du-cykelverkstad')).toBe(true)
    expect(isValidGuideSlug('punktering')).toBe(true)
    expect(isValidGuideSlug('guide-2026')).toBe(true)
  })

  it('rejects uppercase, spaces, swedish chars, slashes and empty', () => {
    expect(isValidGuideSlug('Byta-Dack')).toBe(false)
    expect(isValidGuideSlug('byta dack')).toBe(false)
    expect(isValidGuideSlug('byta-däck')).toBe(false)
    expect(isValidGuideSlug('/guider/x')).toBe(false)
    expect(isValidGuideSlug('')).toBe(false)
    expect(isValidGuideSlug('-ledande')).toBe(false)
    expect(isValidGuideSlug('avslutande-')).toBe(false)
    expect(isValidGuideSlug('dubbel--bindestreck')).toBe(false)
  })

  it('rejects slugs over the max length', () => {
    expect(isValidGuideSlug('a'.repeat(81))).toBe(false)
    expect(isValidGuideSlug('a'.repeat(80))).toBe(true)
  })
})

describe('normalizeGuidePath', () => {
  it('normalizes admin input to /guider/<slug>', () => {
    expect(normalizeGuidePath('byta-dack')).toBe('/guider/byta-dack')
    expect(normalizeGuidePath('/guider/byta-dack')).toBe('/guider/byta-dack')
    expect(normalizeGuidePath('Guider/Byta-Däck/')).toBe('/guider/byta-dack')
    expect(normalizeGuidePath('Så väljer du verkstad')).toBe('/guider/sa-valjer-du-verkstad')
  })

  it('returns null for unusable input', () => {
    expect(normalizeGuidePath('')).toBe(null)
    expect(normalizeGuidePath('///')).toBe(null)
    expect(normalizeGuidePath('guider/')).toBe(null)
    expect(normalizeGuidePath('!!!')).toBe(null)
  })
})

describe('guideSlugFromPath', () => {
  it('extracts the slug from a valid guide path', () => {
    expect(guideSlugFromPath('/guider/byta-dack')).toBe('byta-dack')
  })
  it('rejects non-guide paths and bad slugs', () => {
    expect(guideSlugFromPath('/artiklar/x')).toBe(null)
    expect(guideSlugFromPath('/guider/Dålig')).toBe(null)
  })
})

// ---------------------------------------------------------------------------
// Publish gating (draft must never be publicly reachable via an action)
// ---------------------------------------------------------------------------

describe('status transitions', () => {
  it('publish is the ONLY action that can MOVE a page into status published', () => {
    const statuses = V2_CONTENT_STATUSES.filter((s) => s !== 'published')
    for (const status of statuses) {
      for (const action of V2_CONTENT_ACTIONS) {
        const next = nextContentStatus(status as V2ContentStatus, action)
        if (action !== 'publish') expect(next).not.toBe('published')
      }
    }
    // save_draft on an already-published page edits in place (stays published)
    expect(nextContentStatus('published', 'save_draft')).toBe('published')
  })

  it('walks the editorial lifecycle draft → in_review → published → archived', () => {
    expect(nextContentStatus('draft', 'save_draft')).toBe('draft')
    expect(nextContentStatus('draft', 'submit_review')).toBe('in_review')
    expect(nextContentStatus('in_review', 'publish')).toBe('published')
    expect(nextContentStatus('published', 'archive')).toBe('archived')
  })

  it('save_draft on published edits in place; on archived revives to draft', () => {
    expect(nextContentStatus('published', 'save_draft')).toBe('published')
    expect(nextContentStatus('archived', 'save_draft')).toBe('draft')
  })

  it('submit_review from published/archived is not allowed', () => {
    expect(nextContentStatus('published', 'submit_review')).toBe(null)
    expect(nextContentStatus('archived', 'submit_review')).toBe(null)
  })
})

describe('editorial publish gate', () => {
  const ok = {
    title: 'Titel',
    body_markdown: 'Brödtext',
    reviewer_name: 'Mekaniker Mekanikersson',
    reviewed_at: '2026-08-30T10:00:00Z',
  }

  it('passes with reviewer + reviewed_at + content', () => {
    expect(contentPublishBlockers(ok)).toEqual([])
  })

  it('blocks without named reviewer or review date (E-E-A-T gate)', () => {
    expect(contentPublishBlockers({ ...ok, reviewer_name: null })).toContain('missing_reviewer_name')
    expect(contentPublishBlockers({ ...ok, reviewer_name: '  ' })).toContain('missing_reviewer_name')
    expect(contentPublishBlockers({ ...ok, reviewed_at: null })).toContain('missing_reviewed_at')
  })

  it('blocks without title/body', () => {
    expect(contentPublishBlockers({ ...ok, title: '' })).toContain('missing_title')
    expect(contentPublishBlockers({ ...ok, body_markdown: '' })).toContain('missing_body')
  })
})

describe('monthly publish cadence (G-C1 scaled-content guard)', () => {
  it('caps at the contract limit', () => {
    expect(V2_CONTENT_PUBLISH_MONTHLY_CAP).toBe(6)
    expect(publishCadenceExceeded(5)).toBe(false)
    expect(publishCadenceExceeded(6)).toBe(true)
    expect(publishCadenceExceeded(12)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Reading time + TOC
// ---------------------------------------------------------------------------

describe('computeReadingTimeMinutes', () => {
  it('is at least 1 minute and scales with word count', () => {
    expect(computeReadingTimeMinutes('')).toBe(1)
    expect(computeReadingTimeMinutes('kort text')).toBe(1)
    expect(computeReadingTimeMinutes(Array(400).fill('ord').join(' '))).toBe(2)
    expect(computeReadingTimeMinutes(Array(1000).fill('ord').join(' '))).toBe(5)
  })
})

describe('extractToc', () => {
  it('extracts ## and ### headings with stable anchor ids', () => {
    const toc = extractToc('Intro\n\n## Första avsnittet\n\nText\n\n### Underrubrik åäö\n\n## Andra')
    expect(toc).toEqual([
      { id: 'forsta-avsnittet', text: 'Första avsnittet', level: 2 },
      { id: 'underrubrik-aao', text: 'Underrubrik åäö', level: 3 },
      { id: 'andra', text: 'Andra', level: 2 },
    ])
  })

  it('dedupes repeated headings and strips bold markers', () => {
    const toc = extractToc('## Pris\n\n## Pris\n\n## **Pris**')
    expect(toc.map((t) => t.id)).toEqual(['pris', 'pris-2', 'pris-3'])
    expect(toc[2].text).toBe('Pris')
  })

  it('returns empty for no headings', () => {
    expect(extractToc('Bara text')).toEqual([])
    expect(extractToc(null)).toEqual([])
  })
})

describe('headingAnchorId', () => {
  it('handles empty headings deterministically', () => {
    const used = new Set<string>()
    expect(headingAnchorId('', used)).toBe('sektion')
    expect(headingAnchorId('', used)).toBe('sektion-2')
  })
})

// ---------------------------------------------------------------------------
// Metadata builders
// ---------------------------------------------------------------------------

describe('resolveContentRobots', () => {
  it('index → index,follow; noindex and auto → noindex,follow (auto fails safe)', () => {
    expect(resolveContentRobots('index')).toContain('index')
    expect(resolveContentRobots('index')).not.toContain('noindex')
    expect(resolveContentRobots('noindex')).toContain('noindex')
    expect(resolveContentRobots('auto')).toContain('noindex')
  })
})

describe('buildContentSeoMeta', () => {
  it('builds self-canonical, branded title and fallback description', () => {
    const meta = buildContentSeoMeta({
      path: '/guider/byta-dack',
      title: 'Byta däck',
      description: null,
      indexability: 'index',
    })
    expect(meta.title).toBe('Byta däck | Cykelhjälpen')
    expect(meta.canonical).toBe('https://cykelhjalpen.se/guider/byta-dack')
    expect(meta.description.length).toBeGreaterThan(20)
    expect(meta.robots).toContain('index')
  })

  it('uses the explicit description when present', () => {
    const meta = buildContentSeoMeta({
      path: '/guider/x',
      title: 'X',
      description: ' Egen beskrivning ',
      indexability: 'noindex',
    })
    expect(meta.description).toBe('Egen beskrivning')
    expect(meta.robots).toContain('noindex')
  })
})

const fullPage = (overrides: Partial<V2ContentPageRow> = {}): V2ContentPageRow => ({
  id: '1',
  host: 'cykelhjalpen',
  path: '/guider/sa-valjer-du-cykelverkstad',
  page_type: 'guide',
  status: 'published',
  indexability: 'index',
  title: 'Så väljer du cykelverkstad',
  description: 'En checklista.',
  body_markdown: 'Text',
  data_modules: [],
  author_name: 'Redaktionen Cykelhjälpen',
  author_title: 'Cykelhjälpens redaktion',
  reviewer_name: 'Mekaniker Exempel',
  reviewer_title: 'Cykelmekaniker',
  reviewed_at: '2026-08-30T10:00:00Z',
  published_at: '2026-08-30T12:00:00Z',
  city_slugs: ['linkoping'],
  service_categories: ['cykelverkstad'],
  related_paths: [],
  created_at: '2026-08-30T09:00:00Z',
  updated_at: '2026-08-30T13:00:00Z',
  ...overrides,
})

describe('buildArticleJsonLd', () => {
  it('emits Article + BreadcrumbList with author, reviewer (editor) and dates', () => {
    const ld = buildArticleJsonLd(fullPage(), 4) as any
    const [article, breadcrumb] = ld['@graph']
    expect(article['@type']).toBe('Article')
    expect(article.headline).toBe('Så väljer du cykelverkstad')
    expect(article.author.name).toBe('Redaktionen Cykelhjälpen')
    expect(article.editor).toEqual({ '@type': 'Person', name: 'Mekaniker Exempel', jobTitle: 'Cykelmekaniker' })
    expect(article.datePublished).toBe('2026-08-30T12:00:00Z')
    expect(article.dateModified).toBe('2026-08-30T13:00:00Z')
    expect(article.inLanguage).toBe('sv-SE')
    expect(breadcrumb['@type']).toBe('BreadcrumbList')
    expect(breadcrumb.itemListElement.map((i: any) => i.name)).toEqual([
      'Cykelhjälpen', 'Guider', 'Så väljer du cykelverkstad',
    ])
    expect(breadcrumb.itemListElement[2].item).toBe('https://cykelhjalpen.se/guider/sa-valjer-du-cykelverkstad')
  })

  it('omits editor when no reviewer and falls back to Organization author', () => {
    const ld = buildArticleJsonLd(fullPage({ reviewer_name: null, author_name: null }), 1) as any
    const [article] = ld['@graph']
    expect(article.editor).toBeUndefined()
    expect(article.author).toEqual({ '@type': 'Organization', name: 'Cykelhjälpen' })
  })
})

// ---------------------------------------------------------------------------
// Related guides
// ---------------------------------------------------------------------------

const candidate = (path: string, overrides: Record<string, unknown> = {}) => ({
  path,
  status: 'published' as V2ContentStatus,
  title: path,
  description: null,
  published_at: '2026-08-01T00:00:00Z',
  city_slugs: [] as string[],
  service_categories: [] as string[],
  ...overrides,
})

describe('selectRelatedGuides', () => {
  it('returns curated related_paths first, in order', () => {
    const current = { path: '/guider/a', related_paths: ['/guider/b', '/guider/c'], city_slugs: [], service_categories: [] }
    const out = selectRelatedGuides(current, [
      candidate('/guider/c'),
      candidate('/guider/b'),
      candidate('/guider/d', { city_slugs: ['linkoping'] }),
    ])
    expect(out.map((r) => r.path)).toEqual(['/guider/b', '/guider/c', '/guider/d'])
  })

  it('never returns self, drafts or unpublished curated paths', () => {
    const current = { path: '/guider/a', related_paths: ['/guider/draft', '/guider/a'], city_slugs: [], service_categories: [] }
    const out = selectRelatedGuides(current, [
      candidate('/guider/a'),
      candidate('/guider/draft', { status: 'draft' }),
      candidate('/guider/ok'),
    ])
    expect(out.map((r) => r.path)).toEqual(['/guider/ok'])
  })

  it('ranks overlap by service categories above shared cities, newest first on ties', () => {
    const current = { path: '/guider/a', related_paths: [], city_slugs: ['lund'], service_categories: ['punktering'] }
    const out = selectRelatedGuides(current, [
      candidate('/guider/same-city', { city_slugs: ['lund'] }),
      candidate('/guider/same-service', { service_categories: ['punktering'], published_at: '2026-07-01T00:00:00Z' }),
      candidate('/guider/unrelated'),
    ])
    expect(out.map((r) => r.path)).toEqual(['/guider/same-service', '/guider/same-city', '/guider/unrelated'])
  })

  it('caps the result at max (default 3)', () => {
    const current = { path: '/guider/a', related_paths: [], city_slugs: [], service_categories: [] }
    const out = selectRelatedGuides(current, [1, 2, 3, 4, 5].map((n) => candidate(`/guider/${n}`)))
    expect(out).toHaveLength(3)
    expect(selectRelatedGuides(current, [1, 2].map((n) => candidate(`/guider/${n}`)), 2)).toHaveLength(2)
  })
})

describe('servicePagePath', () => {
  it('maps stem + city slug to the transactional route', () => {
    expect(servicePagePath('punktering', 'linkoping')).toBe('/punktering-linkoping')
  })
})
