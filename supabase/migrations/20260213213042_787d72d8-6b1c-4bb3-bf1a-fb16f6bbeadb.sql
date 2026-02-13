-- Force PostgREST cache invalidation by altering the table
ALTER TABLE public.intro_call_requests ADD COLUMN _cache_bust boolean;
ALTER TABLE public.intro_call_requests DROP COLUMN _cache_bust;

-- Re-grant to be safe
GRANT SELECT, INSERT ON public.intro_call_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.intro_call_requests TO authenticated;

NOTIFY pgrst, 'reload schema';