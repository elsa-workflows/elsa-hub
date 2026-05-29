-- Roadmap snapshots cache (latest fetch from GitHub issue #3232)
CREATE TABLE public.roadmap_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  issue_updated_at TIMESTAMPTZ,
  raw_markdown TEXT NOT NULL,
  parsed_json JSONB,
  parse_status TEXT NOT NULL DEFAULT 'raw', -- 'structured' | 'raw'
  parse_error TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roadmap_snapshots_synced_at ON public.roadmap_snapshots(synced_at DESC);

-- Public read (roadmap page is public)
GRANT SELECT ON public.roadmap_snapshots TO anon;
GRANT SELECT ON public.roadmap_snapshots TO authenticated;
GRANT ALL ON public.roadmap_snapshots TO service_role;

ALTER TABLE public.roadmap_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roadmap snapshots are publicly readable"
ON public.roadmap_snapshots FOR SELECT
USING (true);

-- Schedule weekly sync (Mondays at 06:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'sync-roadmap-weekly',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tehhrjepyfnhmsgtwzkf.supabase.co/functions/v1/sync-roadmap',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaGhyamVweWZuaG1zZ3R3emtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQ5NzUsImV4cCI6MjA4NDk0MDk3NX0.LiAZ64iHHTraulE7dcb9ZwKgtvhVVhAyv3znFkly4JQ"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);