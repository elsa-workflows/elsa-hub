-- Extra stubs on top of the academy scratch prelude for the Stripe customer
-- ref tables. Real GoTrue keeps auth.users.email unique among non-SSO users
-- through a partial unique index; model it so fixtures that reuse an email
-- fail here the way they would on a Supabase database.

ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS is_sso_user boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_partial_key
  ON auth.users (email)
  WHERE is_sso_user = false;
