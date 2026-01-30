-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create intro call requests" ON public.intro_call_requests;

-- Create a new policy that allows anyone to submit (including unauthenticated users)
CREATE POLICY "Anyone can submit intro call requests"
ON public.intro_call_requests
FOR INSERT
WITH CHECK (true);

-- Also add a policy so provider members can view all requests regardless of user_id
-- (already exists, but let's ensure anonymous submissions are visible)