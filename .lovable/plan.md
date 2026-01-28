

# Plan: Clickable Bundle Cards with Direct Purchase Flow

## Overview

Transform the bundle cards on the Expert Services page to be directly clickable, initiating the purchase flow for the selected bundle. The "Purchase Credits" button will be removed, and the dialog will open with the clicked bundle pre-selected.

## User Flow

```text
+------------------+     +----------------+     +------------------+
| User clicks      | --> | Authenticated? | --> | Dialog opens     |
| bundle card      |     |                |     | with bundle      |
+------------------+     +-------+--------+     | pre-selected     |
                               |                +------------------+
                               | No
                               v
                     +------------------+     +------------------+
                     | Redirect to      | --> | After login,     |
                     | /login?redirect= |     | return to page   |
                     | /enterprise/     |     | & auto-open      |
                     | expert-services  |     | dialog           |
                     | &bundleId=xxx    |     +------------------+
                     +------------------+
```

## Implementation Steps

### 1. Update ExpertServices.tsx

**Changes:**
- Add state for the pre-selected bundle ID: `selectedBundleId`
- Make each bundle card clickable with an `onClick` handler
- Add visual feedback (cursor-pointer, hover effects) to indicate cards are interactive
- Remove the "Purchase Credits" button and its container div
- Pass the `selectedBundleId` to `PurchaseBundleDialog` as a new prop
- On page load, check URL params for `bundleId` to auto-open the dialog (for returning from login)

### 2. Update PurchaseBundleDialog.tsx

**Changes:**
- Accept a new optional prop: `preSelectedBundleId?: string`
- When the dialog opens with a `preSelectedBundleId`, automatically select that bundle
- Use a `useEffect` to sync the pre-selected bundle when the dialog opens
- Keep existing behavior for org selection and admin checks

### 3. Update Login.tsx

**Changes:**
- Extract `redirect` query parameter from URL
- After successful login, navigate to the redirect URL instead of "/"
- Handle both email/password login and GitHub OAuth redirects

### 4. Update AuthContext.tsx (if needed)

**Changes:**
- Ensure the OAuth redirect URL includes the original redirect parameter for GitHub login

---

## Technical Details

### ExpertServices.tsx Changes

```typescript
// New state
const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);

// Check URL params on mount for returning from login
useEffect(() => {
  const bundleId = searchParams.get("bundleId");
  if (bundleId) {
    setSelectedBundleId(bundleId);
    setPurchaseDialogOpen(true);
    // Clean up URL
    setSearchParams((prev) => {
      prev.delete("bundleId");
      return prev;
    });
  }
}, []);

// Bundle card click handler
const handleBundleClick = (bundle: CreditBundle) => {
  setSelectedBundleId(bundle.id);
  setPurchaseDialogOpen(true);
};

// Card gets onClick and cursor styling
<Card
  onClick={() => handleBundleClick(bundle)}
  className="cursor-pointer ..."
>
```

### PurchaseBundleDialog.tsx Changes

```typescript
interface PurchaseBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedBundleId?: string | null;
}

// Auto-select bundle when dialog opens
useEffect(() => {
  if (open && preSelectedBundleId && bundles) {
    const bundle = bundles.find(b => b.id === preSelectedBundleId);
    if (bundle) setSelectedBundle(bundle);
  }
}, [open, preSelectedBundleId, bundles]);

// For unauthenticated users, redirect to login with return URL
if (!user) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      ...
      <Button onClick={() => {
        const returnUrl = `/enterprise/expert-services${preSelectedBundleId ? `?bundleId=${preSelectedBundleId}` : ''}`;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      }}>Sign In</Button>
    </Dialog>
  );
}
```

### Login.tsx Changes

```typescript
const [searchParams] = useSearchParams();
const redirectTo = searchParams.get("redirect") || "/";

// In onSubmit success handler:
navigate(redirectTo);

// For GitHub OAuth, store redirect in sessionStorage before OAuth
const handleGitHubLogin = async () => {
  if (redirectTo !== "/") {
    sessionStorage.setItem("authRedirect", redirectTo);
  }
  // ... existing code
};
```

### AuthContext.tsx Changes

```typescript
// After OAuth callback, check for stored redirect
useEffect(() => {
  // On auth state change to logged in
  const redirect = sessionStorage.getItem("authRedirect");
  if (redirect) {
    sessionStorage.removeItem("authRedirect");
    navigate(redirect);
  }
}, [user]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/enterprise/ExpertServices.tsx` | Add click handlers to bundle cards, remove Purchase Credits button, pass pre-selected bundle to dialog |
| `src/components/organization/PurchaseBundleDialog.tsx` | Accept `preSelectedBundleId` prop, auto-select bundle, update login redirect with return URL |
| `src/pages/Login.tsx` | Handle `redirect` query param, navigate to redirect URL after login |
| `src/contexts/AuthContext.tsx` | Handle redirect after OAuth login using sessionStorage |

## Edge Cases Handled

- **User not logged in**: Redirected to login with return URL containing bundle ID
- **User has no organization**: Dialog shows "create organization" prompt (existing behavior)
- **User is not org admin**: Dialog shows admin-required warning (existing behavior)
- **Bundle not configured** (no Stripe price): Card shows visual indication, click still works but purchase button disabled
- **Direct URL access with bundleId param**: Dialog auto-opens with bundle pre-selected

