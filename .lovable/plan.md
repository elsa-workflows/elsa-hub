# Newsletter Platform with Resend

## Overview

Single-segment newsletter using Resend Audiences API. All subscribers go to one `general` audience for simplicity.

---

## Configuration

| Audience | ID | Purpose |
|----------|-----|---------|
| `general` | `ca32f69c-4a6d-4371-890d-32f781fcbf96` | All newsletter subscribers |

---

## Implementation

### Edge Function: `subscribe-newsletter`

**Request:** `{ email: string; firstName?: string }`

**Logic:**
1. Validate email
2. Add contact to the `general` audience
3. Return success

### Components

| Component | Purpose |
|-----------|---------|
| `NewsletterSubscribeDialog` | Reusable dialog for "Notify Me" buttons |
| `FooterNewsletterSignup` | Inline footer signup form |

### Page Updates

- `Footer.tsx` - Add newsletter section
- `DockerImages.tsx`, `CloudServices.tsx`, `Training.tsx` - Replace mailto with dialog

---

## Edge Function Code

```typescript
const AUDIENCE_ID = "ca32f69c-4a6d-4371-890d-32f781fcbf96";

const response = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: email.toLowerCase().trim(),
    first_name: firstName || undefined,
    unsubscribed: false,
  }),
});
```

