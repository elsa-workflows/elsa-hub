-- Rows that exist before the migration runs, to check the
-- status_changed_at backfill. Fixed UUIDs, example.com addresses only.

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'inv-admin@example.com'),
  ('00000000-0000-4000-8000-0000000000a2', 'inv-member@example.com'),
  ('00000000-0000-4000-8000-0000000000a3', 'inv-member-two@example.com'),
  ('00000000-0000-4000-8000-0000000000a4', 'inv-owner@example.com');

INSERT INTO public.organizations (id, name, slug) VALUES
  ('00000000-0000-4000-8000-00000000a001', 'Invite Org', 'invite-org');

INSERT INTO public.organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000a1', 'admin'),
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000a2', 'member'),
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000a3', 'member'),
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000a4', 'owner');

-- b1: cancelled long ago (created 40 days ago). Backfill uses created_at,
--     so the purge deletes it.
-- b2: cancelled recently (created 10 days ago). Backfill keeps it.
-- b3: pending, not yet expired. Backfill leaves status_changed_at NULL.
INSERT INTO public.invitations (id, organization_id, email, invited_by, expires_at, status, created_at) VALUES
  ('00000000-0000-4000-8000-0000000b0001', '00000000-0000-4000-8000-00000000a001', 'b1@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '33 days', 'cancelled', now() - interval '40 days'),
  ('00000000-0000-4000-8000-0000000b0002', '00000000-0000-4000-8000-00000000a001', 'b2@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() - interval '3 days', 'cancelled', now() - interval '10 days'),
  ('00000000-0000-4000-8000-0000000b0003', '00000000-0000-4000-8000-00000000a001', 'b3@example.com',
   '00000000-0000-4000-8000-0000000000a1', now() + interval '5 days', 'pending', now() - interval '2 days');
