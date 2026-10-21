#!/usr/bin/env bash
# Apply the Hub → Control organization link migration and RLS assertions
# on a scratch Postgres database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB_NAME="${CLOUD_LINK_TEST_DB:-cloud_organization_links_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")

if [[ "${CLOUD_LINK_TEST_USE_SUDO_POSTGRES:-1}" != "0" ]]; then
  PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d postgres -c "CREATE DATABASE ${DB_NAME};"
else
  psql -v ON_ERROR_STOP=1 -X -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  psql -v ON_ERROR_STOP=1 -X -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

echo "=== apply academy scratch_prelude.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/academy/scratch_prelude.sql"

echo "=== apply cloud-organization-links scratch_prelude.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/cloud-organization-links/scratch_prelude.sql"

echo "=== apply 20261016023351_cloud_organization_links.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261016023351_cloud_organization_links.sql"

echo "=== apply rls.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/cloud-organization-links/rls.sql"

echo "=== cloud_organization_links scratch run finished ==="
