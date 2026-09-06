-- Workshop magic-quote SMS link (admin copy only; ZERO outbound SMS).
-- Flag `workshop_magic_quote` is seeded OFF and must stay OFF in production
-- until an explicit ops decision. Tokens are hashed; the raw token is returned
-- once from create-workshop-quote-link and never stored.
--
-- How to turn on later (preview / staging only — never prod in the first ship):
--   UPDATE public.v2_feature_flags SET enabled = true
--     WHERE key = 'workshop_magic_quote';
--   -- OR, for a preview deploy that must not touch prod DB:
--   --   Vercel Preview: VITE_WORKSHOP_MAGIC_QUOTE=true
--   --   Supabase Edge (non-prod project): WORKSHOP_MAGIC_QUOTE=true
-- How to turn off: set enabled=false and unset both env vars. Existing unused
-- tokens stop working immediately (edge functions fail closed).
--
-- Rollback:
--   DELETE FROM public.v2_feature_flags WHERE key = 'workshop_magic_quote';
--   DROP TABLE IF EXISTS public.workshop_quote_tokens;

INSERT INTO public.v2_feature_flags (key, enabled, description) VALUES
  ('workshop_magic_quote', false,
   'Admin kan kopiera ett SMS med magisk offertlänk (/offert/:token). Ingen automatisk utskick. DEFAULT OFF.');

CREATE TABLE public.workshop_quote_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.bike_repair_requests(id) ON DELETE CASCADE,
  created_by uuid NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workshop_quote_tokens_workshop_request_idx
  ON public.workshop_quote_tokens (workshop_id, request_id, created_at DESC);

CREATE INDEX workshop_quote_tokens_expires_idx
  ON public.workshop_quote_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.workshop_quote_tokens ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) bypasses RLS. Authenticated admins may read
-- for audit; nobody else — tokens are never a public table.
CREATE POLICY "Admin reads workshop quote tokens"
ON public.workshop_quote_tokens FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));
