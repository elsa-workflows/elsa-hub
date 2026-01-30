-- Force refresh policies by toggling RLS
ALTER TABLE intro_call_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE intro_call_requests ENABLE ROW LEVEL SECURITY;

-- Re-add the policy with a clear name
DROP POLICY IF EXISTS "anon_insert_intro_call" ON intro_call_requests;

CREATE POLICY "public_insert_requests"
  ON intro_call_requests
  FOR INSERT
  WITH CHECK (true);