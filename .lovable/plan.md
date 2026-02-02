
# Fix: Delete User Edge Function Error

## Problem Identified

The error **"Failed to send a request to the Edge Function"** is caused by using an unsupported method `auth.getClaims(token)` in the edge function. The error log shows:

```
Error: Deno.core.runMicrotasks() is not supported in this environment
```

The `getClaims` method is **not a standard Supabase Auth API** and fails at runtime in Deno/Edge Functions.

## Solution

Replace `auth.getClaims(token)` with `auth.getUser(token)` across all affected edge functions. This is the correct Supabase pattern for extracting user information from a JWT token in edge functions.

## Affected Files

| Edge Function | File |
|---------------|------|
| delete-user | `supabase/functions/delete-user/index.ts` |
| create-checkout-session | `supabase/functions/create-checkout-session/index.ts` |
| customer-portal | `supabase/functions/customer-portal/index.ts` |

## Changes Required

For each affected function, replace this pattern:

```typescript
// BEFORE (broken)
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub;
const userEmail = claimsData.claims.email;
```

With this corrected pattern:

```typescript
// AFTER (working)
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
if (userError || !user) { ... }
const userId = user.id;
const userEmail = user.email;
```

**Note**: For `getUser(token)` to work correctly, we should use a client created with the **service role key** rather than the anon key, since the service role has permission to validate any user's token.

## Implementation Steps

1. **Update delete-user function** - Replace getClaims with getUser, use service client for token validation
2. **Update create-checkout-session function** - Same fix
3. **Update customer-portal function** - Same fix
4. **Deploy and test** - Verify user deletion works correctly

## Expected Outcome

After this fix:
- The "Failed to send a request to the Edge Function" error will be resolved
- Admin user deletion will work correctly
- Checkout and customer portal flows will also be fixed (if they were affected)
