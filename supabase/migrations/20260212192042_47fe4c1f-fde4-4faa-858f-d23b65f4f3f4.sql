-- Add a permissive SELECT policy so anyone (including anon) can view service providers
CREATE POLICY "Anyone can view providers"
  ON public.service_providers
  FOR SELECT
  USING (true);
