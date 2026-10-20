# Auth email templates (magic link, signup)

Microsoft 365 Safe Links (and similar scanners) pre-fetch the default Supabase confirmation URL, which is a GET to `/auth/v1/verify`. That call consumes the one-time token, so the real click fails with `otp_expired`.

Hub avoids that by never putting the verify URL in the email. The message links to a Hub page that does nothing on load. Only the user's click calls `supabase.auth.verifyOtp({ token_hash, type })`.

Because this uses `token_hash` instead of a PKCE `?code=` exchange, email links also work in a different browser from the one that requested them. OAuth (GitHub and Google) still uses PKCE on `/auth/callback` and still needs the same browser.

Change these templates in the Supabase Auth email settings for project `tehhrjepyfnhmsgtwzkf`. Use the confirmation link href exactly as follows.

## Magic Link (production default)

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Confirm signup (production default)

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

`SiteURL` must be the Hub origin for that environment. Optional query `redirect` is honoured by `/auth/confirm` when it is a same-site path; otherwise the page falls back to `/dashboard`.

Do not use `{{ .ConfirmationURL }}` for these two templates. That URL hits `/auth/v1/verify` and is what Safe Links consume.

## Preview origins: `{{ .RedirectTo }}`

`SiteURL` is a single project setting, usually production. A Magic Link or Confirm signup template that uses `SiteURL` therefore sends preview users to the production `/auth/confirm` page.

`{{ .RedirectTo }}` is filled from the request's `emailRedirectTo`. Hub sets that to `{origin}/auth/confirm` for magic-link and signup (not `/auth/callback`, and not the site root). A template of:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email
```

or, for signup:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup
```

then follows the origin that requested the email.

Tradeoff:

- `{{ .SiteURL }}` is the production default. One href, and `/auth/confirm` does not need to be on the Redirect URLs allow list when the template never uses `RedirectTo`. Preview users land on production confirm.
- `{{ .RedirectTo }}` supports preview origins, but only when both of these are true: (1) `emailRedirectTo` is `{origin}/auth/confirm` (Hub already sends that for magic-link and signup), and (2) each origin's `/auth/confirm` is on the Redirect URLs allow list. A loose allow list plus `RedirectTo` is an open-redirect risk. Keep `SiteURL` unless those two conditions are met.

### If `emailRedirectTo` is not on the allow list

GoTrue does not reject a `redirect_to` that is missing from the Redirect URLs allow list. It silently falls back to `SiteURL`. A `{{ .RedirectTo }}?token_hash=...` template then renders as `{SiteURL}?token_hash=...`, so the link lands on `/` (the home page) instead of `/auth/confirm`, and the user never gets the confirm button. Check the allow list before switching to `RedirectTo`.

`{{ .RedirectTo }}?token_hash=...` also assumes `emailRedirectTo` has no query string. If Hub ever adds one (for example `/auth/confirm?redirect=...`), the template would produce a second `?` and break the link. Switch the template to `&` in that case, or keep the query out of `emailRedirectTo`.

Keep `{origin}/auth/callback` on the Redirect URLs allow list for GitHub and Google regardless of which email template you use. The Hub confirm page talks to GoTrue from the browser; it does not need to be listed unless you switch the templates to `RedirectTo`.

## What `/auth/confirm` does

- It accepts only `type=email` and `type=signup`. `type=magiclink` (and `recovery` or anything else) is rejected with the generic sign-in error and `verifyOtp` is never called.
- On mount it strips `token_hash` and `type` from the address bar with `history.replaceState`, so analytics and browser history never record the token. The values stay in component state, so the button still works. `redirect` and the hash are kept.
- Nothing is verified until the user clicks Sign in or Confirm.
- After a successful verify it shows "Signed in as <email>. Not you? Sign out" for 3 seconds, then continues to the destination. Sign out there ends only this browser's session (local scope), cancels the pending navigation and returns to `/login`. If sign-out fails the page shows an error and stays.
- Redirect precedence: a stored `sessionStorage.authRedirect` (set when the user started from `/login?redirect=...`) wins over the `?redirect=` query, which wins over `/dashboard`. All are checked with `sanitizeAuthRedirect`. The stored value is consumed before `verifyOtp`, so a failed verification leaves a retry on `?redirect=` or `/dashboard`. This is a deliberate deviation from item 3 of the #32 R4 review, which asked for the query to win.
