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

Keep `{origin}/auth/callback` on the Redirect URLs allow list for GitHub and Google regardless of which email template you use. The Hub confirm page talks to GoTrue from the browser; it does not need to be listed unless you switch the templates to `RedirectTo`.
