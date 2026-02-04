
# Add User Display Name to Profile Settings

## Overview
Allow users to optionally set their first name or display name. The database already has a `display_name` column in the `profiles` table, but there's no UI to edit it. This feature will add an editable name field to the Profile Settings page.

---

## Current State

| Aspect | Status |
|--------|--------|
| Database column `display_name` | Exists (text, nullable) |
| Current values | All null for existing users |
| Edit UI | None |
| RLS policy for update | Already allows users to update own profile |

---

## Implementation Plan

### Step 1: Create useUserProfile Hook

Create a new hook `src/hooks/useUserProfile.ts` that:
- Fetches the current user's profile from the `profiles` table
- Provides a mutation to update `display_name`
- Uses React Query for caching and invalidation

```text
File: src/hooks/useUserProfile.ts

Exports:
- useUserProfile() hook
  - profile: { display_name, email, avatar_url }
  - isLoading: boolean
  - updateProfile(data): mutation
  - isUpdating: boolean
```

---

### Step 2: Update ProfileSettings Page

Modify `src/pages/dashboard/settings/ProfileSettings.tsx` to:
- Fetch the user profile using the new hook
- Add an editable "Display Name" field
- Show email as the primary identifier, with display name as optional personalization
- Include a save button that updates the profile

**UI Changes:**

| Before | After |
|--------|-------|
| Email (read-only) | Display Name (editable input) |
| Member since (read-only) | Email (read-only) |
| Notifications link | Member since (read-only) |
| Sign out button | Notifications link |
|  | Sign out button |

---

### Step 3: UI Design

The name field will appear in a new "Personal Info" section above the account details:

```text
┌─────────────────────────────────────────────┐
│  Personal Info                              │
│  ─────────────────────────────────────────  │
│  Display Name (optional)                    │
│  ┌─────────────────────────────────────┐    │
│  │ John                                │    │
│  └─────────────────────────────────────┘    │
│  How your name appears to team members      │
│                                             │
│  [Save Changes]                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Your Account                               │
│  ─────────────────────────────────────────  │
│  📧 Email: user@example.com                 │
│  📅 Member since: January 15, 2026          │
│  🔔 Notifications: Manage email preferences │
│                                             │
│  [Sign out]                                 │
└─────────────────────────────────────────────┘
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useUserProfile.ts` | Create | Hook for fetching/updating user profile |
| `src/pages/dashboard/settings/ProfileSettings.tsx` | Update | Add editable display name field |

---

## Technical Details

### useUserProfile Hook Structure

```text
Query:
  SELECT display_name, email, avatar_url 
  FROM profiles 
  WHERE user_id = auth.uid()

Mutation:
  UPDATE profiles 
  SET display_name = ?, updated_at = now() 
  WHERE user_id = auth.uid()
```

The hook will follow the same pattern as `useBillingProfile`:
- React Query for data fetching with `queryKey: ["user-profile", userId]`
- useMutation for updates with optimistic invalidation
- Toast notifications for success/error feedback

### Form Handling

Using react-hook-form with zod validation (consistent with existing patterns):

```text
Schema:
  display_name: z.string().max(100).optional()

Form behavior:
  - Pre-populate with existing display_name
  - Trim whitespace before saving
  - Convert empty string to null
```

---

## Where Display Name is Already Used

The `display_name` is already consumed in these places (no changes needed):

- Team member lists in organizations
- Provider team member lists
- Work log performer displays
- Notification emails

Once users set their display name, it will automatically appear in these locations instead of their email.
