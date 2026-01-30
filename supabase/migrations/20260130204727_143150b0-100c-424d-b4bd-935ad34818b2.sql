-- Drop the existing check constraint and recreate with "archived" included
ALTER TABLE public.intro_call_requests 
DROP CONSTRAINT IF EXISTS intro_call_requests_status_check;

ALTER TABLE public.intro_call_requests
ADD CONSTRAINT intro_call_requests_status_check 
CHECK (status IN ('pending', 'scheduled', 'completed', 'declined', 'archived'));