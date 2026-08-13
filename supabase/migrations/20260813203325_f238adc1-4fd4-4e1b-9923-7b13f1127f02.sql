ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'runtime_enquiry';

CREATE TABLE public.runtime_enquiries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  organization_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  tier text NOT NULL DEFAULT 'unsure',
  message text NOT NULL,
  source_page text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT runtime_enquiries_tier_check CHECK (tier IN ('runtime','runtime_priority','maintainer_access','unsure')),
  CONSTRAINT runtime_enquiries_status_check CHECK (status IN ('new','contacted','closed')),
  CONSTRAINT runtime_enquiries_message_check CHECK (char_length(message) BETWEEN 1 AND 5000),
  CONSTRAINT runtime_enquiries_email_check CHECK (char_length(contact_email) BETWEEN 3 AND 320)
);

CREATE INDEX idx_runtime_enquiries_provider_created ON public.runtime_enquiries (service_provider_id, created_at DESC);

GRANT INSERT ON public.runtime_enquiries TO anon;
GRANT INSERT, SELECT, UPDATE ON public.runtime_enquiries TO authenticated;
GRANT ALL ON public.runtime_enquiries TO service_role;

ALTER TABLE public.runtime_enquiries ENABLE ROW LEVEL SECURITY;

-- Public submission: anyone may create an enquiry, but may not claim another user's identity.
CREATE POLICY "Anyone can submit a runtime enquiry"
ON public.runtime_enquiries FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Reading is restricted: leads contain names and email addresses.
CREATE POLICY "Provider members can view enquiries"
ON public.runtime_enquiries FOR SELECT
TO authenticated
USING (public.is_provider_member(service_provider_id));

CREATE POLICY "Platform admins can view enquiries"
ON public.runtime_enquiries FOR SELECT
TO authenticated
USING (public.is_platform_admin());

CREATE POLICY "Provider admins can update enquiries"
ON public.runtime_enquiries FOR UPDATE
TO authenticated
USING (public.is_provider_admin(service_provider_id))
WITH CHECK (public.is_provider_admin(service_provider_id));

CREATE TRIGGER trg_runtime_enquiries_updated_at
BEFORE UPDATE ON public.runtime_enquiries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();