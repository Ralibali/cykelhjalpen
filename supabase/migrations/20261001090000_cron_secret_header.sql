-- ============================================
-- Cron-anrop till Edge Functions skickar en delad hemlighet.
--
-- Funktionerna nedan körs med verify_jwt = false och kunde därför anropas av
-- vem som helst. De kontrollerar nu `x-cron-secret` mot Edge Function-secreten
-- CRON_SECRET (se supabase/functions/_shared/cron-auth.ts).
--
-- Aktivering (två steg, i valfri ordning):
--   1. select vault.create_secret('<slumpad sträng>', 'edge_cron_secret');
--   2. supabase secrets set CRON_SECRET=<samma sträng>
-- Innan båda är gjorda beter sig allt som tidigare: utan Vault-hemlighet
-- skickas ingen header, och utan CRON_SECRET släpper funktionerna igenom
-- anropet (med en varning i loggen).
--
-- Rollback: kör om cron.schedule-anropen i 20260831_v2_lifecycle_crons.sql
-- (headers utan x-cron-secret) och
--   DROP FUNCTION IF EXISTS public.edge_cron_headers();
-- ============================================

create or replace function public.edge_cron_headers()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  begin
    select decrypted_secret into secret
      from vault.decrypted_secrets
     where name = 'edge_cron_secret'
     limit 1;
  exception when others then
    secret := null;
  end;

  if secret is null or secret = '' then
    return jsonb_build_object('Content-Type', 'application/json');
  end if;

  return jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret);
end;
$$;

revoke all on function public.edge_cron_headers() from public;
revoke all on function public.edge_cron_headers() from anon;
revoke all on function public.edge_cron_headers() from authenticated;

-- Schemaläggningen är oförändrad (se 20260831_v2_lifecycle_crons.sql); bara
-- headers byts ut.

select cron.unschedule('close-stale-bike-requests-hourly')
where exists (select 1 from cron.job where jobname = 'close-stale-bike-requests-hourly');
select cron.schedule(
  'close-stale-bike-requests-hourly',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://xmwsumzujqdttphhzxyq.supabase.co/functions/v1/close-stale-bike-requests',
    headers := public.edge_cron_headers(),
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
    headers := public.edge_cron_headers(),
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
    headers := public.edge_cron_headers(),
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
    headers := public.edge_cron_headers(),
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
    headers := public.edge_cron_headers(),
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
    headers := public.edge_cron_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
