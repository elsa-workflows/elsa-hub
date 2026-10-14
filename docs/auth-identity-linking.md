# Auth identity linking (GitHub, Google, email)

Elsa Hub uses [Supabase Auth automatic identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) on project `tehhrjepyfnhmsgtwzkf`. This file is the in-repo description of how that behaves for Hub sign-in.

## What “same account” means

Purchases, entitlements and the `public.profiles` row are keyed by `auth.users.id`. When GitHub, Google and a magic-link / email identity share **one** `auth.users` row, the user lands on the same Hub profile.

`public.profiles` is created by `handle_new_user` on `auth.users` insert (`ON CONFLICT (user_id) DO UPDATE`). Linking another provider does **not** insert a second user, so no extra profile row is created.

## Automatic linking (unauthenticated sign-in)

When a visitor signs in with GitHub, Google or `signInWithOtp` (magic link):

1. Supabase looks for an existing `auth.users` row whose **verified** email matches the new identity.
2. If it finds one, it attaches the new identity to that user. Settings → Connected accounts then lists both providers. Credits stay attached.
3. If it does not find a verified match, it creates a new user (and a new profile).

Automatic linking does **not** run for SAML SSO identities.

### Verified vs unverified email

| Existing identity | Incoming identity | Result |
| --- | --- | --- |
| GitHub / Google with a verified email | Magic link or the other OAuth provider, same email | Same `auth.users.id`; both identities on that user |
| Magic link / confirmed email | GitHub or Google with the same verified email | Same user |
| Email/password **unconfirmed** (`mailer_autoconfirm: false`) | GitHub or Google with the same address | Supabase will not merge into the unverified row. It may drop the unconfirmed identity or create a separate user. The Hub callback shows a clear error when Auth returns `email_exists` / `identity_already_exists`. |
| Two OAuth providers whose emails differ | — | Two users. Manual linking from Settings is required (and only works while signed in). |

Unverified-email takeover is why Auth refuses to auto-link: an attacker could otherwise register an unconfirmed address and later claim someone else’s OAuth account.

## Manual linking (signed-in)

Settings → Connected accounts calls `linkIdentity()` for GitHub and Google (redirect `/auth/callback`). That attaches a **different** email to the current user when manual linking is enabled on the project. Disconnect requires at least one remaining method.

## What the UI does on failure

`src/lib/authErrors.ts` maps Auth / callback errors:

- Rate-limited magic link → wait and retry.
- `identity_already_exists` → this Google/GitHub identity belongs to another Hub user.
- `email_exists` / already registered → sign in with the method already on that email; verified addresses should have merged.
- Unverified email → confirm the inbox link first.

The login/signup screens and `/auth/callback` show those messages instead of a raw GoTrue string.

## Redirects

GitHub, Google, magic link and email confirmation all use `redirectTo` / `emailRedirectTo` = `{origin}/auth/callback`. After a session exists, the callback honours `sessionStorage.authRedirect` (from `?redirect=` on `/login`) or `/dashboard`.
