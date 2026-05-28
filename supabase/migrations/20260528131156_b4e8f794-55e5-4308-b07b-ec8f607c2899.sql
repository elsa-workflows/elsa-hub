ALTER TABLE public.radar_locations
  DROP CONSTRAINT IF EXISTS radar_locations_status_check;

ALTER TABLE public.radar_locations
  ADD CONSTRAINT radar_locations_status_check
  CHECK (status IN ('pending_verification', 'pending', 'approved', 'rejected'));

ALTER TABLE public.radar_locations
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_radar_locations_verification_token
  ON public.radar_locations(verification_token)
  WHERE verification_token IS NOT NULL;