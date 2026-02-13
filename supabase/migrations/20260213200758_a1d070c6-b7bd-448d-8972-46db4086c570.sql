
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "public_insert_requests" ON public.intro_call_requests;

CREATE POLICY "public_insert_requests"
ON public.intro_call_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
