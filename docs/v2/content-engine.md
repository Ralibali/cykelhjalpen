# V2 Content Engine (S7) — implementation notes

Branch: `v2/content-engine` · Contract: CONTRACTS.md §2.6, §3.7, §5, §7 (G-C1)

## Surface

- Public routes (cykelhjalpen host only): `/guider` (index) + `/guider/:slug`
  (article). Both are wrapped in `ContentSurfaceGate` → flag
  `v2.seo.content_surface` OFF (default) = 404 via NotFound. No hreflang: the
  content surface is sv-SE only, no EN variants exist.
- Reads: direct `select` on `v2_content_pages` — the RLS policy
  "V2 public reads published content pages" (migration 20260830_…04) enforces
  published-only for anon; drafts are never visible to the public surface.
- Prerender: the build-time prerenderer (`vite.config.ts` + `seoStatic*`) has
  no DB access and only handles compile-time static routes, so DB-driven
  article pages CANNOT be prerendered at build time. Per contract this is the
  documented acceptable pattern: runtime Helmet (self-canonical, OG, robots
  from `indexability`, Article + BreadcrumbList JSON-LD) and published-only
  gating. Articles are intentionally absent from the build-time sitemap until
  a DB-driven sitemap step exists (avoids sitemap/404 mismatch while the flag
  is OFF).
- `indexability: 'auto'` fails SAFE to noindex — no data thresholds are
  defined for content pages yet (contract leaves them to a future revision).
- Internal linking: footer "Guider och råd" link is flag-gated (never links to
  a 404). Every article carries: CTA to `/skicka-arende` (city-prefilled from
  `city_slugs[0]`), related guides (`related_paths` curated first, then
  city/service overlap), city hub links + service-page links with H1 anchors
  from `CYKEL_SEO_PAGES`. No new orphans: the index links every published
  guide, and the index is footer-linked when the flag is on.

## Editorial workflow

- Admin UI: `/admin/innehall` (nav: Tillväxt → "Innehåll V2").
- All mutations go through edge function `v2-content-publish` (admin JWT).
  It enforces server-side: editorial gate (publish requires `reviewer_name` +
  `reviewed_at` + title + body), monthly publish cap (max 6 newly published /
  trailing 30 days — G-C1 scaled-content-abuse guard), path rules
  (`/guider/<ascii-slug>`), and emits `content.published`.
- Status machine: draft → in_review → published → archived; save_draft on a
  published page edits in place; on an archived page it revives to draft.
- Pure rules live in `supabase/functions/_shared/v2/content.ts` and are
  re-exported by `src/lib/v2/content.ts` (single implementation, vitest-tested).

## Seed (exemplary guide, migration 20260831_v2_content_engine_surface.sql)

One guide is seeded: `/guider/sa-valjer-du-cykelverkstad` ("Så väljer du
cykelverkstad – checklista", dim09 cluster C9 flagship), status `published`,
all editorial fields populated. It is the TEMPLATE + G-C1 evidence row, not
the start of a content farm (the ≤6/30d cap is enforced in the publish
function). **Reviewer identity is a placeholder** (`Johan Eriksson`) — replace
with a real, named partner mechanic (dim09 §5.1) before HQ flips
`v2.seo.content_surface`; the flag stays OFF until then, so nothing is public.

## Explicitly NOT done (stay-in-lane)

- No mass article generation; the Updro-scoped AI pipeline untouched.
- No fixes to DIM11's RelatedPages orphan bug (owned elsewhere); we only
  guarantee the new surface creates no new orphans.
