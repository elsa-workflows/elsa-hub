

# Dashboard UI/UX Overhaul: Implementation Plan

## Overview

This plan introduces a modern, sidebar-based dashboard architecture for authenticated users, inspired by Catalyst's clean layout while maintaining the existing Elsa Workflows visual identity. The new structure will provide clear navigation for organization members and service providers, with the ability to switch contexts seamlessly.

## Architecture Decisions

### Route Structure
- `/dashboard/` - Dashboard home with context selector
- `/dashboard/org/:slug/` - Organization overview (default landing)
- `/dashboard/org/:slug/orders` - Purchase history
- `/dashboard/org/:slug/credits` - Credit usage and expiration
- `/dashboard/org/:slug/team` - Team members and invitations
- `/dashboard/org/:slug/settings` - Organization settings (rename, leave org)
- `/dashboard/provider/:slug/` - Provider overview
- `/dashboard/provider/:slug/customers` - Customer organizations
- `/dashboard/provider/:slug/work-logs` - Log and view hours
- `/dashboard/provider/:slug/bundles` - Manage credit packages
- `/dashboard/settings` - Personal profile and account settings

### Context Switching
Users who belong to multiple organizations AND/OR are members of a service provider will see a unified context switcher at the top of the sidebar. This dropdown will list:
- **My Organizations** section with all orgs
- **Service Provider** section (if applicable)
- **+ Create Organization** action

This approach lets users quickly switch between contexts without navigating away.

## Visual Design

```text
+--------------------------------------------------+
|  [=] Elsa Workflows     [Bell] [User Avatar]     |  <- Compact header
+--------------------------------------------------+
|  [Context  |                                     |
|   Switcher]|   Page Content Area                 |
|  --------- |                                     |
|            |   - Cards, tables, forms            |
|  Overview  |   - Contextual actions              |
|  Orders    |   - Full-width layout               |
|  Credits   |                                     |
|  Team      |                                     |
|  Settings  |                                     |
|            |                                     |
|  --------- |                                     |
|  Profile   |                                     |
+------------+-------------------------------------+
```

### Sidebar Behavior
- Collapsible to icon-only mode on desktop (Cmd+B shortcut)
- Opens as a sheet/drawer on mobile devices
- Active route highlighted with primary color
- Tooltips shown when collapsed

## Implementation Phases

### Phase 1: Foundation (This Implementation)
Create the core dashboard infrastructure and migrate existing organization features.

### Phase 2: Organization Enhancements
Break the current monolithic dashboard into dedicated pages with enhanced features like "Leave organization."

### Phase 3: Service Provider Portal
Build provider-specific pages for work logging and customer management.

---

## Technical Implementation

### New Files to Create

#### 1. Dashboard Layout Components

**`src/components/dashboard/DashboardLayout.tsx`**
- Wraps all dashboard routes
- Contains `SidebarProvider` from the existing Shadcn sidebar
- Renders `DashboardSidebar` and `DashboardHeader`
- Provides a scrollable content area with consistent padding

**`src/components/dashboard/DashboardSidebar.tsx`**
- Renders the sidebar navigation based on current context
- Uses the `useDashboardContext` hook to determine which menu items to show
- Implements collapsible groups for org vs provider navigation
- Footer section with Profile link and theme toggle (future)

**`src/components/dashboard/ContextSwitcher.tsx`**
- Dropdown component at the top of the sidebar
- Lists all organizations the user belongs to (from `useOrganizations`)
- Lists service providers the user is a member of (new hook: `useProviderMemberships`)
- Shows current selection with logo/icon, name, and role badge
- Navigates to the selected context's overview page on selection

**`src/components/dashboard/DashboardHeader.tsx`**
- Compact header with sidebar toggle button, logo, notification bell, and user menu
- User menu includes Profile settings and Sign out actions
- Replaces the full marketing navigation inside dashboard routes

**`src/components/dashboard/index.ts`**
- Barrel export file for dashboard components

#### 2. Dashboard Context

**`src/contexts/DashboardContext.tsx`**
- Manages the current dashboard context (organization or provider)
- Stores context type (`org` | `provider`) and the entity's slug
- Derived from URL parameters using `useParams`
- Provides navigation helpers for switching contexts

#### 3. New Hooks

**`src/hooks/useProviderMemberships.ts`**
- Fetches service providers where the current user is a member
- Returns provider id, name, slug, role, and logo
- Used by ContextSwitcher to populate the provider section

#### 4. Dashboard Pages

**`src/pages/dashboard/DashboardHome.tsx`**
- Landing page when navigating to `/dashboard/`
- If user has one org and no provider access, redirects to that org's overview
- Otherwise shows a selection grid of all available contexts

**`src/pages/dashboard/settings/ProfileSettings.tsx`**
- Personal account settings (email, display name, avatar)
- Sign out button
- Moved from the current Account page

**`src/pages/dashboard/org/OrgOverview.tsx`**
- Migrated from current OrganizationDashboard
- Shows credit summary, recent orders, team preview
- Links to detailed pages

**`src/pages/dashboard/org/OrgOrders.tsx`**
- Full purchase history with filtering and search
- Receipt download links
- Pagination for large datasets

**`src/pages/dashboard/org/OrgCredits.tsx`**
- Detailed credit usage breakdown by lot
- Expiration warnings
- Usage chart over time

**`src/pages/dashboard/org/OrgTeam.tsx`**
- Full team management page
- Invite members, view pending invitations
- Role management (for admins)
- Remove members

**`src/pages/dashboard/org/OrgSettings.tsx`**
- Organization name and slug management
- Logo upload (future)
- "Leave organization" action
- "Delete organization" for owners (with confirmation)

**Provider Pages (Phase 3 - stubbed initially):**
- `src/pages/dashboard/provider/ProviderOverview.tsx`
- `src/pages/dashboard/provider/ProviderCustomers.tsx`
- `src/pages/dashboard/provider/ProviderWorkLogs.tsx`
- `src/pages/dashboard/provider/ProviderBundles.tsx`

### File Modifications

#### `src/App.tsx`
- Add new dashboard routes under `/dashboard/*`
- Keep existing `/org/:slug` and `/account` as redirects to new paths
- Wrap dashboard routes with `DashboardLayout`

#### `src/contexts/OrganizationContext.tsx`
- Keep existing functionality
- May extend to include current dashboard context or rely on new DashboardContext

#### `src/components/layout/Navigation.tsx`
- Update "Account" link to point to `/dashboard/`
- No other changes needed (marketing nav stays unchanged)

#### `src/pages/Account.tsx`
- Convert to a redirect component that sends to `/dashboard/settings`
- Or keep as a minimal page that redirects based on context

### Navigation Menu Items

**Organization Context:**
| Label | Icon | Route |
|-------|------|-------|
| Overview | `LayoutDashboard` | `/dashboard/org/:slug` |
| Orders | `Receipt` | `/dashboard/org/:slug/orders` |
| Credits | `Coins` | `/dashboard/org/:slug/credits` |
| Team | `Users` | `/dashboard/org/:slug/team` |
| Settings | `Settings` | `/dashboard/org/:slug/settings` |

**Provider Context:**
| Label | Icon | Route |
|-------|------|-------|
| Overview | `LayoutDashboard` | `/dashboard/provider/:slug` |
| Customers | `Building2` | `/dashboard/provider/:slug/customers` |
| Work Logs | `Clock` | `/dashboard/provider/:slug/work-logs` |
| Bundles | `Package` | `/dashboard/provider/:slug/bundles` |
| Settings | `Settings` | `/dashboard/provider/:slug/settings` |

**Footer (always visible):**
| Label | Icon | Route |
|-------|------|-------|
| Profile | `User` | `/dashboard/settings` |

### Backward Compatibility

To avoid breaking existing links and bookmarks:

1. **`/account`** - Redirects to `/dashboard/settings` (or `/dashboard/` if no default org)
2. **`/org/:slug`** - Redirects to `/dashboard/org/:slug`

These redirects will be implemented as simple components using `Navigate` from react-router-dom.

### Route Protection

All `/dashboard/*` routes will check for authentication:
- If not authenticated, redirect to `/login` with a return URL
- This logic will be handled in `DashboardLayout`

---

## File Structure Summary

```text
src/
  components/
    dashboard/
      index.ts
      DashboardLayout.tsx
      DashboardSidebar.tsx
      DashboardHeader.tsx
      ContextSwitcher.tsx
  contexts/
    DashboardContext.tsx       (new)
    AuthContext.tsx            (existing)
    OrganizationContext.tsx    (existing)
  hooks/
    useProviderMemberships.ts  (new)
    useOrganizations.ts        (existing)
    useOrganizationDashboard.ts (existing)
  pages/
    dashboard/
      DashboardHome.tsx
      settings/
        ProfileSettings.tsx
      org/
        OrgOverview.tsx
        OrgOrders.tsx
        OrgCredits.tsx
        OrgTeam.tsx
        OrgSettings.tsx
      provider/               (stubbed for Phase 3)
        ProviderOverview.tsx
        ProviderCustomers.tsx
        ProviderWorkLogs.tsx
        ProviderBundles.tsx
    Account.tsx               (becomes redirect)
    OrganizationDashboard.tsx (becomes redirect)
```

---

## Implementation Order

1. **Create DashboardContext** - Foundation for context management
2. **Create useProviderMemberships hook** - Fetch provider data
3. **Create dashboard layout components** - DashboardLayout, DashboardSidebar, DashboardHeader, ContextSwitcher
4. **Create DashboardHome page** - Entry point with context selection
5. **Create ProfileSettings page** - Personal account settings
6. **Create OrgOverview page** - Migrate from OrganizationDashboard
7. **Create OrgOrders, OrgCredits, OrgTeam, OrgSettings pages** - Break out functionality
8. **Update App.tsx routing** - Add new routes and redirects
9. **Create redirect components** - For /account and /org/:slug
10. **Stub provider pages** - Placeholder for Phase 3
11. **Test navigation flows** - Ensure smooth transitions and active states

---

## Design Tokens

The existing CSS variables in `src/index.css` already define sidebar-specific tokens:
- `--sidebar-background`
- `--sidebar-foreground`
- `--sidebar-primary`
- `--sidebar-accent`
- `--sidebar-border`

These will be used to maintain visual consistency with the overall theme.

