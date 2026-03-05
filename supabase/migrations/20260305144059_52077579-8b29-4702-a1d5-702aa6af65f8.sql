
-- Phase 1: Contact email fields
ALTER TABLE organizations ADD COLUMN contact_email text;
ALTER TABLE service_providers ADD COLUMN contact_email text;

-- Fallback function: returns contact_email or owner's profile email
CREATE OR REPLACE FUNCTION get_org_contact_email(p_org_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    o.contact_email,
    (SELECT p.email FROM organization_members om
     JOIN profiles p ON p.user_id = om.user_id
     WHERE om.organization_id = p_org_id AND om.role = 'owner' LIMIT 1)
  ) FROM organizations o WHERE o.id = p_org_id;
$$;

CREATE OR REPLACE FUNCTION get_provider_contact_email(p_provider_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    sp.contact_email,
    (SELECT p.email FROM provider_members pm
     JOIN profiles p ON p.user_id = pm.user_id
     WHERE pm.service_provider_id = p_provider_id AND pm.role = 'owner' LIMIT 1)
  ) FROM service_providers sp WHERE sp.id = p_provider_id;
$$;

-- Phase 2: Messaging tables
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, service_provider_id)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "Org members can view conversations"
  ON conversations FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Provider members can view conversations"
  ON conversations FOR SELECT TO authenticated
  USING (is_provider_member(service_provider_id));

-- Security definer function to get or create a conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_org_id uuid, p_provider_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  -- Verify caller is member of either side
  IF NOT (is_org_member(p_org_id) OR is_provider_member(p_provider_id)) THEN
    RAISE EXCEPTION 'Access denied: must be a member of the organization or provider';
  END IF;
  
  SELECT id INTO _id FROM conversations
    WHERE organization_id = p_org_id AND service_provider_id = p_provider_id;
  IF _id IS NULL THEN
    INSERT INTO conversations (organization_id, service_provider_id)
    VALUES (p_org_id, p_provider_id) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;

-- Messages RLS
CREATE POLICY "Members can view messages"
  ON messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id
    AND (is_org_member(c.organization_id) OR is_provider_member(c.service_provider_id))
  ));

CREATE POLICY "Members can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id
      AND (is_org_member(c.organization_id) OR is_provider_member(c.service_provider_id))
    )
  );

CREATE POLICY "Recipients can mark read"
  ON messages FOR UPDATE TO authenticated
  USING (
    sender_user_id != auth.uid() AND EXISTS (
      SELECT 1 FROM conversations c WHERE c.id = conversation_id
      AND (is_org_member(c.organization_id) OR is_provider_member(c.service_provider_id))
    )
  );

-- Phase 3: Add notify_new_message preference
ALTER TABLE notification_preferences ADD COLUMN notify_new_message boolean NOT NULL DEFAULT true;

-- Add new_message to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_message';
