ALTER TABLE public.bike_repair_requests
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Befintliga stängda ärenden får en startpunkt så påminnelserna kan räknas.
UPDATE public.bike_repair_requests
   SET closed_at = COALESCE(updated_at, created_at)
 WHERE closed_at IS NULL
   AND status = 'closed_for_responses';

CREATE INDEX IF NOT EXISTS bike_repair_requests_closed_at_idx
  ON public.bike_repair_requests (closed_at)
  WHERE status = 'closed_for_responses';