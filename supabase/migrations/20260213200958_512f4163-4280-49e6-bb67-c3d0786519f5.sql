-- Grant INSERT permission on intro_call_requests to anon and authenticated roles
GRANT INSERT ON public.intro_call_requests TO anon, authenticated;

-- Also grant SELECT for the existing read policies to work
GRANT SELECT ON public.intro_call_requests TO anon, authenticated;

-- Grant UPDATE for provider members policy
GRANT UPDATE ON public.intro_call_requests TO authenticated;
