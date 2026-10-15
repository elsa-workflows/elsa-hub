#!/usr/bin/env bash
# Apply academy migrations and RLS assertions on a scratch Postgres database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB_NAME="${ACADEMY_TEST_DB:-academy_schema_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")

if [[ -n "${ACADEMY_TEST_USE_SUDO_POSTGRES:-1}" ]]; then
  PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d "$DB_NAME")
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -X -d postgres -c "CREATE DATABASE ${DB_NAME};"
else
  psql -v ON_ERROR_STOP=1 -X -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"
  psql -v ON_ERROR_STOP=1 -X -d postgres -c "CREATE DATABASE ${DB_NAME};"
fi

echo "=== apply scratch_prelude.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/academy/scratch_prelude.sql"

echo "=== apply 20261015180000_academy_schema.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261015180000_academy_schema.sql"

echo "=== apply 20261015180100_academy_kits_storage.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261015180100_academy_kits_storage.sql"

echo "=== apply 20261015190000_academy_schema_r2.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261015190000_academy_schema_r2.sql"

echo "=== apply 20261015200000_academy_course_outline.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261015200000_academy_course_outline.sql"

echo "=== apply rls.sql ==="
"${PSQL[@]}" -f "$ROOT/supabase/tests/academy/rls.sql"

echo "=== academy scratch run finished ==="
