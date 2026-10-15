-- Minimal stubs of existing Hub objects so academy migrations can apply on a
-- scratch Postgres that is not a full Supabase stack.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

GRANT anon TO CURRENT_USER;
GRANT authenticated TO CURRENT_USER;
GRANT service_role TO CURRENT_USER;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  sub text;
  claims text;
BEGIN
  sub := NULLIF(current_setting('request.jwt.claim.sub', true), '');
  IF sub IS NOT NULL THEN
    RETURN sub::uuid;
  END IF;
  claims := NULLIF(current_setting('request.jwt.claims', true), '');
  IF claims IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN (claims::jsonb ->> 'sub')::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN NULL;
  END;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, name)
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.buckets TO service_role;
GRANT SELECT ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.organization_members TO authenticated, service_role;
GRANT SELECT ON public.platform_admins TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
