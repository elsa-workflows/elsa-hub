-- Private kit bucket. Reads require has_academy_access for the asset's course.
-- Uploads stay on service_role; there is no authenticated write policy.

INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-kits', 'academy-kits', false)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = false;

CREATE POLICY academy_kits_select_entitled
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'academy-kits'
    AND EXISTS (
      SELECT 1
      FROM public.academy_assets AS asset
      WHERE asset.storage_path = name
        AND public.has_academy_access(asset.course_id)
    )
  );
