CREATE TABLE public.copilot_rate_events (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX copilot_rate_events_key_created_at_idx
  ON public.copilot_rate_events (key, created_at DESC);

ALTER TABLE public.copilot_rate_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) can read/write.