-- Recreate send-renewal-notices-daily so x-cron-secret is read from Vault at
-- run time (not migration time), and give pg_net an explicit timeout.
-- Also re-schedule weaver-ingest-nightly with timeout_milliseconds 160000
-- so pg_net can record a 150 s gateway 504 instead of timing out first.
-- Does not create, insert, or update any vault secret.
-- Does not touch any other cron job.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-renewal-notices-daily') then
    perform cron.unschedule('send-renewal-notices-daily');
  end if;
end $$;

select cron.schedule(
  'send-renewal-notices-daily',
  '0 7 * * *',
  $cron$
  select net.http_post(
    url := 'https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/send-renewal-notices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'send_renewal_notices_cron_secret')
    ),
    body := jsonb_build_object('time', now()),
    timeout_milliseconds := 60000
  ) as request_id;
  $cron$
);

do $$
begin
  if exists (select 1 from cron.job where jobname = 'weaver-ingest-nightly') then
    perform cron.unschedule('weaver-ingest-nightly');
  end if;
end $$;

select cron.schedule(
  'weaver-ingest-nightly',
  '15 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/weaver-ingest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'weaver_ingest_cron_secret')
    ),
    body := jsonb_build_object('trigger', 'cron', 'time', now()),
    timeout_milliseconds := 160000
  ) as request_id;
  $cron$
);
