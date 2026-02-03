
# Switch Newsletter System from Resend to MailerLite

## Overview
Replace Resend with MailerLite for all newsletter subscription management. This includes updating the subscribe-newsletter edge function, creating a sync function to migrate existing Resend subscribers (if any), and updating broadcast functionality to use MailerLite campaigns.

---

## Current State

| Aspect | Current Implementation |
|--------|----------------------|
| Newsletter Provider | Resend (Audiences API) |
| Subscription Function | `subscribe-newsletter` edge function |
| Broadcast Function | `send-broadcast` edge function |
| Local Storage | None - subscribers stored only in Resend |
| Existing Users | 6 profiles, all with `newsletter_enabled: false` |

---

## MailerLite API Details

MailerLite uses a straightforward REST API:

```text
Base URL: https://connect.mailerlite.com/api
Authentication: Bearer token in Authorization header
```

### Add Subscriber Endpoint
```text
POST /subscribers
{
  "email": "subscriber@example.com",
  "fields": {
    "name": "John",
    "last_name": "Doe"
  },
  "groups": ["group_id"],
  "status": "active"
}
```

---

## Implementation Plan

### Step 1: Add MailerLite API Key Secret

A new secret `MAILERLITE_API_KEY` will be added to Supabase secrets via the secrets tool.

---

### Step 2: Update subscribe-newsletter Edge Function

**Changes:**
- Replace Resend API calls with MailerLite API
- Use the MailerLite subscribers endpoint
- Handle duplicate subscribers (MailerLite returns existing subscriber if email exists)

**New Logic:**
```text
POST https://connect.mailerlite.com/api/subscribers
Headers:
  Authorization: Bearer {MAILERLITE_API_KEY}
  Content-Type: application/json
Body:
  {
    "email": "...",
    "fields": { "name": "..." },
    "status": "active"
  }
```

---

### Step 3: Update send-broadcast Edge Function

**Option A - Use MailerLite Campaigns API:**
MailerLite campaigns require creating a campaign, then scheduling/sending it.

**Option B - Keep simple for now:**
Since broadcasts are admin-triggered, we can update this later. For now, focus on subscription flow.

I'll update the broadcast function to use MailerLite's campaign API which follows this pattern:
1. Create campaign
2. Set content
3. Send campaign

---

### Step 4: Create Sync Function (One-time Migration)

Create a new edge function `sync-mailerlite-subscribers` that:
1. Fetches all contacts from the current Resend audience
2. Upserts them into MailerLite
3. Can be run once to migrate existing subscribers

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/subscribe-newsletter/index.ts` | Update | Replace Resend with MailerLite API |
| `supabase/functions/send-broadcast/index.ts` | Update | Replace Resend with MailerLite Campaigns API |
| `supabase/functions/sync-mailerlite-subscribers/index.ts` | Create | One-time migration from Resend to MailerLite |
| `supabase/functions/sync-mailerlite-subscribers/deno.json` | Create | Deno config for sync function |
| `supabase/config.toml` | Update | Add config for new sync function |

---

## Secret Requirements

| Secret Name | Purpose |
|-------------|---------|
| `MAILERLITE_API_KEY` | MailerLite API authentication |

I'll prompt you to add this secret before implementation.

---

## Group Configuration

MailerLite organizes subscribers into groups. You have two options:

1. **Use default "All subscribers"**: Subscribers added without a group go to the main list
2. **Create a specific group**: Create a "Newsletter" group in MailerLite and use its ID

For simplicity, I'll initially add subscribers without a specific group (they go to the main list). If you need a specific group, you can provide the group ID.

---

## API Response Handling

| Scenario | MailerLite Response | Our Response |
|----------|-------------------|--------------|
| New subscriber | 201 Created | Success message |
| Existing subscriber | 200 OK (returns existing) | "Already subscribed" message |
| Invalid email | 422 Validation error | Error message |
| Rate limited | 429 | Retry or error message |

---

## Broadcast Flow (Updated)

```text
┌─────────────────────────────────────────────────┐
│ 1. Create campaign (type: regular)              │
│    POST /campaigns                              │
│ ↓                                               │
│ 2. Set campaign content (HTML)                  │
│    PUT /campaigns/{id}/content                  │
│ ↓                                               │
│ 3. Send campaign                                │
│    POST /campaigns/{id}/schedule                │
│    (with delivery: "instant")                   │
└─────────────────────────────────────────────────┘
```

---

## Expected Result

After implementation:
- All "Notify Me" and newsletter signup forms will add subscribers directly to MailerLite
- Existing Resend subscribers can be migrated using the sync function
- Broadcasts will be sent via MailerLite campaigns
- The system will be fully independent of Resend for newsletter management
