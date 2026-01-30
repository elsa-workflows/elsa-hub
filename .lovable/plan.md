
# Polymorphic Notification Platform - Design Plan

## Overview

Create a unified, extensible notification system that:
- Stores all notifications in a single polymorphic table
- Triggers emails for each notification type based on user preferences
- Provides a unified in-app notification center (replacing invitation-only bell)
- Supports multiple notification categories with type-safe payloads

---

## Architecture Design

```text
+-------------------+     +---------------------+     +------------------+
|  Event Sources    |     |  notifications      |     |  Delivery        |
|-------------------|     |---------------------|     |------------------|
| - Invitations     | --> | - id                | --> | - In-app (UI)    |
| - Work Logged     |     | - user_id           |     | - Email (Resend) |
| - Purchases       |     | - type              |     +------------------+
| - Subscriptions   |     | - payload (JSONB)   |
| - Intake Requests |     | - read_at           |
+-------------------+     | - created_at        |
                          +---------------------+
```

---

## Database Schema

### 1. New `notifications` Table

This table stores ALL in-app notifications with a polymorphic `type` field and JSONB payload:

```sql
CREATE TYPE notification_type AS ENUM (
  'org_invitation',           -- Invited to join an organization
  'provider_invitation',      -- Invited to join a provider (future)
  'work_logged',              -- Work logged on your org's account
  'purchase_completed',       -- Customer purchased credits (for providers)
  'subscription_renewed',     -- Subscription renewed
  'intro_call_submitted'      -- Someone submitted an intro call request (for providers)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',           -- Type-specific structured data
  action_url TEXT,                       -- Optional deep link
  read_at TIMESTAMPTZ,                   -- NULL = unread
  dismissed_at TIMESTAMPTZ,              -- For "ignore" actions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_type 
  ON notifications(user_id, type);

-- RLS: Users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2. Update `notification_preferences` Table

Add new preference columns for the new notification types:

```sql
ALTER TABLE notification_preferences
  ADD COLUMN notify_org_invitation BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN notify_intro_call BOOLEAN NOT NULL DEFAULT true;
```

---

## Notification Type Payloads

Each notification type has a well-defined payload structure:

| Type | Payload Fields |
|------|----------------|
| `org_invitation` | `invitation_id`, `organization_id`, `organization_name`, `role`, `expires_at` |
| `work_logged` | `work_log_id`, `provider_name`, `minutes`, `category`, `description` |
| `purchase_completed` | `order_id`, `organization_name`, `bundle_name`, `hours`, `amount_formatted` |
| `subscription_renewed` | `subscription_id`, `organization_name`, `monthly_hours` |
| `intro_call_submitted` | `request_id`, `company_name`, `full_name`, `email`, `project_stage` |

---

## Edge Function: `create-notification`

A new centralized edge function that:
1. Creates the notification record in the database
2. Checks user email preferences
3. Sends email via Resend if enabled
4. Returns the created notification ID

```typescript
// POST /functions/v1/create-notification
interface CreateNotificationRequest {
  recipientUserIds: string[];  // Who to notify
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  actionUrl?: string;
}

// Flow:
// 1. For each recipient:
//    a. INSERT into notifications table
//    b. Check notification_preferences for email opt-in
//    c. If email enabled, generate template and send via Resend
// 2. Return { created: number, emails_sent: number }
```

---

## Migration: Invitations to Notifications

The existing invitation flow will be updated to:

1. **On invitation creation** (`send-invitation`): Also create a notification:
   ```typescript
   // After creating invitation, also create notification
   await createNotification({
     recipientUserIds: [inviteeUserId], // Lookup by email
     type: 'org_invitation',
     title: `Invitation to ${orgName}`,
     message: `You've been invited to join ${orgName} as ${role}`,
     payload: { invitation_id, organization_id, organization_name, role, expires_at },
     actionUrl: `/invite/${token}`
   });
   ```

2. **On accept/ignore**: Mark notification as dismissed

3. **NotificationBell**: Query `notifications` table instead of `invitations` directly

---

## Integration Points

### 1. Invitations (Modified)
- **Trigger**: `send-invitation` edge function
- **Recipients**: The invited user (lookup by email)
- **Action**: Accept/Ignore buttons in notification card

### 2. Work Logged (Modified)
- **Trigger**: After `create_work_log_and_allocate` RPC
- **Recipients**: All org members
- **Action**: "View Details" link to credits page

### 3. Purchase Completed (Modified)
- **Trigger**: `stripe-webhook` after payment success
- **Recipients**: Provider admins
- **Action**: "View in Dashboard" link

### 4. Intro Call Submitted (NEW)
- **Trigger**: After successful intake form submission
- **Recipients**: Provider admins of Skywalker Digital
- **Action**: "Review Request" link to admin view

### 5. Subscription Renewed (Modified)
- **Trigger**: `stripe-webhook` on subscription renewal
- **Recipients**: Provider admins
- **Action**: "View in Dashboard" link

---

## UI Components

### 1. Enhanced NotificationBell
Replace the invitation-only bell with a polymorphic notification center:

```tsx
// Fetch from notifications table instead of invitations
const { data: notifications } = useQuery({
  queryKey: ['notifications', user?.id],
  queryFn: () => supabase
    .from('notifications')
    .select('*')
    .is('read_at', null)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
});

// Render different card types based on notification.type
```

### 2. Polymorphic NotificationCard
A single component that renders differently based on type:

```tsx
function NotificationCard({ notification }) {
  switch (notification.type) {
    case 'org_invitation':
      return <InvitationNotificationCard {...notification} />;
    case 'work_logged':
      return <WorkLoggedNotificationCard {...notification} />;
    case 'intro_call_submitted':
      return <IntroCallNotificationCard {...notification} />;
    // ... etc
  }
}
```

### 3. Mark as Read / Dismiss Actions
- Clicking a notification marks it as `read_at = now()`
- Explicit "Ignore" or "Dismiss" sets `dismissed_at = now()`
- Accept actions (for invitations) also dismiss the notification

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx.sql` | Create | New `notifications` table + preferences columns |
| `supabase/functions/create-notification/index.ts` | Create | Centralized notification creator with email dispatch |
| `supabase/functions/send-invitation/index.ts` | Modify | Also create notification after invitation |
| `supabase/functions/stripe-webhook/index.ts` | Modify | Use `create-notification` for purchases/renewals |
| `src/components/provider/LogWorkDialog.tsx` | Modify | Use `create-notification` for work logged |
| `src/components/enterprise/IntroCallIntakeDialog.tsx` | Modify | Trigger notification after submission |
| `src/hooks/useNotifications.ts` | Create | Hook to fetch/manage notifications |
| `src/components/notifications/NotificationBell.tsx` | Rewrite | Query notifications table, render polymorphic cards |
| `src/components/notifications/NotificationCard.tsx` | Create | Polymorphic card renderer |
| `src/components/notifications/cards/*.tsx` | Create | Type-specific card components |
| `src/pages/dashboard/settings/NotificationSettings.tsx` | Modify | Add toggles for new types |

---

## Benefits of This Design

1. **Single Source of Truth**: All notifications in one table, queryable and auditable
2. **Extensible**: Adding new notification types only requires adding to the enum and creating a card component
3. **User Preferences**: Granular control over which emails users receive
4. **Consistent UX**: Unified notification center instead of scattered queries
5. **Persistence**: Notifications persist until dismissed, unlike the current polling approach
6. **History**: Users can see past notifications (optional feature)

---

## Implementation Order

1. Create database migration (table + enum + preferences columns)
2. Create `create-notification` edge function
3. Update `send-invitation` to also create notification
4. Create `useNotifications` hook
5. Rewrite `NotificationBell` to use new hook
6. Create polymorphic card components
7. Add intro call submission notification trigger
8. Update stripe-webhook to use new system
9. Update LogWorkDialog to use new system
10. Update NotificationSettings with new toggles

---

## Technical Considerations

- **Email lookup for invitees**: When creating org_invitation notifications, we need to look up the user by email (they might not exist yet - handle gracefully)
- **Backward compatibility**: Keep the invitation flow working during migration
- **Real-time**: Consider adding Supabase Realtime subscription for instant notification updates (optional enhancement)
- **Rate limiting**: Prevent notification spam with deduplication logic
