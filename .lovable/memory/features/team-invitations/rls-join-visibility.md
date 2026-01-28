# Memory: features/team-invitations/rls-join-visibility
Updated: 2026-01-28

## Issue
When querying invitations with a JOIN to the `organizations` table, invitees could not see their pending invitations because:
1. The `organizations` table RLS only allowed viewing if the user was already a member, creator, or provider customer
2. Invitees are NOT members yet—they only become members after accepting the invitation
3. Using `organizations!inner` in the Supabase query caused the entire row to be filtered out

## Solution
Two changes were required:

### 1. Add RLS Policy on Organizations Table
Allow invitees to view organizations they have pending invitations for:
```sql
CREATE POLICY "Invitees can view organizations they are invited to" 
ON organizations 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM invitations
    WHERE invitations.organization_id = organizations.id
      AND lower(invitations.email) = lower((auth.jwt() ->> 'email'::text))
      AND invitations.status = 'pending'
      AND invitations.expires_at > now()
  )
);
```

### 2. Remove `!inner` Join Modifier
Change the Supabase query from `organizations!inner(name, slug)` to `organizations(name, slug)` to allow nullable results (though with the RLS fix, data will be returned).

## Key Insight
When implementing invitation/join flows, always consider that the invitee needs visibility into the resource they're being invited to BEFORE they accept. This requires explicit RLS policies granting pre-membership access for pending invitations.
