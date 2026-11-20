# Vendored from valence-works/elsa-control

- Repository: https://github.com/valence-works/elsa-control
- Path: `contracts/hosted-subscription/`
- Commit: `245458150620b4baf30b318b24029f0fc22a7068`
- Landed in elsa-control#966

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
