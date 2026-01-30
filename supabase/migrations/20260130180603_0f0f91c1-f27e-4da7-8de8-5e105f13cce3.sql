-- Create table for introductory call intake requests
CREATE TABLE public.intro_call_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contact info
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Qualification fields
  project_stage TEXT NOT NULL CHECK (project_stage IN ('exploring', 'poc', 'pre_production', 'production')),
  current_usage TEXT NOT NULL,
  discussion_topics TEXT NOT NULL,
  
  -- Optional interests (stored as array)
  interests TEXT[] DEFAULT '{}',
  
  -- Tracking
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'scheduled', 'completed', 'declined')),
  
  -- Notes for internal use
  internal_notes TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.intro_call_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own requests
CREATE POLICY "Users can create intro call requests"
ON public.intro_call_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own requests
CREATE POLICY "Users can view their own requests"
ON public.intro_call_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Allow provider members to view all requests
CREATE POLICY "Provider members can view all requests"
ON public.intro_call_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM provider_members
    WHERE provider_members.user_id = auth.uid()
  )
);

-- Allow provider members to update requests
CREATE POLICY "Provider members can update requests"
ON public.intro_call_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM provider_members
    WHERE provider_members.user_id = auth.uid()
  )
);

-- Create index for checking existing requests per org
CREATE INDEX idx_intro_call_requests_org ON public.intro_call_requests(organization_id);
CREATE INDEX idx_intro_call_requests_email ON public.intro_call_requests(email);