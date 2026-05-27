
-- Add admin approval gate to bike requests
ALTER TABLE public.bike_repair_requests
  ADD COLUMN IF NOT EXISTS admin_status TEXT NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Backfill: any existing requests are treated as approved so the current flow keeps working
UPDATE public.bike_repair_requests SET admin_status = 'approved', approved_at = COALESCE(approved_at, created_at) WHERE admin_status = 'pending_approval' AND created_at < now();

-- Free-lead credits granted by admin
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS free_leads_remaining INTEGER NOT NULL DEFAULT 0;

-- Track free leads on responses (so we never charge twice and can show in admin)
ALTER TABLE public.workshop_responses
  ADD COLUMN IF NOT EXISTS used_free_lead BOOLEAN NOT NULL DEFAULT false;

-- Audit trail of admin free-lead grants
CREATE TABLE IF NOT EXISTS public.free_lead_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.free_lead_grants TO authenticated;
GRANT ALL ON public.free_lead_grants TO service_role;

ALTER TABLE public.free_lead_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read free lead grants"
  ON public.free_lead_grants FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert free lead grants"
  ON public.free_lead_grants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());
