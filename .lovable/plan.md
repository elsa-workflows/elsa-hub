

# Security Review: Data Isolation & Access Control

A comprehensive security audit focused on ensuring users cannot access other users' and organizations' data unless authorized.

---

## Summary

The security posture is **good overall** with proper RLS on most tables. However, there are **4 critical issues** and **3 moderate issues** that should be addressed before going live.

---

## Critical Issues

### 1. `intro_call_requests` Table Has RLS Disabled

**Risk**: HIGH - Anyone on the internet can read all intro call requests containing:
- Full names, email addresses, company names
- Business details (project stage, current usage, interests)
- Contact information that could be used for phishing/spam

**Current State**: `relrowsecurity: false` - RLS is completely disabled

**Fix Required**:
```sql
ALTER TABLE intro_call_requests ENABLE ROW LEVEL SECURITY;
```

The existing policies will then take effect (they're already defined but RLS is disabled).

---

### 2. Profiles Table Exposes All Emails to Authenticated Users

**Risk**: HIGH - Any authenticated user can enumerate all user emails

**Current Policy**: 
```sql
"Authenticated users can view profiles" - USING (true)
```

**Fix Required**: Restrict visibility to only users within the same organization or provider:
```sql
-- Replace with scoped visibility
DROP POLICY "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Users can view profiles in their organizations"
ON profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_members pm1
    JOIN provider_members pm2 ON pm1.service_provider_id = pm2.service_provider_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.user_id
  )
  OR EXISTS (
    SELECT 1 FROM provider_customers pc
    JOIN organization_members om ON om.organization_id = pc.organization_id
    JOIN provider_members pm ON pm.service_provider_id = pc.service_provider_id
    WHERE (om.user_id = profiles.user_id AND pm.user_id = auth.uid())
       OR (pm.user_id = profiles.user_id AND om.user_id = auth.uid())
  )
);
```

---

### 3. Invitation Token Exposed in Notifications Payload

**Risk**: HIGH - If any user's notification is compromised, invitation tokens are leaked

**Location**: `send-invitation/index.ts` line 254-255:
```typescript
payload: {
  token: token_value,  // Plaintext token stored in notifications table
}
```

**Fix Required**: Remove the plaintext token from the notification payload. The `action_url` already contains the token for the legitimate invitee.

---

### 4. Edge Functions Without Auth Protection

**Risk**: MEDIUM-HIGH - Some edge functions are callable without authentication

**Affected Functions**:
| Function | Auth | Risk |
|----------|------|------|
| `create-notification` | None | Anyone can create notifications for any user |
| `send-notification` | None | Anyone can trigger email sends |
| `send-broadcast` | None | Anyone can send newsletters to all subscribers |

**Fix Required**: Add authentication checks or restrict to service role only.

---

## Moderate Issues

### 5. `credit_bundles` Publicly Readable (Stripe Price IDs Exposed)

**Risk**: MEDIUM - Competitors can see pricing strategy and Stripe configuration

**Current Policy**: `"Anyone can view active bundles" - USING (is_active = true)` with `roles: {public}`

**Fix**: Change to require authentication:
```sql
DROP POLICY "Anyone can view active bundles" ON credit_bundles;
CREATE POLICY "Authenticated users can view active bundles"
ON credit_bundles FOR SELECT TO authenticated
USING (is_active = true);
```

---

### 6. Invitation Token Readable by Org Admins

**Risk**: MEDIUM - Org admins can see tokens for invitations they sent, which could be exploited if an admin account is compromised

**Current Policy**: Invitations are readable including the `token` field

**Fix**: Use the `invitations_secure` view (already exists but has no policies) or create a function that excludes the token field.

---

### 7. `unsubscribe_tokens` Table Has No Policies

**Risk**: LOW - Table is inaccessible but edge function uses service role, so it works. However, should have explicit policies for clarity.

---

## Security Strengths

The following are implemented correctly:

| Area | Status | Notes |
|------|--------|-------|
| Credit isolation | ✅ SECURE | Credits scoped by org + provider membership |
| Work logs | ✅ SECURE | Only visible to org members or provider members |
| Orders/Invoices | ✅ SECURE | Properly scoped to org or provider members |
| Audit events | ✅ SECURE | Admin-only access per entity |
| Subscriptions | ✅ SECURE | Scoped to org or provider |
| Organization data | ✅ SECURE | Members-only with proper RLS |
| Provider data | ✅ SECURE | Provider members only |
| Edge function auth | ✅ SECURE | Checkout, portal, invitation functions verify caller identity |
| Webhook security | ✅ SECURE | Stripe signature verification implemented |
| Token hashing | ✅ SECURE | Invitation tokens hashed with SHA-256 |

---

## Implementation Plan

### Phase 1: Critical (Before Launch)

| Task | Files | Priority |
|------|-------|----------|
| Enable RLS on `intro_call_requests` | Migration | CRITICAL |
| Restrict profiles visibility | Migration | CRITICAL |
| Remove token from notification payload | `send-invitation/index.ts` | CRITICAL |
| Add auth to `create-notification` | Edge function | CRITICAL |
| Add auth to `send-notification` | Edge function | CRITICAL |
| Add auth to `send-broadcast` | Edge function | CRITICAL |

### Phase 2: Recommended

| Task | Files | Priority |
|------|-------|----------|
| Require auth for credit_bundles SELECT | Migration | MEDIUM |
| Hide invitation token from SELECT results | Migration + view | MEDIUM |
| Add policies to unsubscribe_tokens | Migration | LOW |
| Enable leaked password protection | Supabase Auth settings | LOW |

---

## Recommendation

Address the **Critical** issues before launching. The core financial data (credits, orders, work logs) is properly protected, but the user data exposure in `intro_call_requests` and `profiles` tables presents a significant privacy risk.

