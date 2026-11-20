-- Blog counters: reads only via aggregate RPCs
DROP POLICY IF EXISTS "Anyone can read blog likes" ON public.blog_post_likes;
DROP POLICY IF EXISTS "Anyone can read blog views" ON public.blog_post_views;

-- Copilot documents: read only by backend functions / definer RPCs
DROP POLICY IF EXISTS "Anyone can read copilot documents" ON public.weaver_documents;

-- Organizations insert must come from a signed-in user
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Service providers: keep public catalog, hide contact_email column
DROP POLICY IF EXISTS "Authenticated users can view providers" ON public.service_providers;
REVOKE SELECT ON public.service_providers FROM anon, authenticated;
GRANT SELECT (id, name, slug, logo_url, created_at, updated_at, accepting_new_purchases,
  purchase_pause_message, availability_status, estimated_lead_time_days, enforce_consumption_caps,
  total_available_minutes_per_month, capacity_threshold_percent, enforce_capacity_gating, booking_url)
  ON public.service_providers TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_provider_own_contact_email(p_provider_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.contact_email FROM public.service_providers sp
  WHERE sp.id = p_provider_id AND public.is_provider_member(p_provider_id);
$$;
REVOKE ALL ON FUNCTION public.get_provider_own_contact_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_provider_own_contact_email(uuid) TO authenticated;

-- Avatars: each user reads only their own folder
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
CREATE POLICY "Users can view own avatar" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);