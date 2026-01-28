

# Plan: Improve Email Signup and Confirmation UX

## Overview

Improve the user experience for email-based signup by:
1. Redirecting users to a "Check your email" page after signing up
2. Creating an activation callback page that confirms their account is now active

## Current Flow vs. New Flow

```text
CURRENT FLOW:
User signs up → Toast "Account created!" → Redirect to Home
               (User doesn't know they need to confirm email)

User clicks email link → Redirect to Home (no feedback)

NEW FLOW:
User signs up → Redirect to /signup/confirm-email
               (Clear message: "Check your inbox, also check spam")

User clicks email link → Redirect to /auth/callback
                        (Shows "Account activated!" with login button)
```

## Implementation Steps

### Step 1: Create Confirm Email Page

Create a new page at `/signup/confirm-email` that:
- Displays a clear message about checking their inbox
- Shows the email address they registered with (passed via query param)
- Reminds them to check spam/junk folder
- Provides a link to go back to login

**UI Elements:**
- Mail icon in a circular container
- "Check your email" title
- Description explaining the confirmation email was sent
- Tip about checking spam folder
- "Back to Sign In" button

### Step 2: Create Auth Callback Page

Create a new page at `/auth/callback` that:
- Handles the Supabase email confirmation redirect
- Detects the `type` parameter from the URL (Supabase passes `type=signup` for confirmations)
- Shows "Account Activated" success message
- Provides a button to sign in
- Handles edge cases (invalid/expired links)

The auth callback will use Supabase's `exchangeCodeForSession` or parse the URL hash to complete the verification.

### Step 3: Update Signup Flow

Modify `Signup.tsx` to:
- After successful signup, redirect to `/signup/confirm-email?email={email}` instead of `/`
- Remove the immediate "success" toast (since account isn't fully created yet)

### Step 4: Update Auth Context

Modify `AuthContext.tsx` to:
- Change `emailRedirectTo` in signUp to point to `/auth/callback` instead of root
- This ensures Supabase redirects to our callback page after email confirmation

### Step 5: Add Routes

Update `App.tsx` to:
- Add route for `/signup/confirm-email`
- Add route for `/auth/callback`

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/signup/ConfirmEmail.tsx` | Create | "Check your inbox" page |
| `src/pages/auth/AuthCallback.tsx` | Create | Email confirmation callback handler |
| `src/pages/Signup.tsx` | Modify | Redirect to confirm-email page after signup |
| `src/contexts/AuthContext.tsx` | Modify | Update emailRedirectTo URL |
| `src/App.tsx` | Modify | Add new routes |

## Page Designs

### Confirm Email Page (`/signup/confirm-email`)

- Centered card layout (matching existing auth pages)
- Mail envelope icon with primary color background circle
- Title: "Check your email"
- Description: "We've sent a confirmation link to **{email}**. Click the link in the email to activate your account."
- Info box: "Didn't receive the email? Check your spam folder, or try signing up again."
- Button: "Back to Sign In" (links to `/login`)

### Auth Callback Page (`/auth/callback`)

Shows different states:
1. **Loading**: Spinner while processing the callback
2. **Success**: Green checkmark, "Account Activated!", "Your email has been verified and your account is now active.", "Sign In" button
3. **Error**: Red X icon, error message, "Go to Home" button

## Technical Details

### Supabase Email Confirmation Flow

When a user clicks the confirmation link from their email:
1. Supabase redirects to `{emailRedirectTo}#access_token=...&type=signup...`
2. The hash fragment contains the auth tokens
3. The app needs to call `supabase.auth.getSession()` or let the auth listener handle it
4. The `type=signup` parameter indicates this is an email confirmation (vs password reset, etc.)

### AuthCallback Implementation

```typescript
// Pseudocode for auth callback
useEffect(() => {
  // Get type from URL hash (Supabase puts params in hash)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const type = hashParams.get('type');
  const error = hashParams.get('error');
  
  if (error) {
    setStatus('error');
    return;
  }
  
  // The auth listener will automatically pick up the session
  // We just need to detect when auth state changes to SIGNED_IN
  if (type === 'signup') {
    // This is an email confirmation
    setStatus('activated');
  }
}, []);
```

## Edge Cases Handled

- **Invalid/expired link**: Show error message with link to sign up again
- **Already confirmed**: User is already logged in, show success and redirect
- **Network errors**: Show error state with retry option
- **Missing email in query param**: Show generic message without specific email

