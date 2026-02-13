
-- Add a comment to force PostgREST schema cache reload
COMMENT ON TABLE public.intro_call_requests IS 'Intro call intake form submissions';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
