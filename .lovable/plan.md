

# Email Notifications System (Phase 1 - Pragmatic Approach)

## Philosophy

Build the simplest notification system that solves real problems today. Skip the channels abstraction until users actually request it.

## Notification Events

| Event | Who Gets Notified | Priority |
|-------|-------------------|----------|
| Credits purchased | Provider team (admins) | High |
| Work logged | Org members | High |
| Subscription renewed | Provider team + Org admins | Medium |
| Credits expiring soon | Org admins | Medium (future) |

## Database Design

### New Table: `notification_preferences`

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Granular toggles (all default to true)
  notify_purchase BOOLEAN NOT NULL DEFAULT true,      -- Provider: when credits purchased
  notify_work_logged BOOLEAN NOT NULL DEFAULT true,   -- Org: when work is logged
  notify_subscription BOOLEAN NOT NULL DEFAULT true,  -- Both: subscription events
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can only see/edit their own preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Auto-create preferences for new users (via trigger on profiles)
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
```

## Edge Function: `send-notification`

A reusable edge function that handles all notification emails:

```text
POST /functions/v1/send-notification
{
  "type": "purchase_completed" | "work_logged" | "subscription_renewed",
  "recipientUserIds": ["uuid1", "uuid2"],
  "data": { ... event-specific data ... }
}
```

The function will:
1. Fetch notification preferences for all recipient user IDs
2. Filter out users with notifications disabled
3. Fetch email addresses from profiles
4. Send templated emails via Resend
5. Log delivery attempts (optional, for debugging)

## Integration Points

### 1. Stripe Webhook (Purchase Completed)

After creating credit lot and ledger entry, call `send-notification`:

```typescript
// In handleOneTimePaymentCheckout, after audit_events insert:
const providerAdmins = await getProviderAdmins(supabase, order.service_provider_id);
await sendNotification(supabase, resend, {
  type: "purchase_completed",
  recipientUserIds: providerAdmins.map(a => a.user_id),
  data: {
    organizationName: orgName,
    bundleName: order.credit_bundles.name,
    hours: order.credit_bundles.hours,
    amountFormatted: formatCurrency(order.amount_cents, order.currency),
  }
});
```

### 2. Work Log RPC (Work Logged)

Two options:
- **Option A**: Add notification call inside the RPC function (requires `pg_net` or a separate trigger)
- **Option B**: Create a webhook/edge function that fires after work is logged

Recommend **Option B** for simplicity - have the frontend call `send-notification` after successful work log:

```typescript
// In LogWorkDialog.tsx, after successful RPC call:
await supabase.functions.invoke("send-notification", {
  body: {
    type: "work_logged",
    organizationId: values.customerId,
    data: {
      providerName: "Skywalker Digital",
      category: values.category,
      description: values.description,
      minutesSpent: totalMinutes,
      performerName: "John Doe"
    }
  }
});
```

## Email Templates

### Purchase Completed (to Provider)

```
Subject: 💰 New credit purchase from {Organization Name}

{Organization Name} just purchased {Bundle Name} ({Hours} hours).

Amount: {AmountFormatted}

View in Dashboard: [Link to provider dashboard]
```

### Work Logged (to Organization)

```
Subject: ⏱️ {Provider Name} logged work on your account

{Performer Name} from {Provider Name} logged {Hours}h {Minutes}m of work.

Category: {Category}
Description: {Description}

View Details: [Link to org credits page]
```

## Frontend: Notification Settings Page

Add a new route `/dashboard/settings/notifications` with:

1. Master toggle: "Receive email notifications"
2. Individual toggles:
   - "Credit purchases" (for provider roles)
   - "Work logged" (for org roles)
   - "Subscription updates" (both)

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/XXXX_notification_preferences.sql` | Create table + RLS + trigger |
| `supabase/functions/send-notification/index.ts` | Notification dispatch function |
| `src/pages/dashboard/settings/NotificationSettings.tsx` | Preferences UI |
| `src/hooks/useNotificationPreferences.ts` | Fetch/update preferences |

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/stripe-webhook/index.ts` | Call send-notification after purchase |
| `src/components/provider/LogWorkDialog.tsx` | Call send-notification after work log |
| `src/App.tsx` | Add route for notification settings |
| `src/pages/dashboard/settings/ProfileSettings.tsx` | Link to notification settings |

## Implementation Order

1. **Database**: Create `notification_preferences` table with trigger
2. **Edge Function**: Build `send-notification` with email templates
3. **Webhook Integration**: Add notification calls to Stripe webhook
4. **Work Log Integration**: Add notification call to LogWorkDialog
5. **Settings UI**: Create notification preferences page
6. **Testing**: Verify end-to-end flow for both event types

## Future Considerations (Phase 2)

When/if needed, the system can be extended with:
- **Digest mode**: Batch notifications into daily/weekly summaries
- **In-app notifications**: Add a notifications table and bell icon with history
- **Channels abstraction**: Only if users specifically request Slack/Discord

The current `notification_preferences` table structure is intentionally simple but can be extended with additional columns for granular control or delivery channels.

