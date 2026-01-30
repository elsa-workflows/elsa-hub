

# Archive Function for Intro Call Requests

## Overview
Add an archive capability for intro call requests so providers can remove completed or irrelevant requests from their active view. This keeps the main list clean while preserving historical data.

## What Already Works
- **Notifications**: Already have a dismiss function (X button) that sets `dismissed_at` - no changes needed
- **Intro Call Requests**: Need archive functionality added

## Implementation

### 1. Database Migration
Add "archived" to the allowed status values in the `intro_call_requests` table:

```sql
ALTER TABLE intro_call_requests 
DROP CONSTRAINT IF EXISTS intro_call_requests_status_check;

ALTER TABLE intro_call_requests
ADD CONSTRAINT intro_call_requests_status_check 
CHECK (status IN ('pending', 'approved', 'scheduled', 'completed', 'declined', 'archived'));
```

### 2. Update Hook (useIntroCallRequests.ts)
- Add "archived" to the `STATUS_OPTIONS` type
- Add an `archiveRequest` mutation function
- Update the query to filter out archived requests by default
- Add optional parameter to include archived requests

### 3. Update UI (IntroCallRequestsCard.tsx)
- Add an "Archive" button (with Archive icon) to each request row
- The button appears in the expanded view or as a quick action
- Shows confirmation before archiving
- Toast notification on successful archive

## UI Changes

```text
+----------------------------------------+
| John Smith - Acme Corp                 |
| [Status Dropdown ▼] [↓] [Archive 📦]   |
+----------------------------------------+
```

The archive button will:
- Use the Archive (box) icon from lucide-react
- Be placed next to the expand/collapse button
- Show a subtle confirmation or archive immediately with undo option

## Files to Modify

1. **Database Migration** - Add "archived" status
2. `src/hooks/useIntroCallRequests.ts` - Add archive mutation, filter archived by default
3. `src/components/provider/IntroCallRequestsCard.tsx` - Add archive button UI
4. `src/pages/dashboard/provider/ProviderCustomers.tsx` - Update pending count to exclude archived

## Technical Details

### Archive Mutation
```typescript
const archiveMutation = useMutation({
  mutationFn: async (requestId: string) => {
    const { error } = await supabase
      .from("intro_call_requests")
      .update({ status: "archived" })
      .eq("id", requestId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["intro-call-requests"] });
  },
});
```

### Default Filter
```typescript
// Query only non-archived by default
.neq("status", "archived")
```

