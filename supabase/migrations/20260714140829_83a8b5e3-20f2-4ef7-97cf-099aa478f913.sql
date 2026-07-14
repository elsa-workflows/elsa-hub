
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_work_digest boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.work_digest_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  service_provider_id uuid NOT NULL,
  user_id uuid NOT NULL,
  digest_date date NOT NULL,
  work_log_count integer NOT NULL DEFAULT 0,
  total_minutes integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_digest_sends_unique_idx
  ON public.work_digest_sends (organization_id, service_provider_id, digest_date, user_id);

CREATE INDEX IF NOT EXISTS work_digest_sends_date_idx
  ON public.work_digest_sends (digest_date);

GRANT ALL ON public.work_digest_sends TO service_role;

ALTER TABLE public.work_digest_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.work_digest_sends
  FOR ALL
  USING (false)
  WITH CHECK (false);
