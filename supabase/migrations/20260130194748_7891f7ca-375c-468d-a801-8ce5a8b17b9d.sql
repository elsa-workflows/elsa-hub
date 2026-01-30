-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Anyone can submit intro call requests" ON intro_call_requests;

-- Recreate it with explicit public role (applies to all)
CREATE POLICY "Anyone can submit intro call requests"
  ON intro_call_requests
  FOR INSERT
  TO public
  WITH CHECK (true);