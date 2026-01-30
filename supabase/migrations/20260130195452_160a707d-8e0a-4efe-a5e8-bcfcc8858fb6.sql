-- Re-enable RLS and keep the permissive INSERT policy
ALTER TABLE intro_call_requests ENABLE ROW LEVEL SECURITY;

-- The existing policies should work now - verified the INSERT policy exists