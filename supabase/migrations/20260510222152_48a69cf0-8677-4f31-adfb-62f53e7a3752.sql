-- Restrict the contact_email column on service_providers from anonymous users.
-- The RLS policy "Anyone can view providers" stays in place so the public catalog
-- still works, but column-level grants prevent anon from reading contact_email.

REVOKE SELECT ON public.service_providers FROM anon;

GRANT SELECT (
  id,
  name,
  slug,
  logo_url,
  availability_status,
  accepting_new_purchases,
  purchase_pause_message,
  estimated_lead_time_days,
  booking_url,
  total_available_minutes_per_month,
  capacity_threshold_percent,
  enforce_capacity_gating,
  enforce_consumption_caps,
  created_at,
  updated_at
) ON public.service_providers TO anon;

-- Authenticated users keep full SELECT (including contact_email) via existing grants/policies.
GRANT SELECT ON public.service_providers TO authenticated;