-- Drop the existing RESTRICTIVE policy and create a PERMISSIVE one
DROP POLICY IF EXISTS "Anyone can submit intro call requests" ON intro_call_requests;

-- Create a PERMISSIVE policy for public inserts (using default PERMISSIVE)
CREATE POLICY "Anyone can submit intro call requests"
  ON intro_call_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);