-- Remove the token from the public table
ALTER TABLE public.service_providers DROP COLUMN IF EXISTS tidycal_api_token;

-- Create a secure integrations table for sensitive provider config
CREATE TABLE public.provider_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  tidycal_api_token TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_provider_id)
);

ALTER TABLE public.provider_integrations ENABLE ROW LEVEL SECURITY;

-- Only provider admins can view/manage integrations
CREATE POLICY "Provider admins can view integrations"
  ON public.provider_integrations FOR SELECT
  TO authenticated
  USING (is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can insert integrations"
  ON public.provider_integrations FOR INSERT
  TO authenticated
  WITH CHECK (is_provider_admin(service_provider_id));

CREATE POLICY "Provider admins can update integrations"
  ON public.provider_integrations FOR UPDATE
  TO authenticated
  USING (is_provider_admin(service_provider_id))
  WITH CHECK (is_provider_admin(service_provider_id));

-- Service role needs access for edge functions
CREATE POLICY "Service role full access"
  ON public.provider_integrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_provider_integrations_updated_at
  BEFORE UPDATE ON public.provider_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();