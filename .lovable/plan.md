

# Email Template & Unsubscribe System

## Overview

Build a professional email template system with RFC 8058-compliant one-click unsubscribe functionality. Authenticated users will manage preferences in the dashboard, while unauthenticated recipients can unsubscribe instantly via a tokenized link.

---

## Architecture

```text
+---------------------------------------------------+
|                  Email Types                       |
+---------------------------------------------------+
|                                                    |
|   Transactional Emails         Newsletter Emails   |
|   (send-notification)          (Resend Broadcasts) |
|   - Work logged                - Community updates |
|   - Credit purchases           - Product news      |
|   - Subscription renewals      - Release notes     |
|                                                    |
+---------------------------------------------------+
                        |
                        v
+---------------------------------------------------+
|              Shared Email Template                 |
|  - Consistent branding (logo, colors, footer)     |
|  - RFC 8058 unsubscribe headers                   |
|  - One-click unsubscribe link                     |
+---------------------------------------------------+
                        |
            +-----------+-----------+
            |                       |
            v                       v
+-------------------+     +-------------------+
| Authenticated     |     | Unauthenticated   |
| Users             |     | Recipients        |
+-------------------+     +-------------------+
| Dashboard toggle  |     | Token-based       |
| /dashboard/       |     | unsubscribe       |
| settings/         |     | /unsubscribe/     |
| notifications     |     | :token            |
+-------------------+     +-------------------+
```

---

## Implementation Plan

### 1. Database Schema Changes

**New table: `unsubscribe_tokens`**

Stores secure tokens for one-click unsubscribe without login.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to profiles.user_id |
| `token_hash` | text | SHA-256 hash of token |
| `created_at` | timestamptz | Token creation time |
| `used_at` | timestamptz | When token was used (nullable) |

**New column on `notification_preferences`:**

| Column | Type | Description |
|--------|------|-------------|
| `newsletter_enabled` | boolean | Newsletter subscription status (default: false) |

---

### 2. Edge Function: `unsubscribe`

Handles token-based unsubscribe requests without requiring authentication.

**Endpoints:**
- `POST /unsubscribe` - One-click unsubscribe (RFC 8058)
- `GET /unsubscribe?token=xxx` - Browser link, returns HTML confirmation page

**Request Flow:**

```text
1. User clicks unsubscribe link in email
   GET /unsubscribe?token=abc123&type=all

2. Edge function validates token hash against database

3. Updates notification_preferences:
   - type=all: email_enabled = false
   - type=newsletter: newsletter_enabled = false
   - type=work_logged: notify_work_logged = false

4. Returns branded confirmation page
```

---

### 3. Redesigned Email Template

Create a beautiful, consistent email template with proper structure.

**Template Features:**
- Elsa Workflows branding (logo, primary color gradient)
- Clean typography with proper hierarchy
- Mobile-responsive design
- Clear CTA buttons
- Footer with unsubscribe link and preference management link
- Dark mode support via CSS media queries

**Example Structure:**

```text
+------------------------------------------+
|  [Elsa Workflows Logo]                   |
+------------------------------------------+
|                                          |
|  Email Title                             |
|                                          |
|  Main content with proper spacing        |
|  and readable typography.                |
|                                          |
|  [Primary Action Button]                 |
|                                          |
+------------------------------------------+
|  You're receiving this because you       |
|  signed up for Elsa Workflows.           |
|                                          |
|  [Manage Preferences] | [Unsubscribe]    |
|                                          |
|  Elsa Workflows                          |
|  elsa-workflows.io                       |
+------------------------------------------+
```

**RFC 8058 Headers (added to all emails):**

```typescript
headers: {
  "List-Unsubscribe": "<https://elsa-hub.lovable.app/api/unsubscribe?token=xxx>",
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
}
```

---

### 4. Unsubscribe Page Component

A public page for unsubscribe confirmation and preference management.

**Route:** `/unsubscribe/:token`

**Features:**
- Shows branded confirmation when unsubscribe succeeds
- Option to resubscribe
- Link to full preference management (if logged in)
- Handles invalid/expired tokens gracefully

---

### 5. Dashboard Enhancement

Update the existing NotificationSettings page to include newsletter subscription.

**New Section: "Newsletter Subscription"**

```text
+------------------------------------------+
|  Newsletter & Updates                     |
|  ────────────────────                     |
|                                          |
|  [Toggle] Community newsletter            |
|           Product updates, release notes, |
|           and ecosystem news              |
+------------------------------------------+
```

**Sync with Resend:**
When user toggles newsletter preference, call Resend API to update contact's `unsubscribed` status.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_unsubscribe_tokens.sql` | Create | New table + newsletter column |
| `supabase/functions/unsubscribe/index.ts` | Create | Token validation & preference updates |
| `supabase/functions/send-notification/index.ts` | Edit | Add beautiful template + unsubscribe headers |
| `src/pages/Unsubscribe.tsx` | Create | Public unsubscribe confirmation page |
| `src/App.tsx` | Edit | Add /unsubscribe/:token route |
| `src/pages/dashboard/settings/NotificationSettings.tsx` | Edit | Add newsletter toggle section |
| `src/hooks/useNotificationPreferences.ts` | Edit | Add newsletter_enabled field |
| `supabase/config.toml` | Edit | Add unsubscribe function config |

---

## Email Template Code

The template will be built as a reusable function:

```typescript
interface EmailTemplateOptions {
  preheader?: string;        // Preview text
  title: string;
  content: string;           // HTML content
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeToken: string;
  unsubscribeType?: "all" | "newsletter" | string;
}

function buildEmailTemplate(options: EmailTemplateOptions): string {
  const unsubscribeUrl = `https://elsa-hub.lovable.app/unsubscribe/${options.unsubscribeToken}?type=${options.unsubscribeType || "all"}`;
  const preferencesUrl = "https://elsa-hub.lovable.app/dashboard/settings/notifications";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media (prefers-color-scheme: dark) {
          .email-body { background-color: #1a1a2e !important; }
          .email-card { background-color: #2d2d44 !important; border-color: #3d3d5c !important; }
          .text-primary { color: #e5e5e5 !important; }
          .text-secondary { color: #a0a0a0 !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
      <!-- Preheader text (hidden preview) -->
      <div style="display: none; max-height: 0; overflow: hidden;">
        ${options.preheader || options.title}
      </div>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="100%" style="max-width: 600px;">
              
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <img src="https://elsa-hub.lovable.app/elsa-logo.png" 
                       alt="Elsa Workflows" 
                       width="48" height="48" 
                       style="display: block;">
                </td>
              </tr>
              
              <!-- Main Card -->
              <tr>
                <td class="email-card" style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px;">
                  
                  <!-- Title -->
                  <h1 class="text-primary" style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${options.title}
                  </h1>
                  
                  <!-- Content -->
                  <div class="text-secondary" style="color: #52525b; font-size: 16px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${options.content}
                  </div>
                  
                  ${options.ctaText && options.ctaUrl ? `
                  <!-- CTA Button -->
                  <div style="margin-top: 24px;">
                    <a href="${options.ctaUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      ${options.ctaText}
                    </a>
                  </div>
                  ` : ""}
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 0; text-align: center;">
                  <p style="margin: 0 0 12px; font-size: 13px; color: #71717a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    You're receiving this email because you have an account on Elsa Workflows.
                  </p>
                  <p style="margin: 0; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <a href="${preferencesUrl}" style="color: #6366f1; text-decoration: none;">Manage preferences</a>
                    &nbsp;·&nbsp;
                    <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
                  </p>
                  <p style="margin: 16px 0 0; font-size: 12px; color: #a1a1aa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Elsa Workflows · elsa-workflows.io
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
```

---

## Unsubscribe Token Flow

### Token Generation (when sending email):

```typescript
// Generate unique token per user per email type
const tokenValue = crypto.randomUUID();
const tokenHash = await sha256(tokenValue);

// Store in database
await supabase.from("unsubscribe_tokens").insert({
  user_id: userId,
  token_hash: tokenHash
});

// Include token in email link (not the hash)
const unsubscribeUrl = `https://elsa-hub.lovable.app/unsubscribe/${tokenValue}?type=all`;
```

### Token Validation (when processing unsubscribe):

```typescript
// Hash the incoming token
const incomingHash = await sha256(token);

// Look up by hash
const { data: tokenRecord } = await supabase
  .from("unsubscribe_tokens")
  .select("user_id, used_at")
  .eq("token_hash", incomingHash)
  .single();

if (!tokenRecord || tokenRecord.used_at) {
  return { error: "Invalid or expired token" };
}

// Update preferences
await supabase
  .from("notification_preferences")
  .update({ email_enabled: false })
  .eq("user_id", tokenRecord.user_id);

// Mark token as used
await supabase
  .from("unsubscribe_tokens")
  .update({ used_at: new Date().toISOString() })
  .eq("token_hash", incomingHash);
```

---

## Security Considerations

1. **Token Hashing**: Tokens are hashed with SHA-256 before storage to prevent database exposure from revealing valid unsubscribe links
2. **One-Time Use**: Tokens are marked as used after first use to prevent replay attacks
3. **No Login Required**: Unsubscribe works without authentication per RFC 8058 requirements
4. **Rate Limiting**: Edge function should implement basic rate limiting
5. **Type Validation**: Only allow known preference types (all, newsletter, work_logged, etc.)

---

## Newsletter Sync with Resend

When authenticated users toggle newsletter preferences:

```typescript
// In useNotificationPreferences hook
const updateNewsletter = async (enabled: boolean) => {
  // Update local preference
  await supabase
    .from("notification_preferences")
    .update({ newsletter_enabled: enabled })
    .eq("user_id", user.id);
  
  // Sync to Resend
  await supabase.functions.invoke("sync-newsletter-preference", {
    body: { email: user.email, subscribed: enabled }
  });
};
```

This keeps the Resend audience in sync with user preferences.

