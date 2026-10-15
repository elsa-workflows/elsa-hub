// Local service_role grant of a PRIVATE Gumroad sales CSV.
// Usage: npx tsx scripts/academy-gumroad-migrate.ts <csv-path> [--dry-run]
// Never commit the export. Output is counts only; emails are not printed.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import { mapGumroadCsv } from "../src/lib/academy/gumroadMigrate";

type GrantOutcome = "granted" | "pending" | "already_granted" | "already_pending";

function parseArgs(argv: string[]): { csvPath: string; dryRun: boolean } {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((arg) => arg !== "--dry-run");
  if (positional.length !== 1) {
    console.error("Usage: npx tsx scripts/academy-gumroad-migrate.ts <csv-path> [--dry-run]");
    process.exit(2);
  }
  return { csvPath: positional[0], dryRun };
}

function isGrantOutcome(value: string | null): value is GrantOutcome {
  return (
    value === "granted" ||
    value === "pending" ||
    value === "already_granted" ||
    value === "already_pending"
  );
}

async function main() {
  const { csvPath, dryRun } = parseArgs(process.argv);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(2);
  }

  const csvText = readFileSync(csvPath, "utf8");
  const mapped = mapGumroadCsv(csvText);
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const counts = {
    dry_run: dryRun ? "yes" : "no",
    rows_read: mapped.rowsRead,
    mapped: mapped.mapped.length,
    granted_now: 0,
    pending_inserted: 0,
    already_granted: 0,
    already_pending: 0,
    team_pending: 0,
    redemptions_linked: mapped.redemptionsLinked,
    redemptions_unmapped: mapped.redemptionsUnmapped,
    skipped_unmapped: mapped.skippedUnmapped,
    skipped_invalid: mapped.skippedInvalid,
    rpc_errors: 0,
  };

  for (const sale of mapped.mapped) {
    const { data, error } = await supabase.rpc("academy_grant_gumroad_sale", {
      p_email: sale.email,
      p_product_code: sale.productCode,
      p_seats: sale.seats,
      p_gumroad_sale_id: sale.gumroadSaleId,
      p_organization_name_hint: sale.organizationNameHint ?? undefined,
      p_counts_against_sale_id: sale.countsAgainstSaleId ?? undefined,
      p_kind: sale.kind,
      p_dry_run: dryRun,
    });

    if (error || !isGrantOutcome(data)) {
      counts.rpc_errors += 1;
      continue;
    }

    if (sale.kind === "team" && (data === "pending" || data === "already_pending")) {
      counts.team_pending += 1;
    }

    if (data === "granted") {
      counts.granted_now += 1;
    } else if (data === "pending") {
      counts.pending_inserted += 1;
    } else if (data === "already_granted") {
      counts.already_granted += 1;
    } else {
      counts.already_pending += 1;
    }
  }

  for (const [key, value] of Object.entries(counts)) {
    console.log(`${key}: ${value}`);
  }
}

void main();
