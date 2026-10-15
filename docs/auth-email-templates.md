# Auth email templates (magic link, signup, recovery)

Microsoft 365 Safe Links (and similar scanners) pre-fetch the default Supabase confirmation URL, which is a GET to `/auth/v1/verify`. That call consumes the one-time token, so the real click fails with `otp_expired`.

Hub avoids that by never putting the verify URL in the email. The message links to a Hub page that does nothing on load. Only the user's click calls `supabase.auth.verifyOtp({ token_hash, type })`.

Because this uses `token_hash` instead of a PKCE `?code=` exchange, email links also work in a different browser from the one that requested them. OAuth (GitHub and Google) still uses PKCE on `/auth/callback` and still needs the same browser.

Change these templates in the Supabase Auth email settings for project `tehhrjepyfnhmsgtwzkf`. Use the confirmation link href exactly as follows.

## Magic Link

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

## Confirm signup

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

## Reset password

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

`SiteURL` must be the Hub origin (production or the matching preview origin). Optional query `redirect` is honoured by `/auth/confirm` when it is a same-site path; otherwise the page falls back to `/dashboard`. Recovery navigates to `/reset-password` after a successful verify.

Do not use `{{ .ConfirmationURL }}` for these three templates. That URL hits `/auth/v1/verify` and is what Safe Links consume.

`/auth/confirm` does not need to be on the Supabase Redirect URLs allow list. The Hub page talks to GoTrue from the browser. Keep `{origin}/auth/callback` on that list for GitHub and Google.
