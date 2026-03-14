

## TidyCal Integration — Booking Types & Booking History

### Summary

Integrate TidyCal's REST API to show available booking types (excluding "Introductory") and past/upcoming bookings on both org and provider dashboards. Each provider can configure their own TidyCal token.

### Database changes

- Add `tidycal_api_token` column to `service_providers` (encrypted text, nullable)
- This keeps it per-provider as requested

### Edge Function: `tidycal-proxy`

A single edge function that proxies TidyCal API calls. Actions:

1. **`list-booking-types`** — calls `GET https://tidycal.com/api/booking-types`, filters out types with "Introductory" in the title. Returns title, duration, price, and TidyCal booking URL.
2. **`list-bookings`** — calls `GET https://tidycal.com/api/bookings` with `starts_at`/`ends_at` filters. Supports `upcoming` and `past` modes.

Auth flow:
- Caller must be authenticated
- Function looks up the provider's `tidycal_api_token` using the service role client
- For org callers: verifies org membership + that org is a customer of the provider (via `provider_customers`)
- For provider callers: verifies provider membership

### Frontend — Org Dashboard

**New sidebar nav item**: "Bookings" (Calendar icon) at `/dashboard/org/:slug/bookings`

**Also on Org Overview**: A compact "Book a Call" card showing available booking types with direct booking buttons.

**Bookings page** (`OrgBookings.tsx`):
- Top section: booking type cards with "Book" buttons (opens TidyCal URL in new tab)
- Tabs: "Upcoming" / "Past" — lists bookings filtered by the org's contact email matching TidyCal contact data
- Each booking shows: date/time, booking type name, duration, status

### Frontend — Provider Dashboard

**New sidebar nav item**: "Bookings" (Calendar icon) at `/dashboard/provider/:slug/bookings`

**Provider Bookings page** (`ProviderBookings.tsx`):
- Full view of all upcoming and past bookings across all customers
- Each booking shows: date/time, contact name/email, booking type, duration
- Provider Overview: compact "Upcoming Bookings" widget

### Provider Settings

Add a "TidyCal Integration" section to Provider Settings:
- Input field for TidyCal API token (masked) with save button
- Help text linking to tidycal.com/integrations/oauth to create a token
- Connection status indicator

### Technical details

- TidyCal API base: `https://tidycal.com/api`
- Auth header: `Authorization: Bearer {token}`
- The token is stored in the `service_providers` table, fetched server-side by the edge function — never exposed to the client
- Cross-referencing bookings to orgs: match TidyCal contact email against `organizations.contact_email` or org member emails
- Pagination support via TidyCal's `page` parameter

### File changes

| File | Action |
|------|--------|
| `supabase/migrations/xxx.sql` | Add `tidycal_api_token` to `service_providers` |
| `supabase/functions/tidycal-proxy/index.ts` | New edge function |
| `src/hooks/useTidyCalBookingTypes.ts` | Hook for fetching booking types |
| `src/hooks/useTidyCalBookings.ts` | Hook for fetching bookings |
| `src/pages/dashboard/org/OrgBookings.tsx` | New org bookings page |
| `src/pages/dashboard/provider/ProviderBookings.tsx` | New provider bookings page |
| `src/components/dashboard/DashboardSidebar.tsx` | Add "Bookings" nav item to both org and provider menus |
| `src/pages/dashboard/provider/ProviderSettings.tsx` | Add TidyCal token configuration section |
| `src/pages/dashboard/org/OrgOverview.tsx` | Add compact booking types card |
| `src/App.tsx` | Add new routes |

