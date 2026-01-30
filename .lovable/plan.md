
# Multi-Provider Authentication Management

## Overview
Add a "Connected Accounts" section to the Profile Settings page where users can manage multiple authentication methods. This allows users who signed up with email/password to connect GitHub (and future providers), and users who signed up with GitHub to add email/password login.

## Architecture

### How It Works
Supabase's `user.identities` array contains all connected auth providers. We'll:
1. Read this array to show which providers are connected
2. Use `supabase.auth.linkIdentity()` to connect OAuth providers
3. Use `supabase.auth.updateUser({ password })` to add password auth for OAuth-only users
4. Use `supabase.auth.unlinkIdentity()` to disconnect providers (with safeguards)

### Provider Configuration
A centralized config makes adding future providers (Google, Microsoft, Apple) trivial:

```text
providers = [
  { id: "email", name: "Email & Password", icon: Mail },
  { id: "github", name: "GitHub", icon: Github },
  // Future: { id: "google", name: "Google", icon: ... }
]
```

---

## Implementation Steps

### 1. Create Connected Accounts Component
**File:** `src/components/settings/ConnectedAccountsCard.tsx`

A new card component that:
- Displays all available auth providers with their connection status
- Shows "Connected" badge with disconnect option for linked providers
- Shows "Connect" button for unlinked providers
- Includes a form to set up email/password for OAuth-only users

### 2. Create Auth Providers Hook
**File:** `src/hooks/useAuthProviders.ts`

A custom hook that:
- Reads `user.identities` to determine connected providers
- Provides `linkProvider(providerId)` function for OAuth linking
- Provides `unlinkProvider(identity)` function with safety checks
- Provides `setupEmailPassword(password)` for adding password auth
- Handles loading and error states

### 3. Update Auth Context
**File:** `src/contexts/AuthContext.tsx`

Add new methods to the context:
- `linkOAuthProvider(provider)` - Initiates OAuth linking flow
- `getUserIdentities()` - Returns user's connected identities

### 4. Create Set Password Dialog
**File:** `src/components/settings/SetPasswordDialog.tsx`

A dialog for OAuth-only users to add email/password login:
- Password and confirm password fields
- Validation (min 6 chars, matching passwords)
- Uses `supabase.auth.updateUser({ password })`

### 5. Update Profile Settings Page
**File:** `src/pages/dashboard/settings/ProfileSettings.tsx`

Add the new Connected Accounts section between the account info and the sign out button.

### 6. Handle OAuth Linking Callback
**File:** `src/pages/auth/AuthCallback.tsx`

Update to handle identity linking callbacks:
- Detect `type=link` in URL hash
- Show appropriate success/error message
- Redirect back to profile settings

---

## UI Design

```text
+-----------------------------------------------+
|  Connected Accounts                           |
|  Manage your login methods                    |
+-----------------------------------------------+
|                                               |
|  [Mail Icon]  Email & Password                |
|  you@example.com                              |
|  [Connected ✓] or [Set Up Password]           |
|                                               |
|  -------------------------------------------- |
|                                               |
|  [GitHub Icon]  GitHub                        |
|  Not connected                                |
|  [Connect GitHub]                             |
|                                               |
+-----------------------------------------------+
```

---

## Technical Details

### Provider Detection Logic
```text
hasEmailProvider = identities.some(i => i.provider === "email")
hasGitHubProvider = identities.some(i => i.provider === "github")
```

### Safety Rules
- Users must have at least one provider connected (prevent lockout)
- Show warning when disconnecting the last provider
- Require re-authentication for sensitive operations (future enhancement)

### OAuth Linking Flow
1. User clicks "Connect GitHub"
2. Call `supabase.auth.linkIdentity({ provider: 'github' })`
3. User is redirected to GitHub for authorization
4. On return, AuthCallback detects linking and shows success
5. User is redirected back to Profile Settings

---

## Files to Create
1. `src/components/settings/ConnectedAccountsCard.tsx` - Main UI component
2. `src/components/settings/SetPasswordDialog.tsx` - Password setup dialog
3. `src/hooks/useAuthProviders.ts` - Hook for provider management
4. `src/components/settings/index.ts` - Export barrel file

## Files to Modify
1. `src/contexts/AuthContext.tsx` - Add linking methods
2. `src/pages/dashboard/settings/ProfileSettings.tsx` - Add connected accounts section
3. `src/pages/auth/AuthCallback.tsx` - Handle linking callbacks

---

## Extensibility for Future Providers
Adding a new provider (e.g., Google) requires only:
1. Enable the provider in Supabase dashboard
2. Add entry to the providers config array
3. No other code changes needed

