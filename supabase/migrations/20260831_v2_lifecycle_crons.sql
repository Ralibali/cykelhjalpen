-- V2 LIFECYCLE AUTOMATION (S2) — cron-registrering, vinst-tidsstämpel och
-- RPC för kundens omval efter stallad vinnare.
-- Contract: docs/v2/CONTRACTS.md §2.2, §3.2, invariant I7 (alla crons
-- registrerade och verifierbara via `select * from cron.job`).
-- ADDITIVE ONLY: en ny nullable kolumn, en ny triggerfunktion, en ny RPC,
-- nya cron-jobb. Ingen befintlig kolumn/data rörs.
--
-- Rollback:
--   select cron.unschedule('bike-choice-reminders-hourly');
--   select cron.unschedule('offer-reminder-cron-daily');
--   select cron.unschedule('v2-zero-quote-rescue-hourly');
--   select cron.unschedule('v2-winner-reminders-hourly');
--   select cron.unschedule('v2-stalled-winner-recovery-daily');
--   drop function public.v2_reselect_bike_winner(uuid, uuid);
--   drop trigger trg_v2_set_won_at on public.workshop_responses;
--   drop function public.v2_set_won_at();
--   alter table public.workshop_responses drop column won_at;
--   (close-stale-bike-requests-hourly fanns sedan 20260813 och rörs inte.)

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- ============================================
-- 1. won_at på workshop_responses (S2)
--    Behövs för kadenserna 2h/24h/48h i v2-winner-reminders — varken
--    created_at (offerttid) eller request.updated_at är vinsttidpunkten.
--    Sätts av triggern vid övergång till 'won' (även via omval).
-- ============================================
ALTER TABLE public.workshop_responses
  ADD COLUMN won_at timestamptz NULL;

COMMENT ON COLUMN public.workshop_responses.won_at IS
  'V2 (S2): tidpunkt då svaret blev vinnare. Drivs av triggern trg_v2_set_won_at.';

CREATE OR REPLACE FUNCTION public.v2_set_won_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' AND NEW.won_at IS NULL THEN
    NEW.won_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_v2_set_won_at ON public.workshop_responses;
CREATE TRIGGER trg_v2_set_won_at
BEFORE UPDATE ON public.workshop_responses
FOR EACH ROW
EXECUTE FUNCTION public.v2_set_won_at();

-- ============================================
-- 2. RPC v2_reselect_bike_winner (S2) — atomisk omvalsreglering.
--    Spegel av choose_bike_winner men för awaiting_reselection: gamla
--    vinnaren → 'lost' (stalled_at bevaras), kandidaten → 'won',
--    ärendet → 'completed', reselection_count +1. Kandidater är de
--    tidigare 'lost'-svaren (aldrig reglerade); svar som själva stallat
--    (stalled_at satt) får aldrig väljas om.
-- ============================================
CREATE OR REPLACE FUNCTION public.v2_reselect_bike_winner(
  p_request_id uuid,
  p_response_id uuid
)
RETURNS TABLE (
  winner_workshop_id uuid,
  previous_response_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.bike_repair_requests%ROWTYPE;
  response_row public.workshop_responses%ROWTYPE;
  old_winner_id uuid;
BEGIN
  SELECT * INTO request_row FROM public.bike_repair_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'request_not_found';
  END IF;
  IF request_row.status <> 'awaiting_reselection' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'request_not_awaiting_reselection';
  END IF;

  SELECT * INTO response_row FROM public.workshop_responses WHERE id = p_response_id FOR UPDATE;
  IF NOT FOUND OR response_row.request_id <> p_request_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_found';
  END IF;
  IF response_row.status NOT IN ('sent', 'lost') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_not_selectable';
  END IF;
  IF response_row.stalled_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'response_previously_stalled';
  END IF;

  UPDATE public.workshop_responses SET status = 'lost'
   WHERE request_id = p_request_id AND status = 'won'
  RETURNING id INTO old_winner_id;

  UPDATE public.workshop_responses SET status = 'won' WHERE id = p_response_id;

  UPDATE public.bike_repair_requests
     SET status = 'completed',
         reselection_count = reselection_count + 1,
         updated_at = now()
   WHERE id = p_request_id;

  RETURN QUERY SELECT response_row.workshop_id, old_winner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.v2_reselect_bike_winner(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.v2_reselect_bike_winner(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.v2_reselect_bike_winner(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.v2_reselect_bike_winner(uuid, uuid) TO service_role;

-- ============================================
-- 3. Cron-registrering (registry R4-lektion: bike-choice-reminders var
--    aldrig schemalagd). Samtliga jobb är idempotenta att omregistrera.
--    V2-jobben är flaggade OFF i funktionerna (v2.liquidity.*) så
--    schemaläggningen är betydelseneutral tills gaterna passerats.
--
--    Kadens per funktion:
--      close-stale-bike-requests-hourly   '17 * * * *'  (befintlig, behålls)
--      bike-choice-reminders-hourly       '35 * * * *'  (varje timme, se header)
--      offer-reminder-cron-daily          '40 8 * * *'  (Updro: dags-kadens räcker)
--      v2-zero-quote-rescue-hourly        '0 * * * *'   (contract §3.2, hourly)
--      v2-winner-reminders-hourly         '10 * * * *'  (contract §3.2, hourly)
--      v2-stalled-winner-recovery-daily   '20 6 * * *'  (contract §3.2, daily)
-- ============================================

select cron.unschedule('close-stale-bike-requests-hourly')
where exists (select 1 from cron.job where jobname = 'close-stale-bike-requests-hourly');
select cron.schedule(
  'close-stale-bike-requests-hourly',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/close-stale-bike-requests',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.unschedule('bike-choice-reminders-hourly')
where exists (select 1 from cron.job where jobname = 'bike-choice-reminders-hourly');
select cron.schedule(
  'bike-choice-reminders-hourly',
  '35 * * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/bike-choice-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.unschedule('offer-reminder-cron-daily')
where exists (select 1 from cron.job where jobname = 'offer-reminder-cron-daily');
select cron.schedule(
  'offer-reminder-cron-daily',
  '40 8 * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/offer-reminder-cron',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.unschedule('v2-zero-quote-rescue-hourly')
where exists (select 1 from cron.job where jobname = 'v2-zero-quote-rescue-hourly');
select cron.schedule(
  'v2-zero-quote-rescue-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/v2-zero-quote-rescue',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.unschedule('v2-winner-reminders-hourly')
where exists (select 1 from cron.job where jobname = 'v2-winner-reminders-hourly');
select cron.schedule(
  'v2-winner-reminders-hourly',
  '10 * * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/v2-winner-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.unschedule('v2-stalled-winner-recovery-daily')
where exists (select 1 from cron.job where jobname = 'v2-stalled-winner-recovery-daily');
select cron.schedule(
  'v2-stalled-winner-recovery-daily',
  '20 6 * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/v2-stalled-winner-recovery',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
