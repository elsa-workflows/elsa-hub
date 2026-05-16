# Wire cron secret + nightly ingest

The `COPILOT_INGEST_CRON_SECRET` is now stored. This plan authenticates the nightly job via that secret and schedules it.

## 1. Update `supabase/functions/copilot-ingest/index.ts`

Add a second auth path **before** the existing user/admin check:

- Read `x-cron-secret` header.
- If present and equals `Deno.env.get("COPILOT_INGEST_CRON_SECRET")` (constant-time compare), skip the Authorization/admin checks and proceed as a system actor.
- Otherwise fall back to the current platform-admin flow.
- Add `x-cron-secret` to `Access-Control-Allow-Headers`.
- Log `{ actor: "cron" | "admin", upserted }` at the end for observability.

If the secret env var is missing at runtime, reject cron requests with 503 (don't silently accept).

## 2. Schedule nightly ingest (insert-only SQL, not a migration)

Per Lovable rules, cron setup contains project-specific URL + secrets, so run it via the Supabase insert tool — not `supabase--migration`. Steps:

1. `create extension if not exists pg_cron;`
2. `create extension if not exists pg_net;`
3. Unschedule any prior job named `copilot-ingest-nightly` (idempotent).
4. Schedule:

```sql
select cron.schedule(
  'copilot-ingest-nightly',
  '15 3 * * *',  -- 03:15 UTC nightly
  $$
  select net.http_post(
    url     := 'https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/copilot-ingest',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'apikey',         '<SUPABASE_ANON_KEY>',
      'x-cron-secret',  '<COPILOT_INGEST_CRON_SECRET literal>'
    ),
    body    := '{"trigger":"cron"}'::jsonb
  );
  $$
);
```

The cron secret value must be embedded as a literal in the schedule SQL (pg_cron has no access to Edge Function env vars). It's stored only inside the `cron.job` table, readable to superuser/service role only.

## 3. Verify

- Deploy the function.
- `curl -X POST .../copilot-ingest -H "x-cron-secret: <value>"` → expect 200.
- `curl -X POST .../copilot-ingest` (no auth) → expect 401.
- `select * from cron.job where jobname='copilot-ingest-nightly';` → row exists.
- After first run, `select * from cron.job_run_details order by start_time desc limit 3;` → status `succeeded`.

## Out of scope

- Multi-source ingest logic (Firecrawl docs crawl, GitHub markdown). Already covered by the larger plan — this change only wires the cron secret + schedule so when those sources land, the nightly run is already authenticated.
