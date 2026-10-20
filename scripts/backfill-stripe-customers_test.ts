import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type BackfillStripeCustomer,
  assertApplyAllowed,
  assertFixtureNotUsedForApply,
  formatBackfillPlan,
  loadBackfillFixture,
  loadHubSnapshot,
  loadStripeCustomers,
  planStripeCustomerBackfill,
} from "./backfill-stripe-customers.ts";
import { isLiveStripeKey, stripeKeyMode } from "../supabase/functions/_shared/stripe-customer.ts";

const fixture = loadBackfillFixture();

Deno.test("dry-run fixture matches one org, one user, and does not share a customer", () => {
  const plan = planStripeCustomerBackfill(fixture, true);
  assertEquals(plan.counts.orgs_scanned, 2);
  assertEquals(plan.counts.orgs_matched, 2);
  assertEquals(plan.counts.orgs_would_write, 2);
  assertEquals(plan.counts.orgs_skipped_shared, 0);
  assertEquals(plan.counts.users_matched, 1);
  assertEquals(plan.counts.users_would_write, 1);
  assertEquals(plan.orgWrites[0].stripe_customer_id, "cus_test_org_a");
  assertEquals(plan.orgWrites[1].stripe_customer_id, "cus_test_org_b");
  assertEquals(plan.userWrites[0].stripe_customer_id, "cus_test_user_a");
  assertEquals(new Set(plan.orgWrites.map((row) => row.stripe_customer_id)).size, 2);
  assertEquals(plan.orgWrites[0].livemode, false);
  assertEquals(plan.orgWrites[0].email_masked, "b***@example.test");
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("buyer@example.test"), false);
  assertEquals(printed.includes("b***@example.test"), true);
});

Deno.test("user match skips Stripe customers that already have organization_id", () => {
  const plan = planStripeCustomerBackfill({
    livemode: false,
    organizations: [],
    users: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "buyer@example.test" }],
    subscriptions: [],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers: [
      {
        id: "cus_test_org_a",
        email: "buyer@example.test",
        metadata: {
          organization_id: "11111111-1111-4111-8111-111111111111",
          user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      },
      {
        id: "cus_test_user_a",
        email: "buyer@example.test",
        metadata: { user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      },
    ],
  }, true);
  assertEquals(plan.userWrites.length, 1);
  assertEquals(plan.userWrites[0].stripe_customer_id, "cus_test_user_a");
});

Deno.test("--apply refuses without a test key or --live", () => {
  assertThrows(
    () => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_live_example" }),
    Error,
    "test key",
  );
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "sk_test_example" });
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_test_example" });
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "" }), Error, "test key");
  assertApplyAllowed({ apply: true, live: true, stripeSecretKey: "sk_live_example" });
  assertApplyAllowed({ apply: false, live: false, stripeSecretKey: "" });
});

Deno.test("--apply cannot use a fixture", () => {
  assertThrows(
    () => assertFixtureNotUsedForApply(true, true),
    Error,
    "fixtures are for tests only",
  );
  assertFixtureNotUsedForApply(false, true);
  assertFixtureNotUsedForApply(true, false);
});

const ORG = "11111111-1111-4111-8111-111111111111";

function planWithSubscription(stripeCustomers: BackfillStripeCustomer[]) {
  return planStripeCustomerBackfill({
    livemode: false,
    organizations: [{ id: ORG, adminEmails: [] }],
    users: [],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_sub" }],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers,
  }, true);
}

Deno.test("a subscription customer is used only when Stripe returns it in this mode", () => {
  assertEquals(planWithSubscription([{ id: "cus_sub" }]).orgWrites.map((row) => row.stripe_customer_id), ["cus_sub"]);
  assertEquals(planWithSubscription([]).orgWrites.length, 0);
  assertEquals(planWithSubscription([{ id: "cus_sub", deleted: true }]).orgWrites.length, 0);
});

type Row = Record<string, unknown>;

// Mimics a PostgREST client that caps each response at `cap` rows.
function fakeHub(tables: Record<string, Row[]>, cap = 1000) {
  const reads: string[] = [];
  const orders: Record<string, string[]> = {};
  const client = {
    from(table: string) {
      return {
        select(_columns: string) {
          let rows = tables[table];
          let range: [number, number] = [0, cap - 1];
          const builder = {
            eq(column: string, value: string | boolean) {
              rows = rows?.filter((row) => row[column] === value);
              return builder;
            },
            order(column: string) {
              (orders[table] ??= []).push(column);
              return builder;
            },
            range(from: number, to: number) {
              range = [from, Math.min(to, from + cap - 1)];
              return builder;
            },
            then<T>(resolve: (value: { data: unknown; error: { message: string } | null }) => T) {
              reads.push(table);
              const result = rows
                ? { data: rows.slice(range[0], range[1] + 1), error: null }
                : { data: null, error: { message: `relation "public.${table}" does not exist` } };
              return Promise.resolve(result).then(resolve);
            },
          };
          return builder;
        },
      };
    },
  };
  return { client, reads, orders };
}

const emptyHub = (): Record<string, Row[]> => ({
  orders: [],
  org_billing_profiles: [],
  subscriptions: [],
  organization_members: [],
  profiles: [],
  training_leads: [],
  academy_entitlements: [],
  org_stripe_customers: [],
  user_stripe_customers: [],
});

Deno.test("loadHubSnapshot pages past the PostgREST row cap", async () => {
  const tables = emptyHub();
  tables.profiles = Array.from({ length: 2500 }, (_, i) => ({ user_id: `u${i}`, email: `u${i}@example.test` }));
  tables.academy_entitlements = [{ user_id: "u2400", subject_type: "user" }];
  tables.organization_members = [];
  const { client } = fakeHub(tables);

  const snapshot = await loadHubSnapshot(client as never, false);

  assertEquals(snapshot.users.map((user) => user.id), ["u2400"]);
  assertEquals(snapshot.users[0].email, "u2400@example.test");
});

Deno.test("loadHubSnapshot pages the ref tables by owner column, then livemode", async () => {
  const { client, orders } = fakeHub(emptyHub());
  await loadHubSnapshot(client as never, false);
  assertEquals(orders.org_stripe_customers, ["organization_id", "livemode"]);
  assertEquals(orders.user_stripe_customers, ["user_id", "livemode"]);
});

Deno.test("loadHubSnapshot reads org admins, owners and subscriptions and fails on a missing table", async () => {
  const tables = emptyHub();
  tables.organization_members = [
    { organization_id: ORG, user_id: "admin", role: "admin" },
    { organization_id: ORG, user_id: "member", role: "member" },
  ];
  tables.profiles = [
    { user_id: "admin", email: "admin@example.test" },
    { user_id: "member", email: "member@example.test" },
  ];
  tables.subscriptions = [{ organization_id: ORG, stripe_customer_id: "cus_sub" }];
  const snapshot = await loadHubSnapshot(fakeHub(tables).client as never, false);
  assertEquals(snapshot.organizations, [{ id: ORG, adminEmails: ["admin@example.test"] }]);

  const missing = emptyHub();
  delete missing.academy_entitlements;
  await assertRejects(() => loadHubSnapshot(fakeHub(missing).client as never, false), Error, "does not exist");
});

Deno.test("loadStripeCustomers keeps only this mode, fetches subscription customers by id and queries both email cases", async () => {
  const asked: string[] = [];
  const retrieved: string[] = [];
  const customers = await loadStripeCustomers(
    {
      listByEmail: (email) => {
        asked.push(email);
        return Promise.resolve(email === "Buyer@Example.test"
          ? [{ id: "cus_a", livemode: false }, { id: "cus_live", livemode: true }]
          : []);
      },
      retrieve: (id) => {
        retrieved.push(id);
        return Promise.resolve(id === "cus_gone" ? null : { id, livemode: false });
      },
    },
    ["Buyer@Example.test"],
    ["cus_a", "cus_sub", "cus_gone"],
    false,
  );

  assertEquals(asked, ["Buyer@Example.test", "buyer@example.test"]);
  assertEquals(retrieved, ["cus_sub", "cus_gone"]);
  assertEquals(customers.map((customer) => customer.id), ["cus_a", "cus_sub"]);
});

Deno.test("restricted live keys count as live", () => {
  assertEquals(isLiveStripeKey("rk_live_example"), true);
  assertEquals(isLiveStripeKey("sk_test_example"), false);
});

const ORG_2 = "22222222-2222-4222-8222-222222222222";
const ORG_3 = "33333333-3333-4333-8333-333333333333";

function planOrgs(
  organizations: Array<{ id: string; adminEmails: string[] }>,
  subscriptions: Array<{ organization_id: string; stripe_customer_id: string }>,
  stripeCustomers: BackfillStripeCustomer[],
) {
  return planStripeCustomerBackfill({
    livemode: false,
    organizations,
    users: [],
    subscriptions,
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers,
  }, true);
}

Deno.test("orgs that share a subscription customer are all skipped and the customer id is reported", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }, { id: ORG_3, adminEmails: [] }],
    [
      { organization_id: ORG, stripe_customer_id: "cus_shared" },
      { organization_id: ORG_2, stripe_customer_id: "cus_shared" },
      { organization_id: ORG_3, stripe_customer_id: "cus_own" },
    ],
    [{ id: "cus_shared" }, { id: "cus_own" }],
  );
  assertEquals(plan.orgWrites.map((row) => row.organization_id), [ORG_3]);
  assertEquals(plan.counts.orgs_skipped_shared, 2);
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("cus_shared"), true);
  assertEquals(printed.includes(ORG) && printed.includes(ORG_2), true);
});

Deno.test("a shared subscription customer is not handed to any org by metadata either", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: [] }, { id: ORG_3, adminEmails: [] }],
    [
      { organization_id: ORG, stripe_customer_id: "cus_shared" },
      { organization_id: ORG_2, stripe_customer_id: "cus_shared" },
    ],
    [{ id: "cus_shared", metadata: { organization_id: ORG_3 } }],
  );
  assertEquals(plan.orgWrites.length, 0);
});

Deno.test("a subscription customer whose metadata names another org is refused", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: [] }],
    [{ organization_id: ORG, stripe_customer_id: "cus_sub" }],
    [{ id: "cus_sub", metadata: { organization_id: ORG_2 } }],
  );
  assertEquals(plan.orgWrites.length, 0);
});

Deno.test("metadata naming the org is trusted when its email is no longer an admin's", () => {
  const plan = planOrgs(
    [{ id: ORG, adminEmails: ["current@example.test"] }],
    [],
    [{ id: "cus_old", email: "former@example.test", metadata: { organization_id: ORG } }],
  );
  assertEquals(plan.orgWrites.map((row) => row.stripe_customer_id), ["cus_old"]);
});

Deno.test("several metadata customers are tied-broken by admin email, else the org is skipped and reported", () => {
  const customers: BackfillStripeCustomer[] = [
    { id: "cus_a", email: "former@example.test", metadata: { organization_id: ORG } },
    { id: "cus_b", email: "current@example.test", metadata: { organization_id: ORG } },
  ];
  const broken = planOrgs([{ id: ORG, adminEmails: ["current@example.test"] }], [], customers);
  assertEquals(broken.orgWrites.map((row) => row.stripe_customer_id), ["cus_b"]);

  const tied = planOrgs([{ id: ORG, adminEmails: ["nobody@example.test"] }], [], customers);
  assertEquals(tied.orgWrites.length, 0);
  assertEquals(tied.counts.orgs_skipped_shared, 1);
  const printed = formatBackfillPlan(tied);
  assertEquals(printed.includes("cus_a") && printed.includes("cus_b"), true);
});

Deno.test("a subscription customer is reserved for its org even when its metadata names another org", () => {
  const ORG_B = ORG_2;
  const plan = planOrgs(
    [{ id: ORG, adminEmails: ["x@example.test"] }, { id: ORG_B, adminEmails: ["x@example.test"] }],
    [{ organization_id: ORG, stripe_customer_id: "cus_1" }],
    [{ id: "cus_1", email: "x@example.test", metadata: { organization_id: ORG_B } }],
  );
  assertEquals(plan.orgWrites.length, 0);
  assertEquals(plan.skippedOrgs, [{
    organization_id: ORG,
    reason: "metadata_conflicts_subscription",
    stripe_customer_ids: ["cus_1"],
  }]);
  assertEquals(plan.counts.orgs_skipped_metadata_conflict, 1);
  const printed = formatBackfillPlan(plan);
  assertEquals(printed.includes("orgs_skipped_metadata_conflict=1"), true);
  assertEquals(printed.includes(`org_skipped organization_id=${ORG} reason=metadata_conflicts_subscription`), true);
});

Deno.test("a subscription customer is not given to another org by email, nor to a user", () => {
  const snapshot = {
    livemode: false,
    organizations: [{ id: ORG, adminEmails: [] }, { id: ORG_2, adminEmails: ["x@example.test"] }],
    users: [{ id: "u1", email: "x@example.test" }],
    subscriptions: [{ organization_id: ORG, stripe_customer_id: "cus_1" }],
    existingOrgRefs: [],
    existingUserRefs: [],
    stripeCustomers: [{ id: "cus_1", email: "x@example.test" }],
  };
  const plan = planStripeCustomerBackfill(snapshot, true);
  assertEquals(plan.orgWrites.map((row) => [row.organization_id, row.stripe_customer_id]), [[ORG, "cus_1"]]);
  assertEquals(plan.userWrites.length, 0);
});

Deno.test("--apply without --live requires an explicit test key and refuses unknown prefixes", () => {
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "whsec_x" }));
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "pk_test_x" }));
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "" }));
  assertThrows(() => assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_live_x" }));
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "sk_test_x" });
  assertApplyAllowed({ apply: true, live: false, stripeSecretKey: "rk_test_x" });
  assertApplyAllowed({ apply: true, live: true, stripeSecretKey: "rk_live_x" });
  assertApplyAllowed({ apply: false, live: false, stripeSecretKey: "whsec_x" });
});

Deno.test("stripeKeyMode throws on an unknown prefix", () => {
  assertEquals(stripeKeyMode("sk_live_x"), "live");
  assertEquals(stripeKeyMode("rk_test_x"), "test");
  assertThrows(() => stripeKeyMode("whsec_x"));
});
