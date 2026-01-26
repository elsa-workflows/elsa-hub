
# Organization Dashboard Implementation Plan

## Overview

Create a dedicated dashboard page for each organization that displays:
1. **Credit Balance** - Total, used, available, and expiring soon credits
2. **Purchase History** - Orders and invoices with status and receipt links
3. **Team Members** - Organization members with roles and management options

The dashboard will be accessible by clicking on an organization from the Account page, with a route pattern of `/org/:slug`.

---

## Architecture

### Route Structure
```text
/org/:slug              -> OrganizationDashboard (main dashboard)
/org/:slug/team         -> Future: dedicated team management
/org/:slug/billing      -> Future: dedicated billing page
```

### Data Flow
```text
OrganizationDashboard
  |
  +-- useOrganizationDashboard(slug)
  |     |
  |     +-- Fetch organization by slug
  |     +-- Verify membership via RLS
  |     +-- Fetch credit balance via RPC
  |     +-- Fetch orders with bundle info
  |     +-- Fetch invoices
  |     +-- Fetch team members
  |
  +-- CreditBalanceCard
  +-- PurchaseHistoryTable
  +-- TeamMembersCard
```

---

## Implementation Steps

### Phase 1: Hook and Data Layer

**Create `src/hooks/useOrganizationDashboard.ts`**

A custom hook that fetches all dashboard data for an organization:

- **Organization details**: Fetches the organization by slug, verifies the user has access (RLS handles this automatically)
- **Credit balance**: Calls the `get_credit_balance` RPC function, which returns balance per service provider
- **Purchase history**: Fetches from `orders` table joined with `credit_bundles` for bundle names
- **Invoices**: Fetches from `invoices` table for receipt URLs and payment status
- **Team members**: Fetches from `organization_members` table

The hook will return typed data with loading and error states.

---

### Phase 2: Dashboard Components

**1. `src/components/organization/CreditBalanceCard.tsx`**

Displays credit balance information:
- Available hours (prominent display)
- Total hours purchased
- Hours used
- Hours expiring within 30 days (warning indicator)
- Visual progress bar showing usage
- Grouped by service provider (if multiple providers)

**2. `src/components/organization/PurchaseHistoryTable.tsx`**

A table showing purchase history:
- Date
- Bundle name
- Amount (formatted currency)
- Status badge (pending, paid, cancelled)
- Receipt link (from invoice's `stripe_receipt_url`)

Uses the existing Table components from shadcn/ui.

**3. `src/components/organization/TeamMembersCard.tsx`**

Displays team members:
- Member email (from user_id, we'll need to handle this)
- Role with icon (Owner, Admin, Member)
- Joined date
- For admins/owners: ability to manage roles (future enhancement)

Note: Since we can't query `auth.users` directly, we'll display user_id initially and add a profiles table integration later if needed.

---

### Phase 3: Dashboard Page

**Create `src/pages/OrganizationDashboard.tsx`**

Main dashboard page that:
- Extracts `slug` from URL params
- Uses `useOrganizationDashboard` hook
- Shows loading skeleton while fetching
- Displays 404-style message if organization not found or no access
- Renders three sections in a responsive grid layout:
  - Credit Balance (full width on mobile, 1/3 on desktop)
  - Purchase History (full width, scrollable table)
  - Team Members (full width on mobile, 1/3 on desktop)

Layout: Uses existing `Layout` component for consistent navigation/footer.

---

### Phase 4: Navigation Integration

**Update `src/components/account/OrganizationList.tsx`**

- Make organization cards clickable
- Navigate to `/org/:slug` when clicked
- Add subtle arrow indicator

**Update `src/App.tsx`**

- Add route: `/org/:slug` -> `OrganizationDashboard`

---

## Technical Details

### Credit Balance Display Logic

The `get_credit_balance` RPC returns data grouped by `service_provider_id`. For display:
- Convert minutes to hours (divide by 60, round to 1 decimal)
- Show provider name by joining with `service_providers` table
- Aggregate totals if showing combined view

### RLS Considerations

All queries are protected by existing RLS policies:
- `organizations`: `is_org_member(id)` for SELECT
- `orders`: `is_org_member(organization_id)` for SELECT
- `invoices`: `is_org_member(organization_id)` for SELECT
- `organization_members`: `is_org_member(organization_id)` for SELECT
- `get_credit_balance`: Requires authenticated user, verified in function

No additional RLS policies needed.

### Type Safety

Create TypeScript interfaces for:
- `CreditBalance` - matches RPC return type
- `OrderWithBundle` - order joined with credit_bundle
- `TeamMember` - organization_member with role

---

## File Structure

```text
src/
  components/
    organization/
      index.ts
      CreditBalanceCard.tsx
      PurchaseHistoryTable.tsx
      TeamMembersCard.tsx
  hooks/
    useOrganizationDashboard.ts
  pages/
    OrganizationDashboard.tsx
```

---

## UI/UX Design

### Dashboard Layout (Desktop)
```text
+------------------------------------------+
|  < Back to Account    Organization Name  |
+------------------------------------------+
|                                          |
|  +----------------+  +----------------+  |
|  | Credit Balance |  | Team Members   |  |
|  | [=======   ]   |  | - user@... Own |  |
|  | 45h available  |  | - user@... Adm |  |
|  | 5h expiring    |  | + Invite       |  |
|  +----------------+  +----------------+  |
|                                          |
|  +--------------------------------------+|
|  | Purchase History                     ||
|  |--------------------------------------|
|  | Date       | Bundle    | Amount |Sta||
|  | Jan 15     | 10 Hours  | $500   | P ||
|  | Dec 01     | 20 Hours  | $900   | P ||
|  +--------------------------------------+|
+------------------------------------------+
```

### Mobile Layout
All cards stack vertically in a single column.

---

## Dependencies

Uses existing packages:
- `lucide-react` for icons (Clock, Users, Receipt, CreditCard, AlertTriangle)
- `@/components/ui/*` for Card, Table, Badge, Button, Progress
- `react-router-dom` for navigation
- `date-fns` for date formatting

No new dependencies required.
