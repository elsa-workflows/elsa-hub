

# Plan: Add Booking URL to Service Providers

## Database

Add `booking_url text` column to `service_providers`.

```sql
ALTER TABLE service_providers ADD COLUMN booking_url text;
```

Then set the value for Valence Works: `UPDATE service_providers SET booking_url = 'https://tidycal.com/valenceworks' WHERE slug = 'valence-works';`

## UI Changes

### Provider Settings (`ProviderSettings.tsx`)
Add an editable "Booking URL" input field below the Contact Email field (admin-only), same pattern as `ContactEmailField`.

### Public Provider Page (`ValenceWorks.tsx`)
Show a "Book a Call" button linking to the booking URL (opens in new tab). Only render if `booking_url` is set.

### Expert Services Listing (`ExpertServicesProviders.tsx`)
Optionally show a small "Book" link/button on each provider card if `booking_url` is present.

### Customer Dashboard
Add a "Book a Call" button in the org's provider-facing views (e.g. `OrgOverview.tsx` or `OrgCredits.tsx`) that links to the provider's booking URL.

## Files

| Action | File |
|--------|------|
| Migrate | Add `booking_url` column + seed Valence Works value |
| Modify | `src/pages/dashboard/provider/ProviderSettings.tsx` — add booking URL input |
| Modify | `src/pages/enterprise/providers/ValenceWorks.tsx` — add Book a Call button |
| Modify | `src/pages/enterprise/ExpertServicesProviders.tsx` — optional booking link on cards |
| Modify | `src/integrations/supabase/types.ts` — will auto-update |

