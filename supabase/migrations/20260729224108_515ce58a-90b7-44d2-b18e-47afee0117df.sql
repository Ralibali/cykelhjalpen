-- ============================================================
-- 1. Bilduppladdning: kräv serverside-ägarkontroll (view_token)
-- ============================================================
DROP POLICY IF EXISTS "Upload bike-images for existing request" ON storage.objects;
DROP POLICY IF EXISTS "Anyone uploads bike image with valid request" ON public.bike_request_images;

REVOKE INSERT ON public.bike_request_images FROM anon, authenticated;
GRANT ALL ON public.bike_request_images TO service_role;

-- ============================================================
-- 2. Publika buckets: ta bort breda SELECT-policys (listning)
--    Publika buckets serveras ändå via /object/public/ utan RLS.
-- ============================================================
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read portfolio" ON storage.objects;

-- ============================================================
-- 3. Ersätt "always true"-policys med validerade villkor
-- ============================================================
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (
  email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) BETWEEN 6 AND 254
  AND (source IS NULL OR length(source) <= 64)
);

DROP POLICY IF EXISTS "Anyone inserts click events" ON public.click_events;
CREATE POLICY "Anyone inserts click events"
ON public.click_events FOR INSERT TO anon, authenticated
WITH CHECK (
  length(session_id) BETWEEN 8 AND 128
  AND length(event_name) BETWEEN 1 AND 128
  AND length(path) BETWEEN 1 AND 512
  AND (element_text IS NULL OR length(element_text) <= 256)
  AND (metadata IS NULL OR length(metadata::text) <= 2048)
);

DROP POLICY IF EXISTS "Anyone inserts page views" ON public.page_views;
CREATE POLICY "Anyone inserts page views"
ON public.page_views FOR INSERT TO anon, authenticated
WITH CHECK (
  length(session_id) BETWEEN 8 AND 128
  AND length(path) BETWEEN 1 AND 512
  AND (referrer IS NULL OR length(referrer) <= 512)
  AND (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop'))
);

-- ============================================================
-- 4. SECURITY DEFINER-funktioner: dra in EXECUTE där det inte behövs
-- ============================================================
DO $$
DECLARE
  fn record;
  keep_public text[] := ARRAY[
    'get_cykel_open_requests_teaser',
    'get_cykel_price_stats',
    'get_cykel_public_stats'
  ];
  keep_authenticated text[] := ARRAY[
    'is_admin',
    'is_approved_workshop',
    'get_workshop_id'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF fn.proname = ANY (keep_public) THEN
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);

    IF fn.proname = ANY (keep_authenticated) THEN
      -- Behövs av RLS-policys som körs som inloggad användare
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    END IF;

    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
  END LOOP;
END $$;