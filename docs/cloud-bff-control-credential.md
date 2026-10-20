# Cloud BFF credential for Elsa Control

## What it is

`cloud-bff` sends the header `X-Elsa-Bff-Credential` on every call to Elsa Control. Control uses it only to pick the BFF rate-limit partition for Hub account sessions (valence-works/elsa-control#862). It grants no access: Control still authenticates and authorizes every call on the Hub session token.

## Function secret

- Name: `ELSA_CONTROL_BFF_CREDENTIAL`, a Supabase Edge Function secret on the elsa-hub project.
- The operator sets it, for staging and production, through the normal operator path. No CI job writes it, and the value never goes in this repo.
- The value must match Control's Key Vault secret `RateLimiting-BffCredentials-hub-Secret`. Enter it with no trailing newline.
- The value is never logged, returned or put in an error message. `createControlFetch` in `supabase/functions/_shared/cloud-control.ts` sets the header itself, after any caller headers, so a caller can't supply or override it.
- If the secret is unset or empty, no header is sent and Control treats the calls as an ordinary per-IP caller. Nothing fails.

## Rotation

1. In Control, set the new value as `Secret` and the old one as `PreviousSecret` for source `hub`, then refresh the Key Vault references.
2. Update `ELSA_CONTROL_BFF_CREDENTIAL` on this project to the new value.
3. Confirm on Control that Hub BFF calls still log source `hub` in the rate-limiting diagnostic.
4. Remove `PreviousSecret` in Control.
