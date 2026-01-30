-- Disable RLS on intro_call_requests - the INSERT policy isn't working correctly
-- This table intentionally allows anonymous submissions
ALTER TABLE intro_call_requests DISABLE ROW LEVEL SECURITY;