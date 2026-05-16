do $$
begin
  if exists (select 1 from cron.job where jobname = 'copilot-ingest-nightly') then
    perform cron.unschedule('copilot-ingest-nightly');
  end if;
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
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaGhyamVweWZuaG1zZ3R3emtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQ5NzUsImV4cCI6MjA4NDk0MDk3NX0.LiAZ64iHHTraulE7dcb9ZwKgtvhVVhAyv3znFkly4JQ',
      'x-cron-secret', 'db194f61-090e-43b6-9674-ffa663b39233'
    ),
    body := jsonb_build_object('trigger', 'cron', 'time', now())
  ) as request_id;
  $cron$
);