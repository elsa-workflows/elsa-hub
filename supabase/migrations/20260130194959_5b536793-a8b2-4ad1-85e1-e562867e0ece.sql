-- Drop and recreate the INSERT policy without role specification (defaults to all roles)
DROP POLICY IF EXISTS "Anyone can submit intro call requests" ON intro_call_requests;

CREATE POLICY "anon_insert_intro_call" 
  ON intro_call_requests 
  FOR INSERT 
  WITH CHECK (true);

-- Also ensure grants are explicitly there
GRANT INSERT, SELECT ON intro_call_requests TO anon;
GRANT INSERT, SELECT, UPDATE ON intro_call_requests TO authenticated;