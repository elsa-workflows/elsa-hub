## Goal

Bring Work Logs and Workspaces closer together without losing the cross-customer reporting view. Logging becomes Workspace-originated; the standalone Work Logs page becomes a read/reporting ledger.

## Scope

Frontend-only. No schema changes. `work_logs` table, RLS, hooks, and `LogWorkDialog` stay as they are.

## Changes

### 1. Provider sidebar (`src/components/dashboard/DashboardSidebar.tsx`)
- Rename the **Work Logs** item to **Hours** (clearer that it's the reporting/ledger counterpart).
- Keep Workspaces above it. Order: Workspaces → Hours.

### 2. Provider Hours page (`src/pages/dashboard/provider/ProviderWorkLogs.tsx`)
- Update header copy: title `Hours`, subtitle "Every entry logged across your customers. Log new hours from a Workspace."
- Remove the top-right `Log Hours` button (logging now originates from a Workspace).
- Keep summary stats (Total / Billable / Showing), filters, table.
- In the empty state, replace "Click 'Log Hours' to record your first entry" with a CTA linking to `…/workspaces`.
- Make the **Customer** cell a link to that customer's Workspace (`…/workspaces/:orgSlug`).

### 3. Per-customer Workspace (`src/pages/dashboard/provider/ProviderWorkspace.tsx`)
- Below `EngagementWorkspace`, add a **Logged hours for this customer** card:
  - Reuses `useProviderDashboard` `workLogs`, filtered by `organization_id === organization.id`.
  - Shows the last ~10 entries (date / description / category / hours) and a small total.
  - Header has a "View all in Hours" link to `…/work-logs?customer=<orgId>` (filter pre-applied) and keeps the `LogWorkDialog` trigger so providers can log ad-hoc hours scoped to this customer.
- The Hours page reads `?customer=` on mount and pre-selects `customerFilter`.

### 4. Org-side Workspace (`src/pages/dashboard/org/OrgWorkspace.tsx`)
- Add the same **Logged hours** card (read-only) using `useOrgUsageSummary` / existing org work-log fetch so customers see what was logged in the same place they collaborate. No "log hours" button on the org side.

### 5. Routing (`src/App.tsx`)
- Keep `provider/:slug/work-logs` route working under the new label (no path change — avoids breaking any existing links or notifications).

## Out of scope
- No database changes.
- No changes to `LogWorkDialog` behaviour, credit math, or RLS.
- Org sidebar untouched (Org side already has no separate Work Logs entry).
- No rename of the URL path; only the UI label changes.

## Verification
- Provider sidebar shows `Workspaces` then `Hours`.
- `/dashboard/provider/:slug/work-logs` renders with no top-right Log button, customer cells link to the Workspace, and `?customer=<id>` pre-filters.
- Opening a customer Workspace shows the "Logged hours for this customer" card with recent entries and a working `LogWorkDialog`.
- Org Workspace shows the same card read-only.
- Build passes; no TS errors.
