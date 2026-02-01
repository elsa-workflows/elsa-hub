

## Admin User Deletion Feature (Complete Cleanup)

### Overview
Implement a secure platform admin feature to delete test users and ALL their associated data, with complete cleanup in both the database and Stripe.

---

### Architecture

1. **Edge Function** (`delete-user`): Orchestrates Stripe cleanup and calls the database RPC
2. **Database RPC** (`admin_delete_user`): Deletes all records in correct order respecting FK constraints
3. **UI Component** (`DeleteUserDialog`): Confirmation dialog on AdminUsers page

---

### Database Changes

#### RPC Function: `admin_delete_user`

This function will delete records in the correct order to respect foreign key dependencies:

```text
Deletion Order:
─────────────────────────────────────────────────────────────────
Phase 1: Deep child records (no FK references to them)
├── lot_consumptions (references work_logs, credit_lots)
├── audit_events (references orgs, providers, users)
├── notifications (references users)
├── notification_preferences (references users)
├── unsubscribe_tokens (references users)
└── intro_call_requests (references users, orgs)

Phase 2: Financial/usage records
├── work_logs (referenced by lot_consumptions - now empty)
├── credit_ledger_entries (references work_logs, credit_lots, orders)
├── invoices (references orders, orgs)
├── credit_lots (references orders, subscriptions, orgs)
├── orders (references orgs, bundles)
└── subscriptions (references orgs)

Phase 3: Invitations
└── invitations (references orgs, invited_by user)

Phase 4: Membership cleanup
├── organization_members (for sole-owner orgs)
└── provider_members (user's provider memberships)

Phase 5: Organizations (sole-owner only)
└── organizations (where user is sole owner)

Phase 6: User records
├── profiles
└── auth.users (CASCADE handles remaining FK references)
```

---

### Edge Function: `delete-user`

**File: `supabase/functions/delete-user/index.ts`**

```text
Endpoint: POST /delete-user
Body: { "userId": "uuid" }
Auth: Requires platform admin JWT

Flow:
1. Validate admin status via is_platform_admin() RPC
2. Prevent self-deletion
3. Fetch user email from profiles
4. Get organizations where user is sole owner
5. For each org's active subscriptions:
   → Cancel Stripe subscription
6. Find Stripe customers by user email:
   → Delete each Stripe customer
7. Call admin_delete_user RPC
8. Return deletion summary with counts
```

Stripe cleanup handles:
- **Subscriptions**: `stripe.subscriptions.cancel()` with invoice proration
- **Customers**: `stripe.customers.del()` by email lookup

Errors in Stripe cleanup are logged but don't block database deletion.

---

### SQL Migration

```sql
-- Function to delete a user and ALL related data
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _sole_owner_org_ids UUID[];
  _all_org_ids UUID[];
BEGIN
  -- Verify caller is platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: Platform admin required';
  END IF;

  -- Get organizations where user is sole owner (these will be deleted)
  SELECT ARRAY_AGG(om.organization_id) INTO _sole_owner_org_ids
  FROM organization_members om
  WHERE om.user_id = p_user_id 
    AND om.role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om2 
      WHERE om2.organization_id = om.organization_id 
        AND om2.user_id != p_user_id 
        AND om2.role = 'owner'
    );
  
  -- Get all orgs user is a member of
  SELECT ARRAY_AGG(organization_id) INTO _all_org_ids
  FROM organization_members WHERE user_id = p_user_id;

  -- Build result summary before deletion
  _result := jsonb_build_object(
    'user_id', p_user_id,
    'organizations_deleted', COALESCE(array_length(_sole_owner_org_ids, 1), 0),
    'memberships_removed', COALESCE(array_length(_all_org_ids, 1), 0)
  );

  -- PHASE 1: Deep child records
  DELETE FROM lot_consumptions WHERE work_log_id IN (
    SELECT id FROM work_logs WHERE organization_id = ANY(_sole_owner_org_ids)
  );
  DELETE FROM audit_events WHERE organization_id = ANY(_sole_owner_org_ids) OR actor_user_id = p_user_id;
  DELETE FROM notifications WHERE user_id = p_user_id;
  DELETE FROM notification_preferences WHERE user_id = p_user_id;
  DELETE FROM unsubscribe_tokens WHERE user_id = p_user_id;
  DELETE FROM intro_call_requests WHERE user_id = p_user_id;

  -- PHASE 2: Financial/usage records for sole-owner orgs
  DELETE FROM work_logs WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM credit_ledger_entries WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM invoices WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM credit_lots WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM orders WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM subscriptions WHERE organization_id = ANY(_sole_owner_org_ids);

  -- PHASE 3: Invitations
  DELETE FROM invitations WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM invitations WHERE invited_by = p_user_id;

  -- PHASE 4: Memberships
  DELETE FROM provider_customers WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM organization_members WHERE organization_id = ANY(_sole_owner_org_ids);
  DELETE FROM organization_members WHERE user_id = p_user_id;
  DELETE FROM provider_members WHERE user_id = p_user_id;
  DELETE FROM platform_admins WHERE user_id = p_user_id;

  -- PHASE 5: Organizations (sole-owner only)
  DELETE FROM organizations WHERE id = ANY(_sole_owner_org_ids);

  -- PHASE 6: User records
  DELETE FROM profiles WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN _result;
END;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;
```

---

### Frontend Components

#### DeleteUserDialog Component

**File: `src/components/admin/DeleteUserDialog.tsx`**

- Destructive confirmation dialog (similar to DeleteOrganizationDialog)
- Displays warning about permanent deletion
- Lists what will be deleted:
  - User account and profile
  - Organizations where user is sole owner
  - All orders, invoices, credits, work logs for those orgs
  - Stripe subscriptions and customer records
- Requires typing user's email to confirm
- Shows loading spinner during deletion
- Displays success/error toast

#### Update AdminUsers Page

**File: `src/pages/dashboard/admin/AdminUsers.tsx`**

Add "Actions" column with delete button:

| User | Email | Signed Up | Organizations | Actions |
|------|-------|-----------|---------------|---------|
| ... | ... | ... | ... | [Delete] |

---

### Edge Function Config

**File: `supabase/config.toml`**

```toml
[functions.delete-user]
verify_jwt = false
```

---

### Security Measures

1. **Double Admin Check**: Both edge function and RPC verify `is_platform_admin()`
2. **Self-Deletion Prevention**: Cannot delete your own account
3. **Email Confirmation**: Must type user's email to confirm
4. **Service Role**: Edge function uses service role for auth.users deletion
5. **Execution Restriction**: RPC only executable by authenticated role

---

### Implementation Files

| File | Purpose |
|------|---------|
| Migration SQL | Create `admin_delete_user` RPC function |
| `supabase/functions/delete-user/index.ts` | Stripe cleanup + RPC orchestration |
| `supabase/functions/delete-user/deno.json` | Import map |
| `supabase/config.toml` | Add function config |
| `src/components/admin/DeleteUserDialog.tsx` | Confirmation dialog |
| `src/components/admin/index.ts` | Export new component |
| `src/pages/dashboard/admin/AdminUsers.tsx` | Add delete action column |

---

### What Gets Deleted (Complete Cleanup)

```text
User Deletion (Complete)
├── Stripe
│   ├── All subscriptions (canceled)
│   └── Customer records (deleted)
├── Sole-Owner Organizations
│   ├── lot_consumptions
│   ├── work_logs
│   ├── credit_ledger_entries
│   ├── invoices
│   ├── credit_lots
│   ├── orders
│   ├── subscriptions
│   ├── invitations
│   ├── provider_customers
│   ├── organization_members
│   └── organizations
├── User Records
│   ├── audit_events (user as actor)
│   ├── invitations (invited by user)
│   ├── organization_members (other orgs)
│   ├── provider_members
│   ├── platform_admins
│   ├── notifications
│   ├── notification_preferences
│   ├── unsubscribe_tokens
│   ├── intro_call_requests
│   ├── profiles
│   └── auth.users
```

No schema modifications required - complete deletion instead of SET NULL.

