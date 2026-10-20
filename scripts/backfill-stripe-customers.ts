/**
 * One-off backfill of stored Stripe customer refs.
 *
 * Dry-run by default. Matching by email is allowed only here, and only scoped
 * per organization or per user. A Stripe customer is never shared across orgs.
 * Users never receive a customer whose metadata has organization_id.
 *
 * Usage:
 *   npx tsx scripts/backfill-stripe-customers.ts
 *   npx tsx scripts/backfill-stripe-customers.ts --fixture scripts/fixtures/stripe-customer-backfill.json
 *   npx tsx scripts/backfill-stripe-customers.ts --apply
 *
 * --fixture is for tests only and cannot be combined with --apply.
 * --apply reads live Hub rows and Stripe, and refuses unless STRIPE_SECRET_KEY
 * starts with sk_test_ or --live is set.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type BackfillStripeCustomer = {
  id: string;
  email?: string;
  livemode?: boolean;
  deleted?: boolean;
  metadata?: Record<string, string>;
};

export type BackfillSnapshot = {
  livemode: boolean;
  organizations: Array<{ id: string; adminEmails: string[] }>;
  users: Array<{ id: string; email: string }>;
  subscriptions: Array<{ organization_id: string; stripe_customer_id: string }>;
  existingOrgRefs: Array<{ organization_id: string; stripe_customer_id: string; livemode: boolean }>;
  existingUserRefs: Array<{ user_id: string; stripe_customer_id: string; livemode: boolean }>;
  stripeCustomers: BackfillStripeCustomer[];
};

export type BackfillFixture = BackfillSnapshot;

export type BackfillCounts = {
  dry_run: boolean;
  livemode: boolean;
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

export type BackfillOrgWrite = {
  organization_id: string;
  stripe_customer_id: string;
  livemode: boolean;
  email_masked: string;
};

export type BackfillUserWrite = {
  user_id: string;
  stripe_customer_id: string;
  livemode: boolean;
  email_masked: string;
};

export type BackfillPlan = {
  counts: BackfillCounts;
  orgWrites: BackfillOrgWrite[];
  userWrites: BackfillUserWrite[];
};

const DEFAULT_FIXTURE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/stripe-customer-backfill.json",
);

/** Mirrors isLiveStripeKey in supabase/functions/_shared/stripe-customer.ts (sk_live_ and rk_live_). */
export function isLiveStripeKey(key: string | undefined): boolean {
  return (key ?? "").startsWith("sk_live_") || (key ?? "").startsWith("rk_live_");
}

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

export function assertFixtureNotUsedForApply(apply: boolean, usedFixture: boolean): void {
  if (apply && usedFixture) {
    throw new Error("--apply cannot use a fixture; fixtures are for tests only");
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

function claimedIds(plan: BackfillPlan, snapshot: BackfillSnapshot): Set<string> {
  return new Set([
    ...snapshot.existingOrgRefs
      .filter((row) => row.livemode === snapshot.livemode)
      .map((row) => row.stripe_customer_id),
    ...snapshot.existingUserRefs
      .filter((row) => row.livemode === snapshot.livemode)
      .map((row) => row.stripe_customer_id),
    ...plan.orgWrites.map((row) => row.stripe_customer_id),
    ...plan.userWrites.map((row) => row.stripe_customer_id),
  ]);
}

function matchOrgCustomer(
  orgId: string,
  emails: string[],
  snapshot: BackfillSnapshot,
  claimed: Set<string>,
): { id: string; email?: string } | { skipShared: true } | null {
  // A subscription's customer id counts only when Stripe returns it in this
  // mode and it is not deleted: a test key never sees live ids, and a deleted
  // customer must not be stored as the org's customer.
  const fromSubscription = snapshot.subscriptions
    .filter((row) => row.organization_id === orgId && !claimed.has(row.stripe_customer_id))
    .map((row) => snapshot.stripeCustomers.find((customer) => customer.id === row.stripe_customer_id))
    .find((customer) => customer && !customer.deleted);
  if (fromSubscription) {
    return { id: fromSubscription.id, email: fromSubscription.email };
  }

  const emailSet = new Set(emails.map((email) => email.toLowerCase()));
  const metadataMatches = snapshot.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (customer.metadata?.organization_id !== orgId) return false;
    if (customer.email && !emailSet.has(customer.email.toLowerCase())) return false;
    return true;
  });
  if (metadataMatches.length === 1) {
    return { id: metadataMatches[0].id, email: metadataMatches[0].email };
  }

  const emailMatches = snapshot.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (!customer.email || !emailSet.has(customer.email.toLowerCase())) return false;
    if (customer.metadata?.user_id) return false;
    if (customer.metadata?.organization_id && customer.metadata.organization_id !== orgId) {
      return false;
    }
    return true;
  });

  if (emailMatches.length === 1) {
    return { id: emailMatches[0].id, email: emailMatches[0].email };
  }
  if (emailMatches.length > 1) {
    return { skipShared: true };
  }
  return null;
}

function matchUserCustomer(
  userId: string,
  email: string,
  snapshot: BackfillSnapshot,
  claimed: Set<string>,
): { id: string; email?: string } | { skipShared: true } | null {
  const metadataMatches = snapshot.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (customer.metadata?.organization_id) return false;
    return customer.metadata?.user_id === userId;
  });
  if (metadataMatches.length === 1) {
    return { id: metadataMatches[0].id, email: metadataMatches[0].email };
  }

  const emailMatches = snapshot.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if ((customer.email ?? "").toLowerCase() !== email.toLowerCase()) return false;
    if (customer.metadata?.organization_id) return false;
    if (customer.metadata?.user_id && customer.metadata.user_id !== userId) return false;
    return true;
  });

  if (emailMatches.length === 1) {
    return { id: emailMatches[0].id, email: emailMatches[0].email };
  }
  if (emailMatches.length > 1) {
    return { skipShared: true };
  }
  return null;
}

export function planStripeCustomerBackfill(
  snapshot: BackfillSnapshot,
  dryRun = true,
): BackfillPlan {
  const plan: BackfillPlan = {
    counts: {
      dry_run: dryRun,
      livemode: snapshot.livemode,
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

  const existingOrgs = new Set(
    snapshot.existingOrgRefs
      .filter((row) => row.livemode === snapshot.livemode)
      .map((row) => row.organization_id),
  );
  const existingUsers = new Set(
    snapshot.existingUserRefs
      .filter((row) => row.livemode === snapshot.livemode)
      .map((row) => row.user_id),
  );

  for (const org of snapshot.organizations) {
    plan.counts.orgs_scanned += 1;
    if (existingOrgs.has(org.id)) {
      plan.counts.orgs_already_stored += 1;
      continue;
    }

    const match = matchOrgCustomer(org.id, org.adminEmails, snapshot, claimedIds(plan, snapshot));
    if (!match) continue;
    if ("skipShared" in match) {
      plan.counts.orgs_skipped_shared += 1;
      continue;
    }

    plan.counts.orgs_matched += 1;
    plan.counts.orgs_would_write += 1;
    plan.orgWrites.push({
      organization_id: org.id,
      stripe_customer_id: match.id,
      livemode: snapshot.livemode,
      email_masked: match.email ? maskEmail(match.email) : "***",
    });
  }

  for (const user of snapshot.users) {
    plan.counts.users_scanned += 1;
    if (existingUsers.has(user.id)) {
      plan.counts.users_already_stored += 1;
      continue;
    }

    const match = matchUserCustomer(user.id, user.email, snapshot, claimedIds(plan, snapshot));
    if (!match) continue;
    if ("skipShared" in match) {
      plan.counts.users_skipped_shared += 1;
      continue;
    }

    plan.counts.users_matched += 1;
    plan.counts.users_would_write += 1;
    plan.userWrites.push({
      user_id: user.id,
      stripe_customer_id: match.id,
      livemode: snapshot.livemode,
      email_masked: maskEmail(user.email),
    });
  }

  return plan;
}

export function formatBackfillCounts(counts: BackfillCounts): string {
  return [
    `dry_run=${counts.dry_run}`,
    `livemode=${counts.livemode}`,
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

export function formatBackfillPlan(plan: BackfillPlan): string {
  const mappings = [
    ...plan.orgWrites.map((row) =>
      `org_write organization_id=${row.organization_id} livemode=${row.livemode} stripe_customer_id=${row.stripe_customer_id} email=${row.email_masked}`
    ),
    ...plan.userWrites.map((row) =>
      `user_write user_id=${row.user_id} livemode=${row.livemode} stripe_customer_id=${row.stripe_customer_id} email=${row.email_masked}`
    ),
  ];
  return [formatBackfillCounts(plan.counts), ...mappings].join("\n");
}

export function loadBackfillFixture(path = DEFAULT_FIXTURE): BackfillSnapshot {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<BackfillSnapshot> & {
    existingOrgRefs?: Array<{ organization_id: string; stripe_customer_id: string; livemode?: boolean }>;
    existingUserRefs?: Array<{ user_id: string; stripe_customer_id: string; livemode?: boolean }>;
  };
  const livemode = raw.livemode ?? false;
  return {
    livemode,
    organizations: raw.organizations ?? [],
    users: raw.users ?? [],
    subscriptions: raw.subscriptions ?? [],
    existingOrgRefs: (raw.existingOrgRefs ?? []).map((row) => ({
      ...row,
      livemode: row.livemode ?? livemode,
    })),
    existingUserRefs: (raw.existingUserRefs ?? []).map((row) => ({
      ...row,
      livemode: row.livemode ?? livemode,
    })),
    stripeCustomers: raw.stripeCustomers ?? [],
  };
}

type QueryResult = PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>;

type QueryBuilder = QueryResult & {
  eq: (column: string, value: string | boolean) => QueryBuilder;
  order: (column: string) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
};

type QueryClient = {
  from: (table: string) => { select: (columns: string) => QueryBuilder };
};

const PAGE_SIZE = 1000;

/**
 * Reads every row of a table. PostgREST caps a response (1000 rows by
 * default), so this pages with a stable order. A missing table or column is an
 * error, never an empty result: an empty read would silently skip customers.
 */
async function selectRows<T>(
  client: QueryClient,
  table: string,
  columns: string,
  orderBy: string,
  eq?: { column: string; value: string | boolean },
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client.from(table).select(columns);
    if (eq) query = query.eq(eq.column, eq.value);
    const { data, error } = await query.order(orderBy).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data as T[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function loadHubSnapshot(
  client: QueryClient,
  livemode: boolean,
): Promise<Omit<BackfillSnapshot, "stripeCustomers">> {
  const paidOrders = await selectRows<{ organization_id: string; created_by: string | null }>(
    client,
    "orders",
    "organization_id, created_by",
    "id",
    { column: "status", value: "paid" },
  );
  const billingProfiles = await selectRows<{ organization_id: string }>(
    client,
    "org_billing_profiles",
    "organization_id",
    "organization_id",
  );
  const subscriptions = await selectRows<{ organization_id: string; stripe_customer_id: string }>(
    client,
    "subscriptions",
    "organization_id, stripe_customer_id",
    "id",
  );
  const members = await selectRows<{ organization_id: string; user_id: string; role: string }>(
    client,
    "organization_members",
    "organization_id, user_id, role",
    "id",
  );
  const profiles = await selectRows<{ user_id: string; email: string | null }>(
    client,
    "profiles",
    "user_id, email",
    "user_id",
  );
  const trainingLeads = await selectRows<{ user_id: string | null }>(
    client,
    "training_leads",
    "user_id",
    "id",
  );
  const academyUsers = (await selectRows<{ user_id: string | null }>(
    client,
    "academy_entitlements",
    "user_id",
    "id",
    { column: "subject_type", value: "user" },
  )).filter((row): row is { user_id: string } => Boolean(row.user_id));
  const existingOrgRefs = await selectRows<{ organization_id: string; stripe_customer_id: string; livemode: boolean }>(
    client,
    "org_stripe_customers",
    "organization_id, stripe_customer_id, livemode",
    "organization_id",
  );
  const existingUserRefs = await selectRows<{ user_id: string; stripe_customer_id: string; livemode: boolean }>(
    client,
    "user_stripe_customers",
    "user_id, stripe_customer_id, livemode",
    "user_id",
  );

  const orgIds = new Set<string>([
    ...paidOrders.map((row) => row.organization_id),
    ...billingProfiles.map((row) => row.organization_id),
    ...subscriptions.map((row) => row.organization_id),
  ]);

  const emailByUser = new Map(
    profiles.filter((row) => row.email).map((row) => [row.user_id, row.email as string]),
  );

  const organizations = [...orgIds].map((id) => ({
    id,
    adminEmails: members
      .filter((row) => row.organization_id === id && (row.role === "admin" || row.role === "owner"))
      .map((row) => emailByUser.get(row.user_id))
      .filter((email): email is string => Boolean(email)),
  }));

  const userIds = new Set<string>([
    ...paidOrders.map((row) => row.created_by).filter((id): id is string => Boolean(id)),
    ...trainingLeads.map((row) => row.user_id).filter((id): id is string => Boolean(id)),
    ...academyUsers.map((row) => row.user_id),
    ...members
      .filter((row) => orgIds.has(row.organization_id) && (row.role === "admin" || row.role === "owner"))
      .map((row) => row.user_id),
  ]);

  const users = [...userIds]
    .map((id) => ({ id, email: emailByUser.get(id) }))
    .filter((row): row is { id: string; email: string } => Boolean(row.email));

  return {
    livemode,
    organizations,
    users,
    subscriptions,
    existingOrgRefs,
    existingUserRefs,
  };
}

export type StripeCustomerSource = {
  /** Every customer with exactly this email (Stripe's email filter is case-sensitive), across all pages. */
  listByEmail: (email: string) => Promise<BackfillStripeCustomer[]>;
  /** null when Stripe has no such customer in this mode. */
  retrieve: (id: string) => Promise<BackfillStripeCustomer | null>;
};

export async function loadStripeCustomers(
  source: StripeCustomerSource,
  emails: string[],
  customerIds: string[],
  livemode: boolean,
): Promise<BackfillStripeCustomer[]> {
  const queries = [...new Set(emails.flatMap((email) => [email, email.toLowerCase()]))];
  const found: BackfillStripeCustomer[] = [];
  const seen = new Set<string>();
  const add = (customer: BackfillStripeCustomer) => {
    if (seen.has(customer.id)) return;
    if (customer.livemode !== undefined && customer.livemode !== livemode) return;
    seen.add(customer.id);
    found.push(customer);
  };
  for (const email of queries) {
    for (const customer of await source.listByEmail(email)) add(customer);
  }
  for (const id of new Set(customerIds)) {
    if (seen.has(id)) continue;
    const customer = await source.retrieve(id);
    if (customer) add(customer);
  }
  return found;
}

type StripeApiCustomer = {
  id: string;
  email?: string | null;
  livemode?: boolean;
  deleted?: boolean;
  metadata?: Record<string, string>;
};

function toBackfillCustomer(customer: StripeApiCustomer): BackfillStripeCustomer {
  return {
    id: customer.id,
    email: customer.email ?? undefined,
    livemode: customer.livemode,
    deleted: customer.deleted,
    metadata: customer.metadata ?? {},
  };
}

function stripeApiSource(stripeKey: string): StripeCustomerSource {
  const get = (url: URL) => fetch(url, { headers: { Authorization: `Bearer ${stripeKey}` } });
  return {
    async listByEmail(email) {
      const customers: BackfillStripeCustomer[] = [];
      let startingAfter: string | undefined;
      for (;;) {
        const url = new URL("https://api.stripe.com/v1/customers");
        url.searchParams.set("email", email);
        url.searchParams.set("limit", "100");
        if (startingAfter) url.searchParams.set("starting_after", startingAfter);
        const response = await get(url);
        if (!response.ok) throw new Error(`Stripe customer list failed: ${response.status}`);
        const page = await response.json() as { data: StripeApiCustomer[]; has_more?: boolean };
        customers.push(...page.data.map(toBackfillCustomer));
        if (!page.has_more || page.data.length === 0) return customers;
        startingAfter = page.data[page.data.length - 1].id;
      }
    },
    async retrieve(id) {
      const response = await get(new URL(`https://api.stripe.com/v1/customers/${encodeURIComponent(id)}`));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Stripe customer retrieve failed: ${response.status}`);
      return toBackfillCustomer(await response.json() as StripeApiCustomer);
    },
  };
}

function parseArgs(argv: string[]) {
  const fixtureIndex = argv.indexOf("--fixture");
  const usedFixture = fixtureIndex >= 0;
  return {
    apply: argv.includes("--apply"),
    live: argv.includes("--live"),
    usedFixture,
    fixture: usedFixture && argv[fixtureIndex + 1]
      ? resolve(argv[fixtureIndex + 1])
      : DEFAULT_FIXTURE,
  };
}

async function loadRealSnapshot(livemode: boolean): Promise<BackfillSnapshot> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey || !stripeKey) {
    throw new Error("real backfill needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STRIPE_SECRET_KEY");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const hub = await loadHubSnapshot(supabase as unknown as QueryClient, livemode);
  const emails = [
    ...hub.organizations.flatMap((org) => org.adminEmails),
    ...hub.users.map((user) => user.email),
  ];
  const stripeCustomers = await loadStripeCustomers(
    stripeApiSource(stripeKey),
    emails,
    hub.subscriptions.map((row) => row.stripe_customer_id),
    livemode,
  );
  return { ...hub, stripeCustomers };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  assertApplyAllowed({
    apply: flags.apply,
    live: flags.live,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  });
  assertFixtureNotUsedForApply(flags.apply, flags.usedFixture);

  const livemode = isLiveStripeKey(process.env.STRIPE_SECRET_KEY);
  const snapshot = flags.usedFixture
    ? loadBackfillFixture(flags.fixture)
    : await loadRealSnapshot(livemode);
  const plan = planStripeCustomerBackfill(snapshot, !flags.apply);
  console.log(formatBackfillPlan(plan));

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

  let conflicts = 0;
  for (const row of plan.orgWrites) {
    const { error } = await supabase.from("org_stripe_customers").insert({
      organization_id: row.organization_id,
      livemode: row.livemode,
      stripe_customer_id: row.stripe_customer_id,
    });
    if (error?.code === "23505") conflicts += 1;
    else if (error) throw new Error(`org write failed: ${error.message}`);
  }
  for (const row of plan.userWrites) {
    const { error } = await supabase.from("user_stripe_customers").insert({
      user_id: row.user_id,
      livemode: row.livemode,
      stripe_customer_id: row.stripe_customer_id,
    });
    if (error?.code === "23505") conflicts += 1;
    else if (error) throw new Error(`user write failed: ${error.message}`);
  }
  // A conflict means a checkout stored a ref first (or the customer is already claimed); both are left as they are.
  console.log(`writes_skipped_existing=${conflicts}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
