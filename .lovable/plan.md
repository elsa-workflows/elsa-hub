

# Plan: Contact Emails, Messaging, and Message Notifications

## Summary

Three phases: (1) add `contact_email` to orgs and providers with UI editing, (2) build a threaded messaging system between org-provider pairs, (3) send email notifications on new messages via the existing `create-notification` edge function.

---

## Phase 1: Contact Email Fields

### Database Migration

```sql
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
```

### UI Changes

- **`OrgSettings.tsx`**: Add editable "Contact Email" input in Organization Details card (admin-only)
- **`ProviderSettings.tsx`**: Add editable "Contact Email" input in Provider Details card (admin-only)
- **`ProviderCustomers.tsx`**: Add "Contact" column to customers table showing `get_org_contact_email` result
- **`OrgOverview.tsx`** or **`OrgCredits.tsx`**: Show provider contact email where provider info appears

---

## Phase 2: Messaging

### Database Migration

```sql
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
  sender_user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS: conversations visible to org members or provider members
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
  SELECT id INTO _id FROM conversations
    WHERE organization_id = p_org_id AND service_provider_id = p_provider_id;
  IF _id IS NULL THEN
    INSERT INTO conversations (organization_id, service_provider_id)
    VALUES (p_org_id, p_provider_id) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;

-- Messages RLS via conversation membership
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
```

### New Files

- **`src/hooks/useConversations.ts`** — fetch conversations for current org/provider with last message preview and unread count
- **`src/hooks/useMessages.ts`** — fetch messages for a conversation, send message mutation, mark-as-read mutation
- **`src/components/messaging/ConversationList.tsx`** — list of conversations with other party name, last message, unread badge
- **`src/components/messaging/ConversationThread.tsx`** — message thread with auto-scroll, sender names, timestamps
- **`src/components/messaging/MessageInput.tsx`** — text input with send button
- **`src/pages/dashboard/org/OrgMessages.tsx`** — org messages page (list + thread)
- **`src/pages/dashboard/provider/ProviderMessages.tsx`** — provider messages page (list + thread)

### Routing (App.tsx)

```
org/:slug/messages          → OrgMessages
org/:slug/messages/:id      → OrgMessages (with selected conversation)
provider/:slug/messages     → ProviderMessages
provider/:slug/messages/:id → ProviderMessages (with selected conversation)
```

### Sidebar (DashboardSidebar.tsx)

Add `{ label: "Messages", icon: MessageSquare, path: "messages" }` to both `orgNavItems` and `providerNavItems`.

---

## Phase 3: Email Notification on New Message

### Approach

When a message is sent, trigger the existing `create-notification` edge function to notify the other party. This reuses the notification platform (in-app bell + email delivery via Resend with preference checks).

### Implementation

1. **Add `"new_message"` to notification types** — update `NotificationType` in both `src/types/notifications.ts` and `create-notification/index.ts`
2. **Add `notify_new_message` boolean column** to `notification_preferences` table (default `true`)
3. **Update `create-notification`** to handle `new_message` type with preference column mapping
4. **Call `create-notification` from `useMessages.ts`** after a successful message insert — invoke via `supabase.functions.invoke` with the recipient user IDs (all members of the other party's side)
5. **Update `NotificationCard.tsx`** to render `new_message` notifications with an action URL pointing to the conversation

### Notification Content

- **Title**: "New message from [Org Name / Provider Name]"
- **Message**: First 100 chars of the message body
- **Action URL**: `/dashboard/org/:slug/messages/:conversationId` or `/dashboard/provider/:slug/messages/:conversationId`

### Edge Function Flow

Since `create-notification` requires service role auth, create a thin wrapper edge function `send-message-notification` that:
1. Validates the caller via `auth.getUser()`
2. Verifies the caller is a member of the conversation
3. Calls `create-notification` internally with service role key

---

## Files Summary

| Action | File |
|--------|------|
| Migrate | 2 SQL migrations (contact_email + messaging tables) |
| Create | `src/hooks/useConversations.ts` |
| Create | `src/hooks/useMessages.ts` |
| Create | `src/components/messaging/ConversationList.tsx` |
| Create | `src/components/messaging/ConversationThread.tsx` |
| Create | `src/components/messaging/MessageInput.tsx` |
| Create | `src/components/messaging/index.ts` |
| Create | `src/pages/dashboard/org/OrgMessages.tsx` |
| Create | `src/pages/dashboard/provider/ProviderMessages.tsx` |
| Create | `supabase/functions/send-message-notification/index.ts` |
| Modify | `src/App.tsx` — add message routes |
| Modify | `src/components/dashboard/DashboardSidebar.tsx` — add Messages nav |
| Modify | `src/pages/dashboard/org/OrgSettings.tsx` — contact email field |
| Modify | `src/pages/dashboard/provider/ProviderSettings.tsx` — contact email field |
| Modify | `src/pages/dashboard/provider/ProviderCustomers.tsx` — show contact email |
| Modify | `src/types/notifications.ts` — add `new_message` type |
| Modify | `supabase/functions/create-notification/index.ts` — handle `new_message` |
| Modify | `src/components/notifications/NotificationCard.tsx` — render message notifications |

