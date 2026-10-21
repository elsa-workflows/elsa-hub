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
 * --apply reads live Hub rows and Stripe. Without --live it requires an explicit
 * test key (sk_test_ or rk_test_); a live or unrecognised key is refused.
 *
 * Every customer id on a subscription row is reserved for the org(s) on that
 * row and is never matched to another org or a user by metadata or email. An
 * org whose subscription customer names another org in its metadata is skipped
 * with metadata_conflicts_subscription, and so is an org that such a customer
 * (on another org's row) names, but only when that org has no other candidate
 * of its own: an unclaimed metadata or admin-email customer is written first. An org that a customer still names but whose
 * customer another owner holds is skipped with customers_claimed_elsewhere, so
 * no org with a candidate customer ends with neither a write nor a skip line.
 *
 * A customer with no organization_id that matches only through an admin email
 * that several orgs (not already stored in this mode) share belongs to none of
 * them by email: every such org is skipped with ambiguous_customers, whatever
 * order the orgs are scanned in.
 *
 * Orgs that share a subscription customer, or whose customers cannot be told
 * apart, are skipped and listed as org_skipped lines for a human to resolve.
 *
 * Users mirror the org path: metadata.user_id is trusted and the user's email
 * only breaks ties; several candidates skip the user with ambiguous_customers;
 * a candidate that another owner holds (or that an org was skipped over, so a
 * human decides it) skips the user with customers_claimed_elsewhere. Each is
 * printed as a user_skipped line, so no user with a candidate ends with neither
 * a write nor a skip line.
 *
 * Stripe customers are loaded by every admin and user email (both cases), by
 * metadata['organization_id'] for every Hub org (Stripe customer search, so a
 * buyer whose email changed or who left is still found), and by the customer id
 * on every subscription row. Only customers in the run's mode are kept, and
 * deleted customers are dropped.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripeKeyMode } from "../supabase/functions/_shared/stripe-customer.ts";

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
  orgs_skipped_ambiguous: number;
  orgs_skipped_claimed: number;
  orgs_skipped_metadata_conflict: number;
  users_scanned: number;
  users_already_stored: number;
  users_matched: number;
  users_would_write: number;
  users_skipped_ambiguous: number;
  users_skipped_claimed: number;
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

/** An org left alone for a human to resolve; the Stripe customer ids are what to look at. */
export type BackfillSkippedOrg = {
  organization_id: string;
  reason:
    | "shared_subscription_customer"
    | "ambiguous_customers"
    | "metadata_conflicts_subscription"
    | "customers_claimed_elsewhere";
  stripe_customer_ids: string[];
};

/** A user left alone for a human to resolve, with the Stripe customer ids to look at. */
export type BackfillSkippedUser = {
  user_id: string;
  reason: "ambiguous_customers" | "customers_claimed_elsewhere";
  stripe_customer_ids: string[];
};

export type BackfillPlan = {
  counts: BackfillCounts;
  skippedOrgs: BackfillSkippedOrg[];
  skippedUsers: BackfillSkippedUser[];
  orgWrites: BackfillOrgWrite[];
  userWrites: BackfillUserWrite[];
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
  // Without --live only an explicit test key passes; a missing, live or
  // unrecognised key is refused.
  let mode: "live" | "test" | null = null;
  try {
    mode = key ? stripeKeyMode(key) : null;
  } catch {
    mode = null;
  }
  if (mode !== "test") {
    throw new Error(
      "--apply refused: STRIPE_SECRET_KEY must be a test key (sk_test_ or rk_test_) or pass --live",
    );
  }
}

/** The mode of the key the run uses; strict, so an unrecognised or missing key throws instead of meaning test mode. */
export function backfillLivemode(key: string | undefined): boolean {
  return stripeKeyMode(key ?? "") === "live";
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

/** Subscription customer ids that more than one org uses, with the orgs involved. */
function sharedSubscriptionCustomers(snapshot: BackfillSnapshot): Map<string, string[]> {
  const orgsByCustomer = new Map<string, Set<string>>();
  for (const row of snapshot.subscriptions) {
    const orgs = orgsByCustomer.get(row.stripe_customer_id) ?? new Set<string>();
    orgs.add(row.organization_id);
    orgsByCustomer.set(row.stripe_customer_id, orgs);
  }
  return new Map(
    [...orgsByCustomer]
      .filter(([, orgs]) => orgs.size > 1)
      .map(([customerId, orgs]) => [customerId, [...orgs]]),
  );
}

/** Every customer id on a subscription row is reserved for the org(s) on that row. */
function subscriptionCustomerIds(snapshot: BackfillSnapshot): Set<string> {
  return new Set(snapshot.subscriptions.map((row) => row.stripe_customer_id));
}

function claimedIds(plan: BackfillPlan, snapshot: BackfillSnapshot, shared: Map<string, string[]>): Set<string> {
  return new Set([
    ...shared.keys(),
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

type OrgMatch = { id: string; email?: string } | { skip: BackfillSkippedOrg["reason"]; ids: string[] } | null;

/** Claims plus every subscription customer: only the subscription path may hand those out. */
function withReservedSubscriptionCustomers(claimed: Set<string>, snapshot: BackfillSnapshot): Set<string> {
  return new Set([...claimed, ...subscriptionCustomerIds(snapshot)]);
}

/** Lower-cased admin email -> the orgs (not already stored in this mode) that list it. */
function orgsByAdminEmail(snapshot: BackfillSnapshot, storedOrgs: Set<string>): Map<string, Set<string>> {
  const orgs = new Map<string, Set<string>>();
  for (const org of snapshot.organizations) {
    if (storedOrgs.has(org.id)) continue;
    for (const email of org.adminEmails) {
      const key = email.toLowerCase();
      orgs.set(key, (orgs.get(key) ?? new Set<string>()).add(org.id));
    }
  }
  return orgs;
}

function matchOrgCustomer(
  orgId: string,
  emails: string[],
  snapshot: BackfillSnapshot,
  claimed: Set<string>,
  adminEmailOrgs: Map<string, Set<string>>,
): OrgMatch {
  // A subscription's customer id counts only when Stripe returns it in this
  // mode, it is not deleted, and its metadata does not name another org: a
  // test key never sees live ids, a deleted customer must not be stored, and
  // the server-written organization_id outranks a subscription row. When the
  // only usable-looking customer names another org, the org is skipped for a
  // human instead of falling through to metadata or email matching.
  const subscriptionCustomers = snapshot.subscriptions
    .filter((row) => row.organization_id === orgId && !claimed.has(row.stripe_customer_id))
    .map((row) => snapshot.stripeCustomers.find((customer) => customer.id === row.stripe_customer_id))
    .filter((customer) => customer && !customer.deleted);
  const fromSubscription = subscriptionCustomers.find((customer) =>
    !customer!.metadata?.organization_id || customer!.metadata.organization_id === orgId
  );
  if (fromSubscription) {
    return { id: fromSubscription.id, email: fromSubscription.email };
  }
  if (subscriptionCustomers.length > 0) {
    return {
      skip: "metadata_conflicts_subscription",
      ids: subscriptionCustomers.map((customer) => customer!.id),
    };
  }

  // Every subscription customer is reserved for the org(s) on its row, so the
  // matching below never hands one to another org.
  claimed = withReservedSubscriptionCustomers(claimed, snapshot);

  // The server writes metadata.organization_id, so it is trusted even when the
  // buyer's email is no longer an admin's. Email only breaks ties.
  const emailSet = new Set(emails.map((email) => email.toLowerCase()));
  const metadataMatches = snapshot.stripeCustomers.filter((customer) =>
    !claimed.has(customer.id) && customer.metadata?.organization_id === orgId
  );
  if (metadataMatches.length === 1) {
    return { id: metadataMatches[0].id, email: metadataMatches[0].email };
  }
  if (metadataMatches.length > 1) {
    const byAdminEmail = metadataMatches.filter((customer) =>
      customer.email && emailSet.has(customer.email.toLowerCase())
    );
    if (byAdminEmail.length === 1) {
      return { id: byAdminEmail[0].id, email: byAdminEmail[0].email };
    }
    return { skip: "ambiguous_customers", ids: metadataMatches.map((customer) => customer.id) };
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

  // A customer matched only by an admin email that another org also lists
  // could be either org's, so neither gets it; otherwise scan order decides.
  const contended = emailMatches.some((customer) =>
    (adminEmailOrgs.get(customer.email!.toLowerCase())?.size ?? 0) > 1
  );
  if (emailMatches.length === 1 && !contended) {
    return { id: emailMatches[0].id, email: emailMatches[0].email };
  }
  if (emailMatches.length > 0) {
    return { skip: "ambiguous_customers", ids: emailMatches.map((customer) => customer.id) };
  }

  // A customer on another org's subscription row that names this org stays
  // reserved for that row, so it must not make this org vanish: report it.
  const namedBySubscriptionOfOtherOrg = snapshot.stripeCustomers.filter((customer) =>
    !customer.deleted && customer.metadata?.organization_id === orgId &&
    snapshot.subscriptions.some((row) =>
      row.stripe_customer_id === customer.id && row.organization_id !== orgId
    )
  );
  if (namedBySubscriptionOfOtherOrg.length > 0) {
    return {
      skip: "metadata_conflicts_subscription",
      ids: namedBySubscriptionOfOtherOrg.map((customer) => customer.id),
    };
  }

  // Nothing is left for this org. If a customer still names it (its own
  // subscription, its metadata, its admin email) and was only unavailable
  // because another owner holds it, report the org instead of dropping it.
  const ownSubscriptionIds = new Set(
    snapshot.subscriptions.filter((row) => row.organization_id === orgId).map((row) => row.stripe_customer_id),
  );
  const heldElsewhere = snapshot.stripeCustomers.filter((customer) => {
    if (customer.deleted) return false;
    if (ownSubscriptionIds.has(customer.id) || customer.metadata?.organization_id === orgId) return true;
    return !!customer.email && emailSet.has(customer.email.toLowerCase()) && !customer.metadata?.user_id &&
      !customer.metadata?.organization_id;
  });
  if (heldElsewhere.length > 0) {
    return { skip: "customers_claimed_elsewhere", ids: heldElsewhere.map((customer) => customer.id) };
  }
  return null;
}

type UserMatch = { id: string; email?: string } | { skip: BackfillSkippedUser["reason"]; ids: string[] } | null;

function matchUserCustomer(
  userId: string,
  email: string,
  snapshot: BackfillSnapshot,
  claimed: Set<string>,
): UserMatch {
  claimed = withReservedSubscriptionCustomers(claimed, snapshot);
  const hasUserEmail = (customer: BackfillStripeCustomer) =>
    (customer.email ?? "").toLowerCase() === email.toLowerCase();

  // metadata.user_id is server-written, so it is trusted; email only breaks ties.
  const metadataMatches = snapshot.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (customer.metadata?.organization_id) return false;
    return customer.metadata?.user_id === userId;
  });
  if (metadataMatches.length === 1) {
    return { id: metadataMatches[0].id, email: metadataMatches[0].email };
  }
  if (metadataMatches.length > 1) {
    const byEmail = metadataMatches.filter(hasUserEmail);
    if (byEmail.length === 1) {
      return { id: byEmail[0].id, email: byEmail[0].email };
    }
    return { skip: "ambiguous_customers", ids: metadataMatches.map((customer) => customer.id) };
  }

  const emailMatches = snapshot.stripeCustomers.filter((customer) => {
    if (claimed.has(customer.id)) return false;
    if (!hasUserEmail(customer)) return false;
    if (customer.metadata?.organization_id) return false;
    if (customer.metadata?.user_id && customer.metadata.user_id !== userId) return false;
    return true;
  });

  if (emailMatches.length === 1) {
    return { id: emailMatches[0].id, email: emailMatches[0].email };
  }
  if (emailMatches.length > 1) {
    return { skip: "ambiguous_customers", ids: emailMatches.map((customer) => customer.id) };
  }

  // Nothing is left for this user. If its own metadata customer or a bare
  // customer with its email is unavailable only because another owner holds
  // it (or an org was skipped over it), report the user instead of dropping it.
  const heldElsewhere = snapshot.stripeCustomers.filter((customer) => {
    if (customer.deleted || customer.metadata?.organization_id) return false;
    return customer.metadata?.user_id === userId || (!customer.metadata?.user_id && hasUserEmail(customer));
  });
  if (heldElsewhere.length > 0) {
    return { skip: "customers_claimed_elsewhere", ids: heldElsewhere.map((customer) => customer.id) };
  }
  return null;
}

export function planStripeCustomerBackfill(
  snapshot: BackfillSnapshot,
  dryRun = true,
): BackfillPlan {
  const plan: BackfillPlan = {
    skippedOrgs: [],
    skippedUsers: [],
    counts: {
      dry_run: dryRun,
      livemode: snapshot.livemode,
      orgs_scanned: 0,
      orgs_already_stored: 0,
      orgs_matched: 0,
      orgs_would_write: 0,
      orgs_skipped_shared: 0,
      orgs_skipped_ambiguous: 0,
      orgs_skipped_claimed: 0,
      orgs_skipped_metadata_conflict: 0,
      users_scanned: 0,
      users_already_stored: 0,
      users_matched: 0,
      users_would_write: 0,
      users_skipped_ambiguous: 0,
      users_skipped_claimed: 0,
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

  const shared = sharedSubscriptionCustomers(snapshot);
  const adminEmailOrgs = orgsByAdminEmail(snapshot, existingOrgs);

  for (const org of snapshot.organizations) {
    plan.counts.orgs_scanned += 1;
    if (existingOrgs.has(org.id)) {
      plan.counts.orgs_already_stored += 1;
      continue;
    }

    // Every org that uses a shared subscription customer is left to a human.
    const sharedIds = [...shared]
      .filter(([, orgIds]) => orgIds.includes(org.id))
      .map(([customerId]) => customerId);
    if (sharedIds.length > 0) {
      plan.counts.orgs_skipped_shared += 1;
      plan.skippedOrgs.push({
        organization_id: org.id,
        reason: "shared_subscription_customer",
        stripe_customer_ids: sharedIds,
      });
      continue;
    }

    const match = matchOrgCustomer(
      org.id,
      org.adminEmails,
      snapshot,
      claimedIds(plan, snapshot, shared),
      adminEmailOrgs,
    );
    if (!match) continue;
    if ("skip" in match) {
      if (match.skip === "metadata_conflicts_subscription") {
        plan.counts.orgs_skipped_metadata_conflict += 1;
      } else if (match.skip === "customers_claimed_elsewhere") {
        plan.counts.orgs_skipped_claimed += 1;
      } else {
        plan.counts.orgs_skipped_ambiguous += 1;
      }
      plan.skippedOrgs.push({
        organization_id: org.id,
        reason: match.skip,
        stripe_customer_ids: match.ids,
      });
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

    // A customer an org was skipped over is left for the human resolving that
    // org, so no user takes it meanwhile. Orgs do not apply this to each other:
    // that would make the second of two contending orgs depend on scan order.
    const claimed = claimedIds(plan, snapshot, shared);
    for (const row of plan.skippedOrgs) row.stripe_customer_ids.forEach((id) => claimed.add(id));
    const match = matchUserCustomer(user.id, user.email, snapshot, claimed);
    if (!match) continue;
    if ("skip" in match) {
      if (match.skip === "customers_claimed_elsewhere") {
        plan.counts.users_skipped_claimed += 1;
      } else {
        plan.counts.users_skipped_ambiguous += 1;
      }
      plan.skippedUsers.push({ user_id: user.id, reason: match.skip, stripe_customer_ids: match.ids });
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
    `orgs_skipped_ambiguous=${counts.orgs_skipped_ambiguous}`,
    `orgs_skipped_claimed=${counts.orgs_skipped_claimed}`,
    `orgs_skipped_metadata_conflict=${counts.orgs_skipped_metadata_conflict}`,
    `users_scanned=${counts.users_scanned}`,
    `users_already_stored=${counts.users_already_stored}`,
    `users_matched=${counts.users_matched}`,
    `users_would_write=${counts.users_would_write}`,
    `users_skipped_ambiguous=${counts.users_skipped_ambiguous}`,
    `users_skipped_claimed=${counts.users_skipped_claimed}`,
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
  const skipped = [
    ...plan.skippedOrgs.map((row) =>
      `org_skipped organization_id=${row.organization_id} reason=${row.reason} stripe_customer_ids=${row.stripe_customer_ids.join(",")}`
    ),
    ...plan.skippedUsers.map((row) =>
      `user_skipped user_id=${row.user_id} reason=${row.reason} stripe_customer_ids=${row.stripe_customer_ids.join(",")}`
    ),
  ];
  return [formatBackfillCounts(plan.counts), ...mappings, ...skipped].join("\n");
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
  orderBy: string | string[],
  eq?: { column: string; value: string | boolean },
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client.from(table).select(columns);
    if (eq) query = query.eq(eq.column, eq.value);
    for (const column of [orderBy].flat()) query = query.order(column);
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
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
    ["organization_id", "livemode"],
  );
  const existingUserRefs = await selectRows<{ user_id: string; stripe_customer_id: string; livemode: boolean }>(
    client,
    "user_stripe_customers",
    "user_id, stripe_customer_id, livemode",
    ["user_id", "livemode"],
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
  /** Every customer whose metadata.organization_id is this org, across all pages (Stripe customer search). */
  searchByOrganizationId: (organizationId: string) => Promise<BackfillStripeCustomer[]>;
  /** null when Stripe has no such customer in this mode. */
  retrieve: (id: string) => Promise<BackfillStripeCustomer | null>;
};

export async function loadStripeCustomers(
  source: StripeCustomerSource,
  { emails, customerIds, organizationIds, livemode }: {
    emails: string[];
    customerIds: string[];
    organizationIds: string[];
    livemode: boolean;
  },
): Promise<BackfillStripeCustomer[]> {
  const queries = [...new Set(emails.flatMap((email) => [email, email.toLowerCase()]))];
  const found: BackfillStripeCustomer[] = [];
  const seen = new Set<string>();
  const add = (customer: BackfillStripeCustomer) => {
    if (seen.has(customer.id)) return;
    if (customer.livemode !== undefined && customer.livemode !== livemode) return;
    if (customer.deleted) return;
    seen.add(customer.id);
    found.push(customer);
  };
  for (const email of queries) {
    for (const customer of await source.listByEmail(email)) add(customer);
  }
  // A buyer whose email changed, or who left the org, is found only by the
  // organization_id the server wrote into the customer's metadata.
  for (const organizationId of new Set(organizationIds)) {
    for (const customer of await source.searchByOrganizationId(organizationId)) add(customer);
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

export function stripeApiSource(stripeKey: string, fetchUrl: typeof fetch = fetch): StripeCustomerSource {
  const get = (url: URL) => fetchUrl(url, { headers: { Authorization: `Bearer ${stripeKey}` } });
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
    async searchByOrganizationId(organizationId) {
      const customers: BackfillStripeCustomer[] = [];
      const value = organizationId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      let page: string | undefined;
      for (;;) {
        const url = new URL("https://api.stripe.com/v1/customers/search");
        url.searchParams.set("query", `metadata['organization_id']:'${value}'`);
        url.searchParams.set("limit", "100");
        if (page) url.searchParams.set("page", page);
        const response = await get(url);
        if (!response.ok) throw new Error(`Stripe customer search failed: ${response.status}`);
        const result = await response.json() as {
          data: StripeApiCustomer[];
          has_more?: boolean;
          next_page?: string | null;
        };
        customers.push(...result.data.map(toBackfillCustomer));
        if (!result.has_more || !result.next_page) return customers;
        page = result.next_page;
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
  const stripeCustomers = await loadStripeCustomers(stripeApiSource(stripeKey), {
    emails,
    customerIds: hub.subscriptions.map((row) => row.stripe_customer_id),
    organizationIds: hub.organizations.map((org) => org.id),
    livemode,
  });
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

  const snapshot = flags.usedFixture
    ? loadBackfillFixture(flags.fixture)
    : await loadRealSnapshot(backfillLivemode(process.env.STRIPE_SECRET_KEY));
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
