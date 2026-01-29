

# Usage Visibility for Service Credits - Implementation Plan

**Status: ✅ IMPLEMENTED**

This plan implements a read/aggregation layer for usage visibility that allows customers and providers to understand how credits are consumed over time. The implementation uses existing `work_logs` data without introducing new tables or domain concepts.

## Architecture Principles

- **Summaries first**: Aggregated views by default, drill-down optional
- **Read-only**: No write permissions introduced
- **RLS-compliant**: All queries respect existing Row Level Security
- **Terminology**: "usage", "credits consumed", "work logged" (no "burn" or "timesheets")

---

## Phase 1 - Customer-Facing Usage View

### 1.1 Usage Summary Component

Create a new `OrgUsageSummary` component for the organization dashboard that shows:

**Stats Cards:**
- Total credits consumed in selected period
- Credits remaining (from existing `creditBalances`)
- Number of work entries in the period
- Optional: Breakdown by work category

**Period Selector:**
- Current month (default)
- Previous month
- Custom date range (start/end picker)

**Location:** Add to `OrgCredits.tsx` above the existing Usage Pacing Card

### 1.2 New Hook: `useOrgUsageSummary`

Create a hook that fetches aggregated usage data:

```typescript
interface UsageSummaryData {
  totalMinutesConsumed: number;
  entryCount: number;
  periodStart: Date;
  periodEnd: Date;
  byCategory: Record<string, { minutes: number; count: number }>;
}

function useOrgUsageSummary(
  organizationId: string | undefined,
  period: 'current_month' | 'previous_month' | 'custom',
  customRange?: { start: Date; end: Date },
  serviceProviderId?: string
)
```

This hook queries `work_logs` with:
- `organization_id` filter
- `performed_at` date range filter
- Optional `service_provider_id` filter
- Groups by category for breakdown

### 1.3 Work Log Details Drill-down

Enhance the existing `WorkLogsTable` component:
- Add period filtering (reuse period selector state)
- Add "View Details" link from summary cards
- Keep work logs read-only (no edit/dispute)

### 1.4 UI Component: `UsagePeriodSelector`

A reusable period selector component with:
- Preset buttons: "This Month", "Last Month"  
- Date range picker for custom periods
- Compact design that fits in card headers

---

## Phase 2 - Provider-Facing Usage Overview

### 2.1 New Page: `ProviderUsage.tsx`

Add a dedicated "Usage" page to the provider dashboard sidebar at `/dashboard/provider/:slug/usage`

**High-Level Stats Section:**
- Total credits consumed this month (all customers)
- Total credits consumed last month
- Number of active customer organizations
- Top 5 customers by usage this month

**Per-Customer Usage Table:**

| Customer | This Month | Last Month | This Quarter | Trend |
|----------|-----------|------------|--------------|-------|
| Acme Inc | 5.5h      | 4.2h       | 15.0h        | ↑     |
| Contoso  | 2.0h      | 3.5h       | 8.0h         | ↓     |

Trend indicator: Compare this month vs. last month (up/down/same)

### 2.2 New Hook: `useProviderUsageSummary`

```typescript
interface ProviderUsageSummary {
  thisMonth: {
    totalMinutes: number;
    entryCount: number;
    activeCustomers: number;
  };
  lastMonth: {
    totalMinutes: number;
    entryCount: number;
  };
  topCustomers: Array<{
    organizationId: string;
    organizationName: string;
    minutesThisMonth: number;
  }>;
}
```

### 2.3 New Hook: `useCustomerUsageBreakdown`

```typescript
interface CustomerUsageRow {
  organizationId: string;
  organizationName: string;
  thisMonthMinutes: number;
  lastMonthMinutes: number;
  thisQuarterMinutes: number;
  trend: 'up' | 'down' | 'same';
}
```

### 2.4 Sidebar Navigation Update

Add "Usage" nav item to provider navigation in `DashboardSidebar.tsx`:
```typescript
const providerNavItems = [
  { label: "Overview", icon: LayoutDashboard, path: "" },
  { label: "Usage", icon: BarChart3, path: "usage" },  // NEW
  { label: "Orders", icon: Receipt, path: "orders" },
  // ...
];
```

---

## Implementation Details

### Query Strategy

All usage queries use the existing `work_logs` table with client-side aggregation for Phase 1. The queries are simple enough that RPC functions aren't required initially:

```sql
-- Customer usage for a period
SELECT 
  COUNT(*) as entry_count,
  SUM(minutes_spent) as total_minutes,
  category
FROM work_logs
WHERE organization_id = $org_id
  AND performed_at >= $start_date
  AND performed_at < $end_date
GROUP BY category;

-- Provider usage across customers
SELECT 
  organization_id,
  SUM(minutes_spent) as total_minutes,
  COUNT(*) as entry_count
FROM work_logs
WHERE service_provider_id = $provider_id
  AND performed_at >= $start_date
  AND performed_at < $end_date
GROUP BY organization_id;
```

### Date Range Helpers

Create utility functions for period calculations:
```typescript
function getPeriodRange(period: 'current_month' | 'previous_month'): { start: Date; end: Date }
function getQuarterRange(): { start: Date; end: Date }
```

### Security

- All queries use existing RLS policies on `work_logs`
- Customers see only their organization's data
- Providers see only data for their linked customers via `provider_customers`
- No new write permissions

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useOrgUsageSummary.ts` | Create | Aggregates work_logs for org usage |
| `src/hooks/useProviderUsageSummary.ts` | Create | Aggregates provider-wide usage stats |
| `src/hooks/useCustomerUsageBreakdown.ts` | Create | Per-customer usage with trends |
| `src/components/organization/UsageSummaryCard.tsx` | Create | Customer usage summary display |
| `src/components/organization/UsagePeriodSelector.tsx` | Create | Reusable period picker |
| `src/components/organization/index.ts` | Update | Export new components |
| `src/pages/dashboard/org/OrgCredits.tsx` | Update | Add usage summary section |
| `src/pages/dashboard/provider/ProviderUsage.tsx` | Create | New provider usage page |
| `src/components/dashboard/DashboardSidebar.tsx` | Update | Add Usage nav item for providers |
| `src/App.tsx` | Update | Add route for ProviderUsage |

---

## UI Design Notes

### Customer Usage Summary Card

```text
┌──────────────────────────────────────────────────────────┐
│ Usage Summary                        [This Month ▼]      │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │    5.5h     │  │     12      │  │    4.5h     │       │
│  │  consumed   │  │   entries   │  │  remaining  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                          │
│  By Category                                             │
│  ├─ Consulting    3.0h  (6 entries)                     │
│  ├─ Development   1.5h  (4 entries)                     │
│  └─ Support       1.0h  (2 entries)                     │
│                                                          │
│  [View Work Log Details →]                              │
└──────────────────────────────────────────────────────────┘
```

### Provider Usage Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│ Usage Overview                                                   │
├────────────────────┬───────────────────┬────────────────────────┤
│  This Month        │  Last Month       │  Active Customers      │
│  12.5h consumed    │  9.0h consumed    │  4 organizations       │
└────────────────────┴───────────────────┴────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Customer Usage Breakdown                                        │
├──────────────┬────────────┬───────────┬────────────┬───────────┤
│ Customer     │ This Month │ Last Month│ Quarter    │ Trend     │
├──────────────┼────────────┼───────────┼────────────┼───────────┤
│ Acme Inc     │ 5.5h       │ 4.2h      │ 15.0h      │ ↑ +31%    │
│ Contoso      │ 3.0h       │ 2.8h      │ 8.0h       │ ↑ +7%     │
│ Skywalker    │ 2.5h       │ 2.0h      │ 6.5h       │ ↑ +25%    │
│ Rebel Co     │ 1.5h       │ 0.0h      │ 1.5h       │ NEW       │
└──────────────┴────────────┴───────────┴────────────┴───────────┘
```

---

## Explicit Non-Goals (Not Implemented)

- Per-minute or per-day charts
- Editable work logs  
- Dispute workflows
- SLA/response-time inferences
- CSV/PDF export (Phase 2+)
- Weekly/quarterly breakdowns (Phase 2+)

---

## Implementation Order

1. Create date utility functions
2. Create `useOrgUsageSummary` hook
3. Create `UsagePeriodSelector` component
4. Create `UsageSummaryCard` component
5. Update `OrgCredits.tsx` with usage summary
6. Create `useProviderUsageSummary` hook
7. Create `useCustomerUsageBreakdown` hook  
8. Create `ProviderUsage.tsx` page
9. Update sidebar navigation
10. Add route in App.tsx

