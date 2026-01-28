
# Fix: Invitation Notifications Not Appearing After Account Switch

## Problem Summary
When switching from `skywalkertdp@gmail.com` to `sipkeschoorstra@outlook.com`, the invitation notifications don't appear. Investigation reveals that:
- The invitation exists in the database and is valid
- Network requests continue to use the OLD user's JWT token and email filter
- The client-side state isn't properly refreshing after login

## Root Cause
The Supabase auth client and React Query cache retain stale data after account switches. While `queryClient.invalidateQueries()` is called on `SIGNED_IN`, the queries re-run immediately with potentially stale user data before the new session is fully established.

## Solution

### Step 1: Clear React Query Cache Completely on Auth Change
Instead of just invalidating queries, completely clear and reset the cache when auth state changes to force fresh fetches.

**File**: `src/contexts/AuthContext.tsx`
- Replace `queryClient.invalidateQueries()` with `queryClient.clear()` to remove all cached data
- This ensures no stale user-specific data persists across account switches

### Step 2: Add Session Refresh on Account Switch  
Force a full session refresh when a sign-in event occurs to ensure the Supabase client has the latest token.

**File**: `src/contexts/AuthContext.tsx`
- After detecting `SIGNED_IN` event, call `supabase.auth.refreshSession()` to ensure the latest token is used

### Step 3: Delay Query Execution Until User State is Confirmed
Add a small delay or use the session object directly from the auth event instead of relying on the context state.

**File**: `src/hooks/useUserInvitations.ts`
- Use `session?.user?.email` from the auth event directly if possible
- OR add a `staleTime: 0` to force fresh fetches

### Step 4: Add Debug Logging (Temporary)
Add console logging to track which email is being used for the invitation query to help diagnose if the issue persists.

## Implementation Details

### AuthContext Changes
```typescript
// In onAuthStateChange callback
if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
  // Clear ALL cached data to prevent stale user-specific data
  queryClient.clear();
  
  // Force refresh session to ensure latest token
  if (event === "SIGNED_IN" && session) {
    supabase.auth.refreshSession();
  }
}
```

### useUserInvitations Changes  
```typescript
const { data: invitations = [], isLoading } = useQuery({
  queryKey: ["user-invitations", user?.email],
  queryFn: async () => {
    if (!user?.email) return [];
    
    console.log("Fetching invitations for email:", user.email); // Debug log
    
    const { data, error } = await supabase
      .from("invitations")
      .select(...)
      .eq("status", "pending")
      .ilike("email", user.email)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    // ...
  },
  enabled: !!user?.email,
  staleTime: 0, // Always fetch fresh data
  refetchInterval: 30000,
});
```

## Files to Modify
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Use `queryClient.clear()` instead of `invalidateQueries()` and add session refresh |
| `src/hooks/useUserInvitations.ts` | Add `staleTime: 0` and debug logging |

## Testing Steps
1. Log in as `skywalkertdp@gmail.com`
2. Sign out completely  
3. Log in as `sipkeschoorstra@outlook.com`
4. Verify the notification bell appears with the pending invitation
5. Check browser console for debug log confirming correct email is being queried
6. Accept the invitation to confirm full flow works

## Alternative: Full Page Reload
If the above doesn't work, the nuclear option is to force a full page reload after sign-in:
```typescript
if (event === "SIGNED_IN") {
  window.location.reload();
}
```
This is less elegant but guarantees a fresh state. We should avoid this if possible.
