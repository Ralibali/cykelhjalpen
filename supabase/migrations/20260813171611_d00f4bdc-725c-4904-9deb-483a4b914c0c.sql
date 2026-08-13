create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

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