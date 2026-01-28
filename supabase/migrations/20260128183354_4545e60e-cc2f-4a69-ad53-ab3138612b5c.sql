-- Drop the existing policy that restricts to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can view active bundles" ON public.credit_bundles;

-- Create a new policy that allows ANYONE (including anonymous/public) to view active bundles
CREATE POLICY "Anyone can view active bundles" 
ON public.credit_bundles 
FOR SELECT 
USING (is_active = true);