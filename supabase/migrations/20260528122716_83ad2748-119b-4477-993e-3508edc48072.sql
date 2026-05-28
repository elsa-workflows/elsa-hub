
-- Add submission workflow to radar_locations
ALTER TABLE public.radar_locations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS submitted_contact_email text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing rows are pre-curated → approve them.
UPDATE public.radar_locations SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_radar_locations_status ON public.radar_locations(status);

-- Replace the permissive public-read policy with one that only exposes approved rows publicly.
DROP POLICY IF EXISTS "Anyone can view radar locations" ON public.radar_locations;

CREATE POLICY "Public can view approved radar locations"
  ON public.radar_locations
  FOR SELECT
  TO public
  USING (status = 'approved');

CREATE POLICY "Platform admins can view all radar locations"
  ON public.radar_locations
  FOR SELECT
  TO authenticated
  USING (is_platform_admin());

-- Add notification type for radar submissions
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'radar_submission';
