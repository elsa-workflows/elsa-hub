
# Fix Organization Creation RLS Error

## Problem Identified

When creating an organization, the INSERT operation includes a `RETURNING` clause (via Supabase's `.select()` after `.insert()`). PostgreSQL requires SELECT permission on rows returned by RETURNING.

The current SELECT policies for `organizations` are:
- `is_org_member(id)` - User must be a member
- `is_provider_customer(id)` - User must be a provider serving this org

But the trigger that adds the user as owner runs **AFTER** the INSERT completes. At the moment PostgreSQL evaluates the RETURNING clause, the user is not yet a member, so the SELECT policies fail, causing the RLS error.

## Solution

Add a SELECT policy that allows users to read organizations they just created. The cleanest approach is to add a policy that permits SELECT for newly created rows during the same transaction.

However, since we cannot easily detect "just inserted by this user" without adding a `created_by` column, the simplest fix is to **modify the trigger to run BEFORE the INSERT completes** or to add a `created_by` column.

**Recommended approach**: Add a `created_by` column to track who created the organization and add a SELECT policy that allows that user to see it.

## Implementation

### Database Migration

1. **Add `created_by` column** to `organizations` table to track the creator
2. **Create new SELECT policy** allowing `auth.uid() = created_by` 
3. **Update the INSERT process** to set `created_by` automatically via a BEFORE trigger

### SQL Changes

```sql
-- 1. Add created_by column
ALTER TABLE public.organizations 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- 2. Create BEFORE INSERT trigger to set created_by
CREATE OR REPLACE FUNCTION public.set_organization_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_before_insert
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_creator();

-- 3. Add SELECT policy for creator
CREATE POLICY "Creators can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (created_by = auth.uid());
```

### Frontend Changes

None required - the existing code will work once the database policies are fixed.

## Technical Details

| Component | Change |
|-----------|--------|
| `organizations` table | Add `created_by UUID` column |
| New trigger function | `set_organization_creator()` - BEFORE INSERT |
| New trigger | `on_organization_before_insert` |
| New RLS policy | `Creators can view their organization` |

## Why This Works

1. BEFORE INSERT trigger sets `created_by = auth.uid()` before the row is written
2. When PostgreSQL evaluates RETURNING, it checks SELECT policies
3. The new policy `created_by = auth.uid()` passes immediately
4. The existing AFTER INSERT trigger still adds the user as owner
5. Both policies (`is_org_member` and `created_by`) will then allow access

## Alternative Considered

We could remove `.select()` from the frontend code, but this would require changing how the app retrieves the newly created organization. The database-level fix is more robust and maintains the expected API behavior.
