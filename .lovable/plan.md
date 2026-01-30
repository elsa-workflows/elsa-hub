
# Credit Bundle Management for Service Providers

## Overview
Enable service providers to fully manage their credit bundles: create new bundles, edit existing ones, toggle active/inactive status, and control visibility. Currently, the bundles page displays data but all controls are disabled.

## Current State
- **ProviderBundles page** displays bundles in tables with disabled switches
- **"Create Bundle" button** exists but is disabled
- **RLS policies** already support INSERT and UPDATE for provider admins
- **No edit dialogs** exist for bundles

## Issues to Fix
1. **RLS SELECT Policy** - Currently only returns `is_active = true` bundles, preventing admins from seeing deactivated bundles
2. **No mutation functions** - The hook only fetches data, no create/update mutations
3. **All UI controls disabled** - Switches and buttons are non-functional

---

## Implementation Plan

### 1. Database: Update RLS SELECT Policy
Add a new SELECT policy allowing provider admins to see ALL their bundles (including inactive):

```sql
CREATE POLICY "Provider admins can view all bundles"
  ON credit_bundles FOR SELECT
  USING (is_provider_admin(service_provider_id));
```

This works alongside the existing "Anyone can view active bundles" policy.

### 2. Create Bundle Management Hook
New hook `useBundleManagement.ts` with mutations for:
- **Create bundle** - Insert new bundle with validation
- **Update bundle** - Edit name, description, hours, price, etc.
- **Toggle active status** - Quick enable/disable switch

### 3. Create Edit Bundle Dialog
New component `EditBundleDialog.tsx`:
- Form fields for all editable properties
- Different field sets for one-time vs recurring bundles
- Validation using zod schema
- Support for both create and edit modes

**Editable Fields:**
| Field | Type | Notes |
|-------|------|-------|
| name | text | Required, max 100 chars |
| description | textarea | Optional, max 500 chars |
| hours | number | Required for one-time |
| monthly_hours | number | Required for recurring |
| price_cents | number | In cents (display as currency) |
| currency | select | EUR, USD, etc. |
| billing_type | select | one_time or recurring |
| recurring_interval | select | monthly/yearly (if recurring) |
| stripe_price_id | text | Optional, for Stripe integration |
| is_active | switch | Enable/disable bundle |

### 4. Update ProviderBundles Page
- Enable the "Create Bundle" button to open dialog
- Add edit button (pencil icon) to each table row
- Enable the active/inactive Switch for quick toggling
- Add visual indicator for inactive bundles (opacity/badge)

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | Create | Add RLS policy for provider admins to view all bundles |
| `src/hooks/useBundleManagement.ts` | Create | Mutations for create, update, toggle bundles |
| `src/components/provider/EditBundleDialog.tsx` | Create | Form dialog for create/edit bundle |
| `src/components/provider/index.ts` | Edit | Export new component |
| `src/pages/dashboard/provider/ProviderBundles.tsx` | Edit | Wire up create/edit/toggle functionality |

---

## Technical Details

### Edit Bundle Dialog Form Schema
```typescript
const bundleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  hours: z.number().min(1).max(1000),
  monthly_hours: z.number().min(1).max(100).optional(),
  price_cents: z.number().min(0),
  currency: z.enum(["eur", "usd"]),
  billing_type: z.enum(["one_time", "recurring"]),
  recurring_interval: z.string().optional(),
  stripe_price_id: z.string().optional(),
  is_active: z.boolean(),
});
```

### Toggle Active Mutation
```typescript
const toggleActive = useMutation({
  mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
    const { error } = await supabase
      .from("credit_bundles")
      .update({ is_active })
      .eq("id", id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["provider-bundles"] });
  },
});
```

### UI Behavior
- **Create**: Opens empty dialog, saves new bundle
- **Edit**: Opens pre-filled dialog, updates existing bundle
- **Toggle**: Direct switch action with optimistic update
- **Inactive bundles**: Shown with reduced opacity and "Inactive" badge

---

## Security Considerations
- All mutations protected by RLS (`is_provider_admin`)
- Only authenticated provider admins can modify bundles
- Stripe Price ID field is editable but changes require Stripe sync
