DROP POLICY IF EXISTS "Roadmap snapshots are publicly readable" ON public.roadmap_snapshots;
CREATE POLICY "Latest roadmap snapshot is publicly readable" ON public.roadmap_snapshots
  FOR SELECT TO anon, authenticated
  USING (synced_at = (SELECT max(s.synced_at) FROM public.roadmap_snapshots s));

DROP POLICY IF EXISTS "Anyone can view provider logos" ON storage.objects;
CREATE POLICY "Provider admins can view their logo files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'provider-logos' AND (storage.foldername(name))[1] IN (
    SELECT sp.id::text FROM public.service_providers sp WHERE public.is_provider_admin(sp.id)));