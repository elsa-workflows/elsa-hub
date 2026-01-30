

# Newsletter Platform with Resend Audiences

## Overview

Build a newsletter subscription system using Resend's Audiences and Broadcasts features. This enables targeted communications through segments for specific interests (e.g., Production Docker Images availability) alongside a general newsletter for community updates.

---

## Segment Strategy

| Segment | Purpose | Trigger Point |
|---------|---------|---------------|
| `general` | Regular community newsletters, product updates, release notes | Footer signup form |
| `production-docker` | Notify when Production Docker Images become available | "Notify Me" on Docker Images page |
| `cloud-services` | Notify when Cloud Hosting launches | "Notify Me" on Cloud Services page |
| `training` | Notify when Training Academy opens | "Notify Me" on Training page |
| `marketplace` | Notify when Marketplace items become available | Future: Marketplace interest forms |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Footer Newsletter Form          "Coming Soon" Pages                    │
│   ┌─────────────────────┐        ┌─────────────────────┐                │
│   │ Email + Subscribe   │        │ Email + Notify Me   │                │
│   │ (general segment)   │        │ (specific segment)  │                │
│   └──────────┬──────────┘        └──────────┬──────────┘                │
│              │                              │                            │
└──────────────┼──────────────────────────────┼────────────────────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Edge Function: subscribe-newsletter                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Validate email                                                  │  │
│  │ 2. Create/update contact in Resend Audience                        │  │
│  │ 3. Add contact to requested segment(s)                             │  │
│  │ 4. Return success/duplicate status                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────┬──────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Resend Audiences                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │   general   │ │prod-docker  │ │cloud-services│ │  training   │       │
│  │  (segment)  │ │  (segment)  │ │  (segment)   │ │  (segment)  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                              │                                          │
│                              ▼                                          │
│                    ┌─────────────────┐                                  │
│                    │    Broadcasts   │ (manually sent via Resend UI    │
│                    │                 │  or future admin edge function)  │
│                    └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### 1. Create Edge Function: `subscribe-newsletter`

**File:** `supabase/functions/subscribe-newsletter/index.ts`

Single edge function handling all newsletter subscriptions with segment routing.

**Request Schema:**
```typescript
interface SubscribeRequest {
  email: string;
  firstName?: string;      // Optional, for personalization
  segments: string[];       // e.g., ["general"] or ["production-docker"]
}
```

**Response:**
```typescript
interface SubscribeResponse {
  success: boolean;
  message: string;
  alreadySubscribed?: boolean;
}
```

**Logic Flow:**
1. Validate email format (regex + length check, defense in depth)
2. Check if RESEND_API_KEY is configured
3. Create or update contact in Resend Audience
4. Add contact to each requested segment
5. Return appropriate success/error message

**Key Implementation Details:**
- Uses existing `RESEND_API_KEY` secret (already configured)
- Requires a `RESEND_AUDIENCE_ID` secret to be added
- No database storage required (Resend manages contacts)
- Public endpoint (no auth required for subscriptions)

### 2. Create Newsletter Subscribe Dialog Component

**File:** `src/components/newsletter/NewsletterSubscribeDialog.tsx`

A reusable dialog component for collecting email subscriptions.

**Props:**
```typescript
interface NewsletterSubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: string;                    // e.g., "production-docker"
  title?: string;                     // e.g., "Get Notified"
  description?: string;               // Context-specific copy
  buttonText?: string;                // e.g., "Notify Me"
  successMessage?: string;            // Custom confirmation
}
```

**Features:**
- Email input with client-side validation
- Optional first name field for personalization
- Loading state during submission
- Success/error toast notifications
- Accessible dialog structure using existing `Dialog` component

### 3. Create Footer Newsletter Section Component

**File:** `src/components/newsletter/FooterNewsletterSignup.tsx`

Compact inline signup form for the footer.

**Features:**
- Email input + submit button (inline layout)
- Subscribes to `general` segment
- Toast feedback on success/error
- Minimal, non-intrusive design matching footer aesthetic

### 4. Update Footer Layout

**File:** `src/components/layout/Footer.tsx`

Add a "Stay Updated" section alongside existing link columns.

**Placement:** After the brand column, before Product links (or as a full-width row above the bottom copyright).

**Copy:**
```text
Stay Updated
Subscribe to the Elsa Workflows newsletter for release updates, 
community highlights, and ecosystem news.

[Email input] [Subscribe]
```

### 5. Update "Coming Soon" Pages with Notify Me Forms

Replace existing `mailto:` links with the new dialog component.

| Page | Current CTA | New CTA |
|------|-------------|---------|
| `DockerImages.tsx` | `mailto:...` link | "Notify Me" opens dialog (segment: `production-docker`) |
| `CloudServices.tsx` | `mailto:...` link | "Notify Me" opens dialog (segment: `cloud-services`) |
| `Training.tsx` | `mailto:...` link | "Notify Me" opens dialog (segment: `training`) |

Each page will import and use `NewsletterSubscribeDialog` with its specific segment and copy.

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/subscribe-newsletter/index.ts` | Create | Edge function for Resend subscription |
| `supabase/functions/subscribe-newsletter/deno.json` | Create | Import map for Resend |
| `supabase/config.toml` | Edit | Add function config (verify_jwt = false) |
| `src/components/newsletter/NewsletterSubscribeDialog.tsx` | Create | Reusable subscription dialog |
| `src/components/newsletter/FooterNewsletterSignup.tsx` | Create | Inline footer form |
| `src/components/newsletter/index.ts` | Create | Component exports |
| `src/components/layout/Footer.tsx` | Edit | Add newsletter section |
| `src/pages/enterprise/DockerImages.tsx` | Edit | Replace mailto with dialog |
| `src/pages/enterprise/CloudServices.tsx` | Edit | Replace mailto with dialog |
| `src/pages/enterprise/Training.tsx` | Edit | Replace mailto with dialog |

---

## Secret Requirements

A new Supabase secret is required:

| Secret | Purpose | How to Obtain |
|--------|---------|---------------|
| `RESEND_AUDIENCE_ID` | Target audience for all Elsa newsletter contacts | Create in Resend dashboard > Audiences |

The existing `RESEND_API_KEY` will be reused.

---

## Resend Setup Steps (Manual, Pre-Implementation)

Before implementation, you'll need to:

1. **Create an Audience** in Resend Dashboard:
   - Navigate to Audiences > Create Audience
   - Name: "Elsa Workflows Newsletter"
   - Copy the Audience ID

2. **Create Segments** within that Audience:
   - `general` - General newsletter subscribers
   - `production-docker` - Production Docker Images interest
   - `cloud-services` - Cloud Hosting interest
   - `training` - Training Academy interest

3. **Add the Audience ID as a Supabase secret**:
   - Name: `RESEND_AUDIENCE_ID`
   - Value: The ID from step 1

---

## Component Behavior Details

### NewsletterSubscribeDialog

```text
┌─────────────────────────────────────────────────────────┐
│  ╳                                                       │
│                                                          │
│      [Bell Icon]                                         │
│                                                          │
│      Get Notified                                        │
│                                                          │
│      Be the first to know when Production Docker         │
│      Images become available.                            │
│                                                          │
│      ┌─────────────────────────────────────────────┐    │
│      │ Your email                                   │    │
│      └─────────────────────────────────────────────┘    │
│                                                          │
│      ┌─────────────────────────────────────────────┐    │
│      │ First name (optional)                        │    │
│      └─────────────────────────────────────────────┘    │
│                                                          │
│      We'll only email you about this specific topic.    │
│      Unsubscribe anytime.                               │
│                                                          │
│      ┌─────────────────────────────────────────────┐    │
│      │              Notify Me                       │    │
│      └─────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### FooterNewsletterSignup

```text
Stay Updated                     
───────────────────────────────  
Release updates and ecosystem news.

┌──────────────────────────┐ ┌───────────┐
│ your@email.com           │ │ Subscribe │
└──────────────────────────┘ └───────────┘
```

---

## Edge Function Implementation Details

```typescript
// Key patterns for subscribe-newsletter edge function:

// 1. Email validation (defense in depth)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email) || email.length > 255) {
  return error(400, "Invalid email format");
}

// 2. Create/update contact in Resend
const resend = new Resend(RESEND_API_KEY);
const { data: contact, error: contactError } = await resend.contacts.create({
  email: email.toLowerCase().trim(),
  firstName: firstName || undefined,
  audienceId: RESEND_AUDIENCE_ID,
  unsubscribed: false,
});

// 3. Add to segment(s)
for (const segment of segments) {
  await resend.contacts.segments.create({
    id: contact.id,
    segmentId: SEGMENT_IDS[segment],
  });
}
```

---

## Privacy and Compliance

- **Unsubscribe handling**: Resend automatically manages unsubscribes via `{{{RESEND_UNSUBSCRIBE_URL}}}` in broadcast emails
- **No database storage**: Contact data lives only in Resend, reducing GDPR complexity
- **Clear consent language**: Forms include disclaimer about email topic and unsubscribe ability
- **Email validation**: Server-side validation prevents malformed data

---

## Future Enhancements (Out of Scope)

- Admin dashboard for sending broadcasts
- Subscription preferences page for users
- Double opt-in confirmation flow
- Analytics tracking of subscription sources

