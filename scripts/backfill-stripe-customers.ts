/**
 * One-off backfill of stored Stripe customer refs.
 *
 * Dry-run by default. Matching by email is allowed only here, and only scoped
 * per organization or per user. A Stripe customer is never shared across orgs.
 *
 * Usage:
 *   npx tsx scripts/backfill-stripe-customers.ts
 *   npx tsx scripts/backfill-stripe-customers.ts --fixture scripts/fixtures/stripe-customer-backfill.json
 *   npx tsx scripts/backfill-stripe-customers.ts --apply
 *
 * --apply refuses unless STRIPE_SECRET_KEY starts with sk_test_ or --live is set.
 * This script does not call live Stripe unless --apply is allowed and no fixture
 * is in use. Default dry-run uses the fixture Stripe client only.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type BackfillStripeCustomer = {
  id: string;
  email?: string;
  metadata?: Record<string, string>;
};

export type BackfillFixture = {
  organizations: Array<{ id: string; name?: string; adminEmails: string[] }>;
  users: Array<{ id: string; email: string }>;
  subscriptions: Array<{ organization_id: string; stripe_customer_id: string }>;
  existingOrgRefs: Array<{ organization_id: string; stripe_customer_id: string }>;
  existingUserRefs: Array<{ user_id: string; stripe_customer_id: string }>;
  stripeCustomers: BackfillStripeCustomer[];
};

export type BackfillCounts = {
  dry_run: boolean;
  orgs_scanned: number;
  orgs_already_stored: number;
  orgs_matched: number;
  orgs_would_write: number;
  orgs_skipped_shared: number;
  users_scanned: number;
  users_already_stored: number;
  users_matched: number;
  users_would_write: number;
  users_skipped_shared: number;
};

export type BackfillPlan = {
  counts: BackfillCounts;
  orgWrites: Array<{ organization_id: string; stripe_customer_id: string }>;
  userWrites: Array<{ user_id: string; stripe_customer_id: string }>;
};

const DEFAULT_FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/stripe-customer-backfill.json",
);

export function assertApplyAllowed(options: {
  apply: boolean;
  live: boolean;
  stripeSecretKey?: string;
}): void {
  if (!options.apply) return;
  if (options.live) return;
  const key = options.stripeSecretKey ?? "";
  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "--apply refused: STRIPE_SECRET_KEY must start with sk_test_ or pass --live",
    );
  }
}

function claimedIds(plan: BackfillPlan, fixture: BackfillFixture): Set<string> {
  return new Set([
    ...fixture.existingOrgRefs.map((row) => row.stripe_customer_id),
    ...fixture.existingUserRefs.map((row) => row.stripe_customer_id),
    ...plan.orgWrites.map((row) => row.stripe_customer_id),
    ...plan.userWrites.map((row) => row.stripe_customer_id),
  ]);
}

function matchOrgCustomer(
  orgId: string,
  emails: string[],
  fixture: BackfillFixture,
  claimed: Set<string>,
): { id: string } | { skipShared: true } | null {
  const fromSubscription = fixture.subscriptions.find(
    (row) => row.organization_id === orgId && !claimed.has(row.stripe_customer_id),
  );
  if (fromSubscription) {
    return { id: fromSubscription.stripe_customer_id };
  }

  const emailSet = new Set(emails.map((email) => email.toLowerCase()));
  const metadataMatches = fixture.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (customer.metadata?.organization_id !== orgId) return false;
    if (customer.email && !emailSet.has(customer.email.toLowerCase())) return false;
    return true;
  });
  if (metadataMatches.length === 1) {
    return { id: metadataMatches[0].id };
  }

  const emailMatches = fixture.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (!customer.email || !emailSet.has(customer.email.toLowerCase())) return false;
    if (customer.metadata?.user_id) return false;
    if (customer.metadata?.organization_id && customer.metadata.organization_id !== orgId) {
      return false;
    }
    return true;
  });

  if (emailMatches.length === 1) {
    return { id: emailMatches[0].id };
  }
  if (emailMatches.length > 1) {
    return { skipShared: true };
  }
  return null;
}

function matchUserCustomer(
  userId: string,
  email: string,
  fixture: BackfillFixture,
  claimed: Set<string>,
): { id: string } | { skipShared: true } | null {
  const metadataMatches = fixture.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    return customer.metadata?.user_id === userId;
  });
  if (metadataMatches.length === 1) {
    return { id: metadataMatches[0].id };
  }

  const emailMatches = fixture.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if ((customer.email ?? "").toLowerCase() !== email.toLowerCase()) return false;
    if (customer.metadata?.organization_id) return false;
    if (customer.metadata?.user_id && customer.metadata.user_id !== userId) return false;
    return true;
  });

  if (emailMatches.length === 1) {
    return { id: emailMatches[0].id };
  }
  if (emailMatches.length > 1) {
    return { skipShared: true };
  }
  return null;
}

export function planStripeCustomerBackfill(
  fixture: BackfillFixture,
  dryRun = true,
): BackfillPlan {
  const plan: BackfillPlan = {
    counts: {
      dry_run: dryRun,
      orgs_scanned: 0,
      orgs_already_stored: 0,
      orgs_matched: 0,
      orgs_would_write: 0,
      orgs_skipped_shared: 0,
      users_scanned: 0,
      users_already_stored: 0,
      users_matched: 0,
      users_would_write: 0,
      users_skipped_shared: 0,
    },
    orgWrites: [],
    userWrites: [],
  };

  const existingOrgs = new Set(fixture.existingOrgRefs.map((row) => row.organization_id));
  const existingUsers = new Set(fixture.existingUserRefs.map((row) => row.user_id));

  for (const org of fixture.organizations) {
    plan.counts.orgs_scanned += 1;
    if (existingOrgs.has(org.id)) {
      plan.counts.orgs_already_stored += 1;
      continue;
    }

    const match = matchOrgCustomer(org.id, org.adminEmails, fixture, claimedIds(plan, fixture));
    if (!match) continue;
    if ("skipShared" in match) {
      plan.counts.orgs_skipped_shared += 1;
      continue;
    }

    plan.counts.orgs_matched += 1;
    plan.counts.orgs_would_write += 1;
    plan.orgWrites.push({ organization_id: org.id, stripe_customer_id: match.id });
  }

  for (const user of fixture.users) {
    plan.counts.users_scanned += 1;
    if (existingUsers.has(user.id)) {
      plan.counts.users_already_stored += 1;
      continue;
    }

    const match = matchUserCustomer(user.id, user.email, fixture, claimedIds(plan, fixture));
    if (!match) continue;
    if ("skipShared" in match) {
      plan.counts.users_skipped_shared += 1;
      continue;
    }

    plan.counts.users_matched += 1;
    plan.counts.users_would_write += 1;
    plan.userWrites.push({ user_id: user.id, stripe_customer_id: match.id });
  }

  return plan;
}

export function formatBackfillCounts(counts: BackfillCounts): string {
  return [
    `dry_run=${counts.dry_run}`,
    `orgs_scanned=${counts.orgs_scanned}`,
    `orgs_already_stored=${counts.orgs_already_stored}`,
    `orgs_matched=${counts.orgs_matched}`,
    `orgs_would_write=${counts.orgs_would_write}`,
    `orgs_skipped_shared=${counts.orgs_skipped_shared}`,
    `users_scanned=${counts.users_scanned}`,
    `users_already_stored=${counts.users_already_stored}`,
    `users_matched=${counts.users_matched}`,
    `users_would_write=${counts.users_would_write}`,
    `users_skipped_shared=${counts.users_skipped_shared}`,
  ].join("\n");
}

export function loadBackfillFixture(path = DEFAULT_FIXTURE): BackfillFixture {
  return JSON.parse(readFileSync(path, "utf8")) as BackfillFixture;
}

function parseArgs(argv: string[]) {
  const flags = {
    apply: argv.includes("--apply"),
    live: argv.includes("--live"),
    fixture: DEFAULT_FIXTURE,
  };
  const fixtureIndex = argv.indexOf("--fixture");
  if (fixtureIndex >= 0 && argv[fixtureIndex + 1]) {
    flags.fixture = resolve(argv[fixtureIndex + 1]);
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  assertApplyAllowed({
    apply: flags.apply,
    live: flags.live,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  });

  if (flags.apply && !flags.live && !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")) {
    throw new Error("--apply refused");
  }

  const fixture = loadBackfillFixture(flags.fixture);
  const plan = planStripeCustomerBackfill(fixture, !flags.apply);
  console.log(formatBackfillCounts(plan.counts));

  if (!flags.apply) {
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("--apply needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  for (const row of plan.orgWrites) {
    const { error } = await supabase.from("org_stripe_customers").insert(row);
    if (error && error.code !== "23505") {
      throw new Error(`org write failed: ${error.message}`);
    }
  }
  for (const row of plan.userWrites) {
    const { error } = await supabase.from("user_stripe_customers").insert(row);
    if (error && error.code !== "23505") {
      throw new Error(`user write failed: ${error.message}`);
    }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
