-- Grant INSERT permission to anon and authenticated roles for intro_call_requests
GRANT INSERT ON intro_call_requests TO anon;
GRANT INSERT ON intro_call_requests TO authenticated;

-- Also ensure SELECT is granted for the existing SELECT policies to work
GRANT SELECT ON intro_call_requests TO anon;
GRANT SELECT ON intro_call_requests TO authenticated;

-- Grant UPDATE for provider members (authenticated only)
GRANT UPDATE ON intro_call_requests TO authenticated;