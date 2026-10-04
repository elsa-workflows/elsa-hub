-- Recreate weaver-ingest-nightly so x-cron-secret is read from Vault at
-- run time (not migration time), and pg_net waits for a full ingest.
-- Does not create, insert, or update any vault secret.
-- supabase_vault is already present on the hosted project; IF NOT EXISTS
-- is here because no prior repo migration enabled it.

create extension if not exists supabase_vault;

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
    timeout_milliseconds := 150000
  ) as request_id;
  $cron$
);
