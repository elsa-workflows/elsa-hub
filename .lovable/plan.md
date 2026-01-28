
# Smart Dashboard Redirect After Login

## Problem Analysis

When you log in, the app may try to redirect you back to a specific organization URL (like `/dashboard/org/some-slug`) that was saved from a previous session. If you're a different user, or the organization no longer exists in your memberships, you see the "Organization Not Found" error.

**Root cause**: The login redirect preserves the full URL path, including organization-specific slugs that may not be valid for the current user.

## Proposed Solution

Implement a **smart redirect system** that:
1. After login, always land on `/dashboard` first
2. The Dashboard Home page then intelligently auto-redirects based on your actual memberships
3. Improve the auto-redirect logic to work for more scenarios

## Implementation Steps

### Step 1: Improve Auto-Redirect Logic in DashboardHome

Current behavior only auto-redirects if you have **exactly 1 org and 0 providers**. We'll enhance this to:
- Auto-redirect to the first org if you have **1 or more orgs and 0 providers**
- Auto-redirect to the first provider if you have **0 orgs and 1 or more providers**
- Keep the selector page only when you have **both orgs and providers** (true multi-context)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Login Successful                         │
│                          │                                  │
│                          ▼                                  │
│                    /dashboard                               │
│                          │                                  │
│              ┌───────────┴───────────┐                      │
│              │   Fetch Memberships   │                      │
│              └───────────┬───────────┘                      │
│                          │                                  │
│          ┌───────────────┼───────────────┐                  │
│          ▼               ▼               ▼                  │
│    Only Orgs?      Both Types?     Only Providers?          │
│          │               │               │                  │
│          ▼               ▼               ▼                  │
│   Auto-redirect    Show Selector   Auto-redirect            │
│   to first org         Page        to first provider        │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: Clear Stale Organization State on Auth Change

When users switch accounts, we should clear the `selected_organization` from localStorage to prevent stale data. This happens in the `AuthContext` on `SIGNED_IN` and `SIGNED_OUT` events.

### Step 3: Handle Invalid Org/Provider Gracefully

Update the "Not Found" experience in `OrgOverview` (and similar provider pages) to automatically redirect back to `/dashboard` after a short delay, or provide a clearer path forward.

---

## Technical Details

### File Changes

**1. `src/pages/dashboard/DashboardHome.tsx`**
- Modify auto-redirect logic:
  - If `organizations.length >= 1` AND `providers.length === 0`: redirect to first org
  - If `organizations.length === 0` AND `providers.length >= 1`: redirect to first provider
  - Otherwise (both exist): show the selector page

**2. `src/contexts/AuthContext.tsx`**
- Add `localStorage.removeItem("selected_organization")` on `SIGNED_IN` and `SIGNED_OUT` events to clear stale organization context

**3. `src/pages/dashboard/org/OrgOverview.tsx`** (optional enhancement)
- Add an auto-redirect after 3 seconds when "Organization Not Found" is shown
- Or simply make the "Go to Dashboard" button more prominent

---

## Expected Behavior After Implementation

| Scenario | Current Behavior | New Behavior |
|----------|------------------|--------------|
| Login with 1 org, 0 providers | Auto-redirect to org | Same (unchanged) |
| Login with 2+ orgs, 0 providers | Show selector | Auto-redirect to first org |
| Login with 0 orgs, 1+ providers | Show selector | Auto-redirect to first provider |
| Login with 1+ orgs AND 1+ providers | Show selector | Same (unchanged) |
| Different user logs in with stale localStorage | May see "Not Found" | Cleared state, clean redirect |

This approach ensures a smooth landing experience after login while still respecting the multi-context selector when users genuinely need to choose between organization and provider roles.
