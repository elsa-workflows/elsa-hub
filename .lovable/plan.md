

## Platform Admin Dashboard

This plan introduces a secure **Platform Admin** role and a comprehensive admin dashboard to give you visibility into all users, organizations, orders, and platform activity.

---

### Overview

The admin dashboard will be accessible at `/dashboard/admin` and provide screens for:

1. **Overview** - Key metrics and platform health at a glance
2. **Users** - List all registered users with signup dates, last activity, and organization memberships
3. **Organizations** - View all orgs, their members, and credit balances
4. **Orders & Revenue** - Track all purchases, subscriptions, and revenue
5. **Invitations** - Monitor pending/accepted invitations across the platform
6. **Audit Log** - Review all platform activity for compliance and debugging

---

### Proposed Admin Screens

| Screen | Key Data Displayed |
|--------|-------------------|
| **Overview** | Total users, organizations, revenue (MTD), active subscriptions, recent signups, pending orders |
| **Users** | Email, signup date, last sign-in, organizations they belong to, profile status |
| **Organizations** | Name, slug, member count, total credits purchased, current balance, creation date |
| **Orders** | Organization, bundle, amount, status, date, payment method |
| **Subscriptions** | Organization, plan, status, billing period, MRR contribution |
| **Invitations** | Email, organization, role, status, invited by, expiry |
| **Audit Log** | Actor, action, entity, timestamp, before/after data |

---

### Security Architecture

Following the security guidelines provided, admin status will be stored in a **separate `platform_admins` table** (not on profiles) and verified via a security-definer function:

```text
+----------------+       +------------------+
|   auth.users   |       | platform_admins  |
+----------------+       +------------------+
| id (uuid)      |<----->| user_id (uuid)   |
| email          |       | created_at       |
+----------------+       +------------------+
```

**Key security measures:**
- `is_platform_admin()` function using `SECURITY DEFINER` to prevent recursive RLS
- RLS policies that only allow platform admins to access admin-specific views
- All admin routes protected in frontend with role check
- Existing data accessed via service-level views (not bypassing RLS entirely)

---

### Implementation Steps

#### Phase 1: Database Layer

1. **Create `platform_admins` table**
   - `id`, `user_id` (FK to auth.users), `created_at`
   - Unique constraint on `user_id`
   - RLS: Only platform admins can view the table

2. **Create `is_platform_admin()` function**
   ```sql
   CREATE FUNCTION public.is_platform_admin()
   RETURNS BOOLEAN
   LANGUAGE sql STABLE SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1 FROM platform_admins
       WHERE user_id = auth.uid()
     )
   $$;
   ```

3. **Create admin views** (security-definer functions or views)
   - `admin_users_view`: Joins auth.users + profiles + organization_members
   - `admin_organizations_view`: Organizations with member counts and credit totals
   - `admin_orders_view`: All orders with org/bundle details
   - `admin_audit_view`: Recent audit events

4. **Seed your user as the first platform admin**

#### Phase 2: Frontend - Admin Context

1. **Create `useIsAdmin` hook**
   - Calls `is_platform_admin()` RPC
   - Caches result in React Query

2. **Update `DashboardContext`**
   - Add `"admin"` to context types
   - Add `/dashboard/admin` route handling

3. **Update `DashboardSidebar`**
   - Show admin menu when `is_platform_admin` is true
   - Admin nav items: Overview, Users, Organizations, Orders, Invitations, Audit

#### Phase 3: Admin Pages

1. **Admin Overview** (`/dashboard/admin`)
   - Stats cards: Total users, organizations, orders, revenue, subscriptions
   - Recent signups list
   - Pending orders/invitations

2. **Admin Users** (`/dashboard/admin/users`)
   - Searchable/sortable table with email, signup date, last login
   - Click to see user's organization memberships
   - No edit functionality (view-only for safety)

3. **Admin Organizations** (`/dashboard/admin/organizations`)
   - Table with org name, slug, member count, credits balance
   - Expandable rows to see members
   - Link to org's provider (if applicable)

4. **Admin Orders** (`/dashboard/admin/orders`)
   - Filterable table by status, date range
   - Shows organization, bundle, amount, payment status
   - Link to Stripe dashboard for details

5. **Admin Invitations** (`/dashboard/admin/invitations`)
   - All pending invitations across platform
   - Status, target org, role, expiry

6. **Admin Audit Log** (`/dashboard/admin/audit`)
   - Searchable activity feed
   - Filter by entity type, actor, date range
   - JSON viewer for before/after data

---

### File Structure

```text
src/
├── hooks/
│   └── useIsAdmin.ts                    # Platform admin check hook
├── pages/dashboard/admin/
│   ├── AdminOverview.tsx                # Main stats dashboard
│   ├── AdminUsers.tsx                   # Users table
│   ├── AdminOrganizations.tsx           # Organizations table
│   ├── AdminOrders.tsx                  # Orders table
│   ├── AdminInvitations.tsx             # Invitations table
│   └── AdminAudit.tsx                   # Audit log viewer
└── components/admin/
    ├── AdminStatsCard.tsx               # Reusable stat card
    ├── AdminDataTable.tsx               # Generic sortable table
    └── index.ts
```

---

### Technical Considerations

- **Performance**: Admin views will use server-side pagination (limit 50/100 rows)
- **No destructive actions**: Admin dashboard is read-only to prevent accidental data loss
- **Future extensibility**: Structure allows adding moderation tools (disable users, suspend orgs) later
- **Stripe integration**: Orders page can link directly to Stripe dashboard for refunds/details

---

### Migration Summary

```sql
-- 1. Create platform_admins table
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 3. Create admin check function
CREATE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
$$;

-- 4. RLS policy for platform_admins table
CREATE POLICY "Platform admins can view admin list"
  ON platform_admins FOR SELECT
  USING (is_platform_admin());

-- 5. Seed initial admin (your user ID)
INSERT INTO platform_admins (user_id) 
VALUES ('c33ba42e-5927-4989-beee-017b09caef35'); -- sipkeschoorstra@outlook.com

-- 6. Create admin views with RPC functions for each data set
```

