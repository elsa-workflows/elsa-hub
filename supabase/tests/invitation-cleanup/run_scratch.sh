#!/usr/bin/env bash
# Apply the invitation cleanup migration and its assertions on a scratch
# Postgres database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB_NAME="${INVITATION_CLEANUP_TEST_DB:-invitation_cleanup_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")

if [[ "${INVITATION_CLEANUP_TEST_USE_SUDO_POSTGRES:-1}" != "0" ]]; then
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

echo "=== apply invitation-cleanup scratch_prelude.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/invitation-cleanup/scratch_prelude.sql"

echo "=== seed pre-migration invitations ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/invitation-cleanup/seed_before_migration.sql"

echo "=== apply 20261030070000_invitation_cleanup.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030070000_invitation_cleanup.sql"

echo "=== apply the migration a second time (re-runnable) ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261030070000_invitation_cleanup.sql"

echo "=== apply cleanup.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/invitation-cleanup/cleanup.sql"

echo "=== invitation_cleanup scratch run finished ==="
