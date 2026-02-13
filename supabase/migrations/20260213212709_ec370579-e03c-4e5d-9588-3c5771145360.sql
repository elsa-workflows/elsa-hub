-- Grant necessary permissions on intro_call_requests
GRANT SELECT, INSERT ON public.intro_call_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.intro_call_requests TO authenticated;