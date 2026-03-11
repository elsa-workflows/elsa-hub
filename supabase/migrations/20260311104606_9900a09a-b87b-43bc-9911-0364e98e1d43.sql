
-- Create storage bucket for provider logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-logos', 'provider-logos', true);

-- Allow anyone to view provider logos (public bucket)
CREATE POLICY "Anyone can view provider logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'provider-logos');

-- Allow provider admins to upload logos
CREATE POLICY "Provider admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE is_provider_admin(id)
  )
);

-- Allow provider admins to update logos
CREATE POLICY "Provider admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE is_provider_admin(id)
  )
);

-- Allow provider admins to delete logos
CREATE POLICY "Provider admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM service_providers WHERE is_provider_admin(id)
  )
);
