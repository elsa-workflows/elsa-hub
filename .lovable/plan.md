# Newsletter Platform with Resend Segments

## Overview

Build a newsletter subscription system using Resend's **Segments** (not deprecated Audiences). Contacts are added directly to segments without requiring an audience ID.

---

## Segment Strategy

| Segment | Purpose | Trigger Point |
|---------|---------|---------------|
| `general` | Regular community newsletters, product updates, release notes | Footer signup form |
| `production-docker` | Notify when Production Docker Images become available | "Notify Me" on Docker Images page |
| `cloud-services` | Notify when Cloud Hosting launches | "Notify Me" on Cloud Services page |
| `training` | Notify when Training Academy opens | "Notify Me" on Training page |

---

## Architecture

```text
Frontend (Footer + Coming Soon pages)
         │
         ▼
Edge Function: subscribe-newsletter
         │
         ├─► Create contact (resend.contacts.create)
         │
         └─► Add to segment (resend.contacts.segments.add)
         │
         ▼
Resend Segments: general, production-docker, cloud-services, training
```

---

## Implementation

### Edge Function: `subscribe-newsletter`

**Request:**
```typescript
{ email: string; firstName?: string; segments: string[] }
```

**Logic:**
1. Validate email
2. Create contact in Resend (no audience ID needed)
3. Add contact to each segment by segment ID
4. Return success

**Secrets Required:**
- `RESEND_API_KEY` (existing)
- Segment IDs are stored as constants in the edge function

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `NewsletterSubscribeDialog` | `src/components/newsletter/` | Reusable dialog for "Notify Me" |
| `FooterNewsletterSignup` | `src/components/newsletter/` | Inline footer form |

### Page Updates

| Page | Change |
|------|--------|
| `Footer.tsx` | Add newsletter signup section |
| `DockerImages.tsx` | Replace mailto with dialog |
| `CloudServices.tsx` | Replace mailto with dialog |
| `Training.tsx` | Replace mailto with dialog |

---

## Resend Setup (Manual)

1. Create segments in Resend Dashboard:
   - `general`, `production-docker`, `cloud-services`, `training`
2. Copy each segment ID and update the edge function constants

---

## Edge Function Code Pattern

```typescript
const resend = new Resend(RESEND_API_KEY);

// Create contact (no audienceId needed with new API)
const { data: contact } = await resend.contacts.create({
  email: email.toLowerCase().trim(),
  firstName: firstName || undefined,
  unsubscribed: false,
});

// Add to segment(s) using segment ID
for (const segmentId of segmentIds) {
  await resend.contacts.segments.add({
    segmentId,
    contactId: contact.id,
  });
}
```

