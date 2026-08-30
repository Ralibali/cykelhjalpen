-- V2 QA FIX 02 — flag-aware public read policy on v2_content_pages
-- (adversarial QA MEDIUM, item 5). Replaces one V2 policy in place
-- (DROP POLICY + CREATE POLICY, same name); no data changes.
--
-- Background: "V2 public reads published content pages"
-- (20260830_v2_contracts_04_growth.sql:41-44) exposed every published row —
-- including the seeded guide with its placeholder reviewer identity — via
-- PostgREST to anon even while the /guider surface is flag-gated off
-- (ContentSurfaceGate only guards the frontend route). The seeded row stays
-- status='published' by design (gate G-C1 owns go-live); the API must honor
-- the same flag as the route.
--
-- The replacement policy requires status='published' AND flag
-- v2.seo.content_surface ON. The EXISTS subquery is safe for anon:
-- v2_feature_flags has policy "V2 public reads feature flags" USING (true)
-- (20260830_v2_contracts_01_foundation.sql). Admin policy
-- "V2 admin manages content pages" is untouched.
--
-- Rollback:
--   drop policy "V2 public reads published content pages" on public.v2_content_pages;
--   create policy "V2 public reads published content pages"
--     on public.v2_content_pages for select to anon, authenticated
--     using (status = 'published');

DROP POLICY IF EXISTS "V2 public reads published content pages" ON public.v2_content_pages;

CREATE POLICY "V2 public reads published content pages"
ON public.v2_content_pages FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1
    FROM public.v2_feature_flags f
    WHERE f.key = 'v2.seo.content_surface'
      AND f.enabled = true
  )
);
