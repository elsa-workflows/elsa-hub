# Vendored from valence-works/elsa-control

- Repository: https://github.com/valence-works/elsa-control
- Path: `contracts/hosted-subscription/`
- Commit: `31469baea6aeb637402eb342f04976c143f95502`
- Goldens first landed in elsa-control#966; this copy is current `main`.

The JSON files and `README.md` in this directory are exact copies of the
upstream golden contracts. Do not edit them by hand. This `SOURCE.md` file
is Hub-only and is not an upstream file.

## Resync

```bash
SHA=$(git ls-remote https://github.com/valence-works/elsa-control.git refs/heads/main | cut -f1)
DEST=supabase/functions/_shared/contracts/hosted-subscription
for f in README.md active.json billing-status-active.json billing-status-no-linkage.json no-billing-linkage.json retained.json suspended-canceled.json suspended-deletion-requested.json suspended-non-payment.json; do
  curl -fsS -o "$DEST/$f" "https://raw.githubusercontent.com/valence-works/elsa-control/$SHA/contracts/hosted-subscription/$f"
done
# then set the commit SHA in this file to $SHA
```

## Optional live drift check

The pinned copies plus the state-mapping test in
`src/lib/cloud/hosted-subscription-contracts.test.ts` define Hub's contract
and run in the default `npx vitest run` suite.

A live byte-for-byte comparison against elsa-control `main` is opt-in, so a
default test run does not depend on another repo or the network. Run it with:

```bash
HUB_CONTRACT_DRIFT=1 npx vitest run src/lib/cloud/hosted-subscription-contracts.test.ts
```

If a fetch fails, returns a non-200, or exceeds the test's fetch budget, that
check is skipped rather than failed. Hub CI does not run vitest yet, so this
check is local-only until a vitest job exists.
