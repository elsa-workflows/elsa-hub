#!/usr/bin/env bash
# Apply the Stripe customer ref migration and RLS assertions on a scratch
# Postgres database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB_NAME="${STRIPE_REFS_TEST_DB:-stripe_customer_refs_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")

if [[ "${STRIPE_REFS_TEST_USE_SUDO_POSTGRES:-1}" != "0" ]]; then
  PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d postgres -c "CREATE DATABASE ${DB_NAME};"
else
  psql -v ON_ERROR_STOP=1 -X -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  psql -v ON_ERROR_STOP=1 -X -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

echo "=== apply academy scratch_prelude.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/academy/scratch_prelude.sql"

echo "=== apply stripe-customer-refs scratch_prelude.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/stripe-customer-refs/scratch_prelude.sql"

echo "=== apply 20261020200000_stripe_customer_refs.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261020200000_stripe_customer_refs.sql"

LIST_FUNCTIONS="SELECT n.nspname || '.' || p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' ORDER BY 1"
BEFORE="$("${PSQL[@]}" -tA -c "$LIST_FUNCTIONS")"

echo "=== apply rls.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/stripe-customer-refs/rls.sql"

echo "=== check the test left nothing behind in public ==="
AFTER="$("${PSQL[@]}" -tA -c "$LIST_FUNCTIONS")"
if [[ "$BEFORE" != "$AFTER" ]]; then
  echo "rls.sql left functions behind in public:" >&2
  diff <(echo "$BEFORE") <(echo "$AFTER") >&2 || true
  exit 1
fi

LEFTOVER_ROWS="$("${PSQL[@]}" -tA -c "SELECT (SELECT count(*) FROM public.org_stripe_customers) + (SELECT count(*) FROM public.user_stripe_customers) + (SELECT count(*) FROM auth.users) + (SELECT count(*) FROM public.organizations)")"
if [[ "$LEFTOVER_ROWS" != "0" ]]; then
  echo "rls.sql left $LEFTOVER_ROWS fixture row(s) behind" >&2
  exit 1
fi

echo "=== stripe_customer_refs scratch run finished ==="
