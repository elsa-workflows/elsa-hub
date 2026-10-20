# Auth identity linking (GitHub, Google, email)

Elsa Hub uses [Supabase Auth automatic identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) on project `tehhrjepyfnhmsgtwzkf`. This file is the in-repo description of how that behaves for Hub sign-in.

## What "same account" means

Purchases, entitlements and the `public.profiles` row are keyed by `auth.users.id`. When GitHub, Google and a magic-link / email identity share **one** `auth.users` row, the user lands on the same Hub profile.

`public.profiles` is created by `handle_new_user` on `auth.users` insert (`ON CONFLICT (user_id) DO UPDATE`). Linking another provider does **not** insert a second user, so no extra profile row is created.

## Automatic linking (unauthenticated sign-in)

When a visitor signs in with GitHub, Google or `signInWithOtp` (magic link):

1. Supabase looks for an existing `auth.users` row whose email matches the new identity.
2. If it finds one, it attaches the new identity to that user. To stop pre-account takeover it **removes unconfirmed identities** from the existing user, rather than refusing to link. Settings → Connected accounts then lists the remaining providers. Credits stay attached.
3. If it does not find a matching row, it creates a new user (and a new profile).

Automatic linking does **not** run for SAML SSO identities.

Linking also requires the incoming provider's email to be verified. Account takeover through an unverified email is not possible at the Supabase level, because unconfirmed identities on the existing user are stripped.

An email/password signup for an address that already has an OAuth user returns an obfuscated success and sends no email. That is the anti-enumeration behaviour. It also means this flow never returns `email_exists`; the Hub callback mapping for that code is mostly unreachable here.

### Verified vs unverified email

| Existing identity | Incoming identity | Result |
| --- | --- | --- |
| GitHub / Google with a verified email | Magic link or the other OAuth provider, same email | Same `auth.users.id`; both identities on that user |
| Magic link / confirmed email | GitHub or Google with the same verified email | Same user |
| Email/password **unconfirmed** (`mailer_autoconfirm: false`) | GitHub or Google with the same address | The OAuth identity is attached to the existing user. The unconfirmed password identity is dropped. This is not `email_exists` and does not create a second user. |
| Two OAuth providers whose emails differ | n/a | Two users. Manual linking from Settings is required (and only works while signed in). |

## Manual linking (signed-in)

Settings → Connected accounts calls `linkIdentity()` for GitHub and Google (redirect `/auth/callback`). That attaches a **different** email to the current user when manual linking is enabled on the project. Disconnect requires at least one remaining method.

## What the UI does on failure

`src/lib/authErrors.ts` maps Auth / callback errors:

- Rate-limited magic link → wait and retry.
- `identity_already_exists` → this Google/GitHub identity belongs to another Hub user.
- `email_exists` / already registered → sign in with the method already on that email. Automatic linking by email means this code is rarely returned for GitHub, Google, or magic-link sign-in.
- Unverified email → confirm the inbox link first.

The login/signup screens, `/auth/callback`, and `/auth/confirm` show those mapped messages instead of a raw GoTrue string or a URL `error_description`. Expired or already-used email links (`otp_expired`, and a used PKCE auth code) show: "This link has expired, request a new one."

## Email links vs PKCE

Magic link and signup confirmation emails must use `/auth/confirm?token_hash=...&type=...` as described in `docs/auth-email-templates.md`. That click-to-verify page is not consumed by Safe Links, and it does not need a PKCE code verifier, so those emails work in any browser.

GitHub and Google still use `flowType: "pkce"` and `{origin}/auth/callback`. A missing code verifier there still maps to: "Open the link in the same browser where you requested it." A server exchange failure for an expired or already-used `code` maps to the expired-link message, not the same-browser hint.

## Redirects

GitHub and Google use `redirectTo` = `{origin}/auth/callback`. After a session exists, the callback honours a validated same-site `sessionStorage.authRedirect` (from `?redirect=` on `/login`) or `/dashboard`. Magic-link and signup send `emailRedirectTo` = `{origin}/auth/confirm`. `/auth/confirm` accepts only `type=email` and `type=signup` (`type=magiclink` is rejected) and strips `token_hash` and `type` from the URL on mount. It consumes `sessionStorage.authRedirect` before `verifyOtp` so AuthContext's SIGNED_IN handler cannot race, then continues to that stored path, else an optional same-site `redirect` query, else `/dashboard`. The stored path winning over `?redirect=` is deliberate (a deviation from #32 R4 item 3). After verifying it shows "Signed in as {email}. Not you? Sign out" for 3 seconds before navigating. Details and the allow-list caveats are in `docs/auth-email-templates.md`.
